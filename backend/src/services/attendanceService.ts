import type { AttendanceChoice, AttendanceType } from '@prisma/client';
import { prisma } from '../db.js';
import { serializeAttendanceSession } from '../serializers/attendanceSerializer.js';
import { renderAttendancePublicContent, type AttendanceRenderOptions } from './attendanceRenderService.js';
import { fetchDiscordChannelName } from './discordClientService.js';
import { publishGuildAppStateChanged } from './realtimeGateway.js';

const attendanceSessionInclude = {
  votes: {
    include: { member: true },
    orderBy: { updatedAt: 'asc' as const },
  },
};

export type AttendanceRefreshTarget = {
  guildId: string;
  sessionId: string;
  type: AttendanceType;
  discordChannelId: string | null;
  discordMessageId: string | null;
};

export function normalizeAttendanceType(value: unknown): AttendanceType {
  return value === 'SCRIM' ? 'SCRIM' : 'GVG';
}

export function getAttendanceTypeLabel(type: AttendanceType) {
  return type === 'SCRIM' ? 'Scrim' : 'Bang Chiến';
}

async function findGuildByDiscordId(discordGuildId: string) {
  return prisma.guild.findUnique({ where: { discordGuildId } });
}

function isDiscordSnowflake(value: string) {
  return /^\d{17,20}$/.test(value);
}

async function getTypedAttendanceState(guildId: string, type: AttendanceType) {
  const [config, activeSession, recentSessions] = await Promise.all([
    prisma.attendanceChannelConfig.findUnique({ where: { guildId_type: { guildId, type } } }),
    prisma.attendanceSession.findFirst({
      where: { guildId, type, status: 'OPEN' },
      include: attendanceSessionInclude,
      orderBy: { openedAt: 'desc' },
    }),
    prisma.attendanceSession.findMany({
      where: { guildId, type },
      include: attendanceSessionInclude,
      orderBy: { openedAt: 'desc' },
      take: 10,
    }),
  ]);
  const discordChannelName = await fetchDiscordChannelName(config?.discordChannelId ?? null);

  return {
    type,
    config: config ? {
      id: config.id,
      type: config.type,
      discordChannelId: config.discordChannelId,
      discordChannelName,
      createdAt: config.createdAt.toISOString(),
      updatedAt: config.updatedAt.toISOString(),
    } : null,
    activeSession: activeSession ? serializeAttendanceSession(activeSession) : null,
    recentSessions: recentSessions.map(serializeAttendanceSession),
  };
}

export async function setAttendanceChannel(discordGuildId: string, discordChannelId: string, type: AttendanceType = 'GVG') {
  const guild = await findGuildByDiscordId(discordGuildId);
  if (!guild) return { status: 404 as const, body: { error: 'Server Discord chưa được import vào hệ thống.' } };
  if (!isDiscordSnowflake(discordChannelId)) return { status: 400 as const, body: { error: 'Discord channel id không hợp lệ.' } };

  const config = await prisma.attendanceChannelConfig.upsert({
    where: { guildId_type: { guildId: guild.id, type } },
    update: { discordChannelId },
    create: { guildId: guild.id, type, discordChannelId },
  });
  publishGuildAppStateChanged({ guildId: guild.id, reason: 'attendance_updated' });
  return { status: 200 as const, body: { success: true, config } };
}

export async function getAttendanceChannelConfig(discordGuildId: string, type: AttendanceType = 'GVG') {
  const guild = await findGuildByDiscordId(discordGuildId);
  if (!guild) return { status: 404 as const, body: { error: 'Server Discord chưa được import vào hệ thống.' } };
  const config = await prisma.attendanceChannelConfig.findUnique({ where: { guildId_type: { guildId: guild.id, type } } });
  return { status: 200 as const, body: { config } };
}

export async function getActiveAttendanceSession(discordGuildId: string, type: AttendanceType = 'GVG') {
  const guild = await findGuildByDiscordId(discordGuildId);
  if (!guild) return { status: 404 as const, body: { error: 'Server Discord chưa được import vào hệ thống.' } };
  const session = await prisma.attendanceSession.findFirst({
    where: { guildId: guild.id, type, status: 'OPEN' },
    include: attendanceSessionInclude,
    orderBy: { openedAt: 'desc' },
  });
  return { status: 200 as const, body: { session: session ? serializeAttendanceSession(session) : null } };
}

export async function getAttendanceStateForGuild(guildId: string) {
  const [gvg, scrim] = await Promise.all([
    getTypedAttendanceState(guildId, 'GVG'),
    getTypedAttendanceState(guildId, 'SCRIM'),
  ]);
  return { gvg, scrim };
}

