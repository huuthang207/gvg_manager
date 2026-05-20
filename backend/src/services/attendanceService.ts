import type { AttendanceChoice } from '@prisma/client';
import { prisma } from '../db.js';
import { serializeAttendanceSession } from '../serializers/attendanceSerializer.js';
import { renderAttendancePublicContent } from './attendanceRenderService.js';
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

async function findGuildByDiscordId(discordGuildId: string) {
  return prisma.guild.findUnique({ where: { discordGuildId } });
}

function isDiscordSnowflake(value: string) {
  return /^\d{17,20}$/.test(value);
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

  return {
    config: config ? {
      id: config.id,
      discordChannelId: config.discordChannelId,
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

  publishGuildAppStateChanged({ guildId: session.guildId, reason: 'attendance_updated' });

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
      lastRenderedAt: new Date(),
    },
    include: attendanceSessionInclude,
  });

  publishGuildAppStateChanged({ guildId: guild.id, reason: 'attendance_updated' });

  return { status: 200 as const, body: { session: serializeAttendanceSession(updatedSession) } };
}

export async function castAttendanceVote(input: {
  discordGuildId: string;
  discordUserId: string;
  sessionId: string;
  choice: AttendanceChoice;
}) {
  const guild = await findGuildByDiscordId(input.discordGuildId);

  if (!guild) {
    return { status: 404 as const, body: { error: 'Server Discord chưa được import vào hệ thống.' } };
  }

  const session = await prisma.attendanceSession.findFirst({
    where: { id: input.sessionId, guildId: guild.id, status: 'OPEN' },
  });

  if (!session) {
    return { status: 404 as const, body: { error: 'Phiên điểm danh không tồn tại hoặc đã đóng.' } };
  }

  const member = await prisma.member.findFirst({
    where: {
      guildId: guild.id,
      discordUserId: input.discordUserId,
    },
  });

  if (!member) {
    return { status: 404 as const, body: { error: 'Thành viên chưa được import hoặc đồng bộ vào hệ thống.' } };
  }

  if (!member.active) {
    return { status: 403 as const, body: { error: 'Thành viên không hoạt động không thể điểm danh.' } };
  }

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

  const updatedSession = await prisma.attendanceSession.update({
    where: { id: session.id },
    data: { lastVoteAt: new Date() },
    include: attendanceSessionInclude,
  });

  publishGuildAppStateChanged({ guildId: guild.id, reason: 'attendance_updated' });

  return { status: 200 as const, body: { session: serializeAttendanceSession(updatedSession) } };
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

  const updatedSession = await prisma.attendanceSession.update({
    where: { id: session.id },
    data: { lastRenderedAt: new Date() },
    include: attendanceSessionInclude,
  });

  publishGuildAppStateChanged({ guildId: guild.id, reason: 'attendance_updated' });

  return { status: 200 as const, body: { session: serializeAttendanceSession(updatedSession) } };
}

export async function listAttendanceSessions(discordGuildId: string, take = 20) {
  const guild = await findGuildByDiscordId(discordGuildId);

  if (!guild) {
    return { status: 404 as const, body: { error: 'Server Discord chưa được import vào hệ thống.' } };
  }

  const sessions = await prisma.attendanceSession.findMany({
    where: { guildId: guild.id },
    include: attendanceSessionInclude,
    orderBy: { openedAt: 'desc' },
    take: Math.min(Math.max(take, 1), 50),
  });

  return { status: 200 as const, body: { sessions: sessions.map(serializeAttendanceSession) } };
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
