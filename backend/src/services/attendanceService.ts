import type { AttendanceChoice } from '@prisma/client';
import { prisma } from '../db.js';
import { serializeAttendanceSession } from '../serializers/attendanceSerializer.js';
import { renderAttendancePublicContent } from './attendanceRenderService.js';
import { fetchDiscordChannelName } from './discordClientService.js';
import { publishGuildAppStateChanged } from './realtimeGateway.js';

const attendanceSessionInclude = {
  votes: {
    include: {
      member: true,
    },
    orderBy: {
      updatedAt: 'asc' as const,
    },
  },
};

const attendanceVoteDebugEnabled = process.env.DISCORD_ATTENDANCE_DEBUG === 'true' || process.env.DISCORD_REALTIME_DEBUG === 'true';

function logAttendanceVoteDebug(message: string, details?: Record<string, unknown>) {
  if (!attendanceVoteDebugEnabled) return;
  if (details) {
    console.log(`[Attendance Vote] ${message}`, details);
    return;
  }
  console.log(`[Attendance Vote] ${message}`);
}

export type AttendanceRefreshTarget = {
  guildId: string;
  sessionId: string;
  discordChannelId: string | null;
  discordMessageId: string | null;
};

async function findGuildByDiscordId(discordGuildId: string) {
  return prisma.guild.findUnique({ where: { discordGuildId } });
}

function isDiscordSnowflake(value: string) {
  return /^\d{17,20}$/.test(value);
}

async function findAttendanceVoteSession(input: {
  guildId: string;
  sessionId: string;
  discordMessageId?: string | null;
}) {
  return prisma.attendanceSession.findFirst({
    where: {
      guildId: input.guildId,
      status: 'OPEN',
      OR: [
        { id: input.sessionId },
        ...(input.discordMessageId ? [{ discordMessageId: input.discordMessageId }] : []),
      ],
    },
    select: {
      id: true,
      guildId: true,
      discordChannelId: true,
      discordMessageId: true,
    },
  });
}

async function resolveAttendanceVoteContext(input: {
  discordGuildId: string;
  discordUserId: string;
  sessionId: string;
  discordMessageId?: string | null;
}) {
  const startedAt = Date.now();
  const guild = await findGuildByDiscordId(input.discordGuildId);

  if (!guild) {
    return { status: 404 as const, body: { error: 'Server Discord chưa được import vào hệ thống.' } };
  }

  const session = await findAttendanceVoteSession({
    guildId: guild.id,
    sessionId: input.sessionId,
    discordMessageId: input.discordMessageId,
  });

  if (!session) {
    return { status: 404 as const, body: { error: 'Phiên điểm danh không tồn tại hoặc đã đóng.' } };
  }

  const member = await prisma.member.findUnique({
    where: {
      guildId_discordUserId: {
        guildId: guild.id,
        discordUserId: input.discordUserId,
      },
    },
    select: {
      id: true,
      active: true,
      ingameName: true,
      displayName: true,
      classType: true,
    },
  });

  if (!member) {
    return { status: 404 as const, body: { error: 'Thành viên chưa được import hoặc đồng bộ vào hệ thống.' } };
  }

  if (!member.active) {
    return { status: 403 as const, body: { error: 'Thành viên không hoạt động không thể điểm danh.' } };
  }

  logAttendanceVoteDebug('Resolved attendance vote context', {
    guildId: guild.id,
    sessionId: session.id,
    discordUserId: input.discordUserId,
    elapsedMs: Date.now() - startedAt,
  });

  return {
    status: 200 as const,
    body: {
      guild,
      session,
      member,
    },
  };
}