export async function openAttendanceSession(input: {
  discordGuildId: string;
  openedByDiscordUserId: string;
  headerText?: string | null;
  type?: AttendanceType;
}) {
  const type = input.type ?? 'GVG';
  const guild = await findGuildByDiscordId(input.discordGuildId);
  if (!guild) return { status: 404 as const, body: { error: 'Server Discord chưa được import vào hệ thống.' } };
  const config = await prisma.attendanceChannelConfig.findUnique({ where: { guildId_type: { guildId: guild.id, type } } });
  if (!config) return { status: 400 as const, body: { error: `Chưa cấu hình kênh điểm danh ${getAttendanceTypeLabel(type)}.` } };
  const existingOpenSession = await prisma.attendanceSession.findFirst({ where: { guildId: guild.id, type, status: 'OPEN' } });
  if (existingOpenSession) return { status: 409 as const, body: { error: `Đang có một phiên điểm danh mở (${getAttendanceTypeLabel(type)}).` } };

  const session = await prisma.attendanceSession.create({
    data: { guildId: guild.id, type, headerText: input.headerText?.trim() || null, discordChannelId: config.discordChannelId, openedByDiscordUserId: input.openedByDiscordUserId },
    include: attendanceSessionInclude,
  });
  publishGuildAppStateChanged({ guildId: guild.id, reason: 'attendance_updated' });
  return { status: 201 as const, body: { session: serializeAttendanceSession(session) } };
}

export async function attachAttendanceMessage(input: { sessionId: string; discordMessageId: string }) {
  const session = await prisma.attendanceSession.update({
    where: { id: input.sessionId },
    data: { discordMessageId: input.discordMessageId, lastRenderedAt: new Date() },
    include: attendanceSessionInclude,
  });
  return { status: 200 as const, body: { session: serializeAttendanceSession(session) } };
}

export async function closeAttendanceSession(input: { discordGuildId: string; closedByDiscordUserId: string; type?: AttendanceType }) {
  const type = input.type ?? 'GVG';
  const guild = await findGuildByDiscordId(input.discordGuildId);
  if (!guild) return { status: 404 as const, body: { error: 'Server Discord chưa được import vào hệ thống.' } };
  const session = await prisma.attendanceSession.findFirst({ where: { guildId: guild.id, type, status: 'OPEN' }, orderBy: { openedAt: 'desc' } });
  if (!session) return { status: 404 as const, body: { error: `Không có phiên điểm danh nào đang mở (${getAttendanceTypeLabel(type)}).` } };
  const updatedSession = await prisma.attendanceSession.update({
    where: { id: session.id },
    data: { status: 'CLOSED', closedAt: new Date(), closedByDiscordUserId: input.closedByDiscordUserId },
    include: attendanceSessionInclude,
  });
  publishGuildAppStateChanged({ guildId: guild.id, reason: 'attendance_updated' });
  return { status: 200 as const, body: { session: serializeAttendanceSession(updatedSession) } };
}

async function resolveAttendanceVoteContext(input: { discordGuildId: string; discordUserId: string; sessionId: string; type?: AttendanceType; discordMessageId?: string | null }) {
  const type = input.type ?? 'GVG';
  const guild = await findGuildByDiscordId(input.discordGuildId);
  if (!guild) return { status: 404 as const, body: { error: 'Server Discord chưa được import vào hệ thống.' } };
  const session = await prisma.attendanceSession.findFirst({
    where: { guildId: guild.id, type, status: 'OPEN', OR: [{ id: input.sessionId }, ...(input.discordMessageId ? [{ discordMessageId: input.discordMessageId }] : [])] },
    select: { id: true, guildId: true, type: true, discordChannelId: true, discordMessageId: true },
  });
  if (!session) return { status: 404 as const, body: { error: 'Phiên điểm danh không tồn tại hoặc đã đóng (hoặc sai loại).' } };
  const member = await prisma.member.findUnique({
    where: { guildId_discordUserId: { guildId: guild.id, discordUserId: input.discordUserId } },
    select: { id: true, active: true, ingameName: true, displayName: true, classType: true },
  });
  if (!member) return { status: 404 as const, body: { error: 'Thành viên chưa được import hoặc đồng bộ vào hệ thống.' } };
  if (!member.active) return { status: 403 as const, body: { error: 'Thành viên không hoạt động không thể điểm danh.' } };
  return { status: 200 as const, body: { guild, session, member } };
}

export async function persistAttendanceVote(input: { discordGuildId: string; discordUserId: string; sessionId: string; choice: AttendanceChoice; type?: AttendanceType; discordMessageId?: string | null }) {
  const contextResult = await resolveAttendanceVoteContext(input);
  if (contextResult.status !== 200) return contextResult;
  const { guild, session, member } = contextResult.body;
  await prisma.attendanceVote.upsert({
    where: { sessionId_memberId: { sessionId: session.id, memberId: member.id } },
    update: { choice: input.choice, snapshotIngameName: member.ingameName || member.displayName, snapshotClassType: member.classType },
    create: { sessionId: session.id, memberId: member.id, choice: input.choice, snapshotIngameName: member.ingameName || member.displayName, snapshotClassType: member.classType },
  });
  const refreshTarget = await prisma.attendanceSession.update({ where: { id: session.id }, data: { lastVoteAt: new Date() }, select: { id: true, guildId: true, type: true, discordChannelId: true, discordMessageId: true } });
  publishGuildAppStateChanged({ guildId: guild.id, reason: 'attendance_updated' });
  return { status: 200 as const, body: { refreshTarget: { guildId: refreshTarget.guildId, sessionId: refreshTarget.id, type: refreshTarget.type, discordChannelId: refreshTarget.discordChannelId, discordMessageId: refreshTarget.discordMessageId } satisfies AttendanceRefreshTarget } };
}

export async function castAttendanceVote(input: { discordGuildId: string; discordUserId: string; sessionId: string; choice: AttendanceChoice; type?: AttendanceType; discordMessageId?: string | null }) {
  const persistResult = await persistAttendanceVote(input);
  if (persistResult.status !== 200) return persistResult;
  const session = await prisma.attendanceSession.findUnique({ where: { id: persistResult.body.refreshTarget.sessionId }, include: attendanceSessionInclude });
  if (!session) return { status: 404 as const, body: { error: 'Phiên điểm danh không tồn tại hoặc đã đóng.' } };
  return { status: 200 as const, body: { session: serializeAttendanceSession(session) } };
}

export async function refreshAttendanceSession(discordGuildId: string, type: AttendanceType = 'GVG') {
  const guild = await findGuildByDiscordId(discordGuildId);
  if (!guild) return { status: 404 as const, body: { error: 'Server Discord chưa được import vào hệ thống.' } };
  const session = await prisma.attendanceSession.findFirst({ where: { guildId: guild.id, type, status: 'OPEN' }, include: attendanceSessionInclude, orderBy: { openedAt: 'desc' } });
  if (!session) return { status: 404 as const, body: { error: `Không có phiên điểm danh nào đang mở (${getAttendanceTypeLabel(type)}).` } };
  return { status: 200 as const, body: { session: serializeAttendanceSession(session) } };
}

export async function listAttendanceSessions(discordGuildId: string, take = 20, offset = 0, type: AttendanceType = 'GVG') {
  const guild = await findGuildByDiscordId(discordGuildId);
  if (!guild) return { status: 404 as const, body: { error: 'Server Discord chưa được import vào hệ thống.' } };
  const limit = Math.min(Math.max(take, 1), 50);
  const sessions = await prisma.attendanceSession.findMany({ where: { guildId: guild.id, type }, include: attendanceSessionInclude, orderBy: { openedAt: 'desc' }, skip: Math.max(offset, 0), take: limit + 1 });
  const page = sessions.slice(0, limit);
  return { status: 200 as const, body: { sessions: page.map(serializeAttendanceSession), hasMore: sessions.length > limit, nextOffset: offset + page.length } };
}

export async function getAttendanceSessionById(discordGuildId: string, sessionId: string, type: AttendanceType = 'GVG') {
  const guild = await findGuildByDiscordId(discordGuildId);
  if (!guild) return { status: 404 as const, body: { error: 'Server Discord chưa được import vào hệ thống.' } };
  const session = await prisma.attendanceSession.findFirst({ where: { id: sessionId, guildId: guild.id, type }, include: attendanceSessionInclude });
  if (!session) return { status: 404 as const, body: { error: 'Không tìm thấy phiên điểm danh.' } };
  return { status: 200 as const, body: { session: serializeAttendanceSession(session) } };
}

export async function deleteAttendanceSession(discordGuildId: string, sessionId: string, type: AttendanceType = 'GVG') {
  const guild = await findGuildByDiscordId(discordGuildId);
  if (!guild) return { status: 404 as const, body: { error: 'Server Discord chưa được import vào hệ thống.' } };
  const session = await prisma.attendanceSession.findFirst({ where: { id: sessionId, guildId: guild.id, type } });
  if (!session) return { status: 404 as const, body: { error: 'Không tìm thấy phiên điểm danh.' } };
  await prisma.attendanceSession.delete({ where: { id: session.id } });
  publishGuildAppStateChanged({ guildId: guild.id, reason: 'attendance_updated' });
  return { status: 200 as const, body: { success: true } };
}

export async function markAttendanceRendered(sessionId: string) {
  await prisma.attendanceSession.update({ where: { id: sessionId }, data: { lastRenderedAt: new Date() } });
}

export async function getAttendanceRenderPayload(sessionId: string, options?: AttendanceRenderOptions) {
  const session = await prisma.attendanceSession.findUnique({ where: { id: sessionId }, include: attendanceSessionInclude });
  if (!session) return { status: 404 as const, body: { error: 'Không tìm thấy phiên điểm danh.' } };
  return { status: 200 as const, body: { session: serializeAttendanceSession(session), content: renderAttendancePublicContent(session, session.votes, options) } };
}