export async function setAttendanceChannel(discordGuildId: string, discordChannelId: string) {
  const guild = await findGuildByDiscordId(discordGuildId);

  if (!guild) {
    return { status: 404 as const, body: { error: 'Server Discord chưa được import vào hệ thống.' } };
  }

  if (!isDiscordSnowflake(discordChannelId)) {
    return { status: 400 as const, body: { error: 'Discord channel id không hợp lệ.' } };
  }

  const config = await prisma.attendanceChannelConfig.upsert({
    where: { guildId: guild.id },
    update: { discordChannelId },
    create: { guildId: guild.id, discordChannelId },
  });

  publishGuildAppStateChanged({ guildId: guild.id, reason: 'attendance_updated' });

  return { status: 200 as const, body: { success: true, config } };
}

export async function getAttendanceChannelConfig(discordGuildId: string) {
  const guild = await findGuildByDiscordId(discordGuildId);

  if (!guild) {
    return { status: 404 as const, body: { error: 'Server Discord chưa được import vào hệ thống.' } };
  }

  const config = await prisma.attendanceChannelConfig.findUnique({ where: { guildId: guild.id } });
  return { status: 200 as const, body: { config } };
}

export async function getActiveAttendanceSession(discordGuildId: string) {
  const guild = await findGuildByDiscordId(discordGuildId);

  if (!guild) {
    return { status: 404 as const, body: { error: 'Server Discord chưa được import vào hệ thống.' } };
  }

  const session = await prisma.attendanceSession.findFirst({
    where: { guildId: guild.id, status: 'OPEN' },
    include: attendanceSessionInclude,
    orderBy: { openedAt: 'desc' },
  });

  return { status: 200 as const, body: { session: session ? serializeAttendanceSession(session) : null } };
}

export async function getAttendanceStateForGuild(guildId: string) {
  const [config, activeSession, recentSessions] = await Promise.all([
    prisma.attendanceChannelConfig.findUnique({ where: { guildId } }),
    prisma.attendanceSession.findFirst({
      where: { guildId, status: 'OPEN' },
      include: attendanceSessionInclude,
      orderBy: { openedAt: 'desc' },
    }),
    prisma.attendanceSession.findMany({
      where: { guildId },
      include: attendanceSessionInclude,
      orderBy: { openedAt: 'desc' },
      take: 10,
    }),
  ]);

  const discordChannelName = await fetchDiscordChannelName(config?.discordChannelId ?? null);

  return {
    config: config ? {
      id: config.id,
      discordChannelId: config.discordChannelId,
      discordChannelName,
      createdAt: config.createdAt.toISOString(),
      updatedAt: config.updatedAt.toISOString(),
    } : null,
    activeSession: activeSession ? serializeAttendanceSession(activeSession) : null,
    recentSessions: recentSessions.map(serializeAttendanceSession),
  };
}

export async function openAttendanceSession(input: {
  discordGuildId: string;
  openedByDiscordUserId: string;
  headerText?: string | null;
}) {
  const guild = await findGuildByDiscordId(input.discordGuildId);

  if (!guild) {
    return { status: 404 as const, body: { error: 'Server Discord chưa được import vào hệ thống.' } };
  }

  const config = await prisma.attendanceChannelConfig.findUnique({ where: { guildId: guild.id } });

  if (!config) {
    return { status: 400 as const, body: { error: 'Chưa cấu hình kênh điểm danh. Hãy dùng /setchannel trước.' } };
  }

  const existingOpenSession = await prisma.attendanceSession.findFirst({
    where: { guildId: guild.id, status: 'OPEN' },
  });

  if (existingOpenSession) {
    return { status: 409 as const, body: { error: 'Đang có một phiên điểm danh mở.' } };
  }

  const session = await prisma.attendanceSession.create({
    data: {
      guildId: guild.id,
      headerText: input.headerText?.trim() || null,
      discordChannelId: config.discordChannelId,
      openedByDiscordUserId: input.openedByDiscordUserId,
    },
    include: attendanceSessionInclude,
  });

  publishGuildAppStateChanged({ guildId: guild.id, reason: 'attendance_updated' });

  return { status: 201 as const, body: { session: serializeAttendanceSession(session) } };
}

export async function attachAttendanceMessage(input: {
  sessionId: string;
  discordMessageId: string;
}) {
  const session = await prisma.attendanceSession.update({
    where: { id: input.sessionId },
    data: {
      discordMessageId: input.discordMessageId,
      lastRenderedAt: new Date(),
    },
    include: attendanceSessionInclude,
  });

  return { status: 200 as const, body: { session: serializeAttendanceSession(session) } };
}

export async function closeAttendanceSession(input: {
  discordGuildId: string;
  closedByDiscordUserId: string;
}) {
  const guild = await findGuildByDiscordId(input.discordGuildId);

  if (!guild) {
    return { status: 404 as const, body: { error: 'Server Discord chưa được import vào hệ thống.' } };
  }

  const session = await prisma.attendanceSession.findFirst({
    where: { guildId: guild.id, status: 'OPEN' },
    orderBy: { openedAt: 'desc' },
  });

  if (!session) {
    return { status: 404 as const, body: { error: 'Không có phiên điểm danh nào đang mở.' } };
  }

  const updatedSession = await prisma.attendanceSession.update({
    where: { id: session.id },
    data: {
      status: 'CLOSED',
      closedAt: new Date(),
      closedByDiscordUserId: input.closedByDiscordUserId,
    },
    include: attendanceSessionInclude,
  });

  publishGuildAppStateChanged({ guildId: guild.id, reason: 'attendance_updated' });

  return { status: 200 as const, body: { session: serializeAttendanceSession(updatedSession) } };
}

export async function persistAttendanceVote(input: {
  discordGuildId: string;
  discordUserId: string;
  sessionId: string;
  choice: AttendanceChoice;
  discordMessageId?: string | null;
}) {
  const startedAt = Date.now();
  const contextResult = await resolveAttendanceVoteContext(input);
  if (contextResult.status !== 200) return contextResult;

  const { guild, session, member } = contextResult.body;
  const voteStartedAt = Date.now();

  await prisma.attendanceVote.upsert({
    where: {
      sessionId_memberId: {
        sessionId: session.id,
        memberId: member.id,
      },
    },
    update: {
      choice: input.choice,
      snapshotIngameName: member.ingameName || member.displayName,
      snapshotClassType: member.classType,
    },
    create: {
      sessionId: session.id,
      memberId: member.id,
      choice: input.choice,
      snapshotIngameName: member.ingameName || member.displayName,
      snapshotClassType: member.classType,
    },
  });

  const refreshTarget = await prisma.attendanceSession.update({
    where: { id: session.id },
    data: { lastVoteAt: new Date() },
    select: {
      id: true,
      guildId: true,
      discordChannelId: true,
      discordMessageId: true,
    },
  });

  publishGuildAppStateChanged({ guildId: guild.id, reason: 'attendance_updated' });

  logAttendanceVoteDebug('Persisted attendance vote', {
    guildId: guild.id,
    sessionId: session.id,
    discordUserId: input.discordUserId,
    choice: input.choice,
    voteMs: Date.now() - voteStartedAt,
    totalMs: Date.now() - startedAt,
  });

  return {
    status: 200 as const,
    body: {
      refreshTarget: {
        guildId: refreshTarget.guildId,
        sessionId: refreshTarget.id,
        discordChannelId: refreshTarget.discordChannelId,
        discordMessageId: refreshTarget.discordMessageId,
      } satisfies AttendanceRefreshTarget,
    },
  };
}

export async function castAttendanceVote(input: {
  discordGuildId: string;
  discordUserId: string;
  sessionId: string;
  choice: AttendanceChoice;
  discordMessageId?: string | null;
}) {
  const persistResult = await persistAttendanceVote(input);
  if (persistResult.status !== 200) return persistResult;

  const session = await prisma.attendanceSession.findUnique({
    where: { id: persistResult.body.refreshTarget.sessionId },
    include: attendanceSessionInclude,
  });

  if (!session) {
    return { status: 404 as const, body: { error: 'Phiên điểm danh không tồn tại hoặc đã đóng.' } };
  }

  return { status: 200 as const, body: { session: serializeAttendanceSession(session) } };
}

export async function refreshAttendanceSession(discordGuildId: string) {
  const guild = await findGuildByDiscordId(discordGuildId);

  if (!guild) {
    return { status: 404 as const, body: { error: 'Server Discord chưa được import vào hệ thống.' } };
  }

  const session = await prisma.attendanceSession.findFirst({
    where: { guildId: guild.id, status: 'OPEN' },
    include: attendanceSessionInclude,
    orderBy: { openedAt: 'desc' },
  });

  if (!session) {
    return { status: 404 as const, body: { error: 'Không có phiên điểm danh nào đang mở.' } };
  }

  return { status: 200 as const, body: { session: serializeAttendanceSession(session) } };
}

export async function listAttendanceSessions(discordGuildId: string, take = 20, offset = 0) {
  const guild = await findGuildByDiscordId(discordGuildId);

  if (!guild) {
    return { status: 404 as const, body: { error: 'Server Discord chưa được import vào hệ thống.' } };
  }

  const limit = Math.min(Math.max(take, 1), 50);
  const sessions = await prisma.attendanceSession.findMany({
    where: { guildId: guild.id },
    include: attendanceSessionInclude,
    orderBy: { openedAt: 'desc' },
    skip: Math.max(offset, 0),
    take: limit + 1,
  });
  const page = sessions.slice(0, limit);

  return {
    status: 200 as const,
    body: {
      sessions: page.map(serializeAttendanceSession),
      hasMore: sessions.length > limit,
      nextOffset: offset + page.length,
    },
  };
}

export async function getAttendanceSessionById(discordGuildId: string, sessionId: string) {
  const guild = await findGuildByDiscordId(discordGuildId);

  if (!guild) {
    return { status: 404 as const, body: { error: 'Server Discord chưa được import vào hệ thống.' } };
  }

  const session = await prisma.attendanceSession.findFirst({
    where: { id: sessionId, guildId: guild.id },
    include: attendanceSessionInclude,
  });

  if (!session) {
    return { status: 404 as const, body: { error: 'Không tìm thấy phiên điểm danh.' } };
  }

  return { status: 200 as const, body: { session: serializeAttendanceSession(session) } };
}

export async function deleteAttendanceSession(discordGuildId: string, sessionId: string) {
  const guild = await findGuildByDiscordId(discordGuildId);

  if (!guild) {
    return { status: 404 as const, body: { error: 'Server Discord chưa được import vào hệ thống.' } };
  }

  const session = await prisma.attendanceSession.findFirst({
    where: { id: sessionId, guildId: guild.id },
  });

  if (!session) {
    return { status: 404 as const, body: { error: 'Không tìm thấy phiên điểm danh.' } };
  }

  await prisma.attendanceSession.delete({ where: { id: session.id } });
  publishGuildAppStateChanged({ guildId: guild.id, reason: 'attendance_updated' });

  return { status: 200 as const, body: { success: true } };
}

export async function markAttendanceRendered(sessionId: string) {
  await prisma.attendanceSession.update({
    where: { id: sessionId },
    data: { lastRenderedAt: new Date() },
  });
}

export async function getAttendanceRenderPayload(sessionId: string) {
  const session = await prisma.attendanceSession.findUnique({
    where: { id: sessionId },
    include: attendanceSessionInclude,
  });

  if (!session) {
    return { status: 404 as const, body: { error: 'Không tìm thấy phiên điểm danh.' } };
  }

  return {
    status: 200 as const,
    body: {
      session: serializeAttendanceSession(session),
      content: renderAttendancePublicContent(session, session.votes),
    },
  };
}
