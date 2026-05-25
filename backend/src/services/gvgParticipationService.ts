import { prisma } from '../db.js';
import { publishGuildAppStateChanged } from './realtimeGateway.js';


export function normalizeBattleDate(value: string | Date) {
  const date = typeof value === 'string' ? new Date(`${value.slice(0, 10)}T00:00:00.000Z`) : value;
  if (Number.isNaN(date.getTime())) return null;
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

export function parseGvgParticipationStatsMonth(value: string | null | undefined) {
  if (!value) return null;
  const match = /^(\d{4})-(\d{2})$/.exec(value);
  if (!match) return null;

  const year = Number(match[1]);
  const month = Number(match[2]);
  if (month < 1 || month > 12) return null;

  return {
    month: value,
    start: new Date(Date.UTC(year, month - 1, 1)),
    end: new Date(Date.UTC(year, month, 1)),
  };
}

function getFullBattleNumbers(battleCount: number) {
  return Array.from({ length: Math.max(battleCount, 0) }, (_, index) => index + 1);
}

function inferBattleNumbersFromCount(count: number, battleCount: number) {
  return getFullBattleNumbers(Math.min(Math.max(count, 0), Math.max(battleCount, 0)));
}

function normalizeBattleNumbers(values: unknown[], battleCount: number) {
  const normalized = [...new Set(values.map(value => Number(value)).filter(value => Number.isInteger(value)))].sort((a, b) => a - b);
  if (normalized.some(value => value < 1 || value > battleCount)) return null;
  return normalized;
}

function serializeSession(session: {
  id: string;
  guildId: string;
  battleDate: Date;
  battleCount: number;
  finalizedByDiscordUserId: string | null;
  finalizedAt: Date;
  note: string | null;
  createdAt: Date;
  updatedAt: Date;
  entries: Array<{
    id: string;
    memberId: string;
    count: number;
    battleNumbers: number[];
    snapshotIngameName: string | null;
    snapshotClassType: string | null;
  }>;
}) {
  return {
    id: session.id,
    guildId: session.guildId,
    battleDate: session.battleDate.toISOString(),
    battleCount: session.battleCount,
    finalizedByDiscordUserId: session.finalizedByDiscordUserId,
    finalizedAt: session.finalizedAt.toISOString(),
    note: session.note,
    createdAt: session.createdAt.toISOString(),
    updatedAt: session.updatedAt.toISOString(),
    entries: session.entries.map(entry => ({
      id: entry.id,
      memberId: entry.memberId,
      count: entry.count,
      battleNumbers: entry.battleNumbers.length ? entry.battleNumbers : inferBattleNumbersFromCount(entry.count, session.battleCount),
      snapshotIngameName: entry.snapshotIngameName,
      snapshotClassType: entry.snapshotClassType,
    })),
  };
}

export async function listGvgParticipationSessions(guildId: string, options: { limit?: number; offset?: number } = {}) {
  const limit = Math.min(Math.max(options.limit ?? 20, 1), 50);
  const offset = Math.max(options.offset ?? 0, 0);
  const sessions = await prisma.gvgParticipationSession.findMany({
    where: { guildId },
    include: { entries: true },
    orderBy: { battleDate: 'desc' },
    skip: offset,
    take: limit + 1,
  });
  const pageSessions = sessions.slice(0, limit);
  const hasMore = sessions.length > limit;

  return {
    sessions: pageSessions.map(serializeSession),
    hasMore,
    nextOffset: hasMore ? offset + pageSessions.length : null,
  };
}

export async function getGvgParticipationStats(guildId: string, options?: { month?: string | null }) {
  const monthRange = parseGvgParticipationStatsMonth(options?.month);
  const rows = await prisma.gvgParticipationEntry.groupBy({
    by: ['memberId'],
    where: {
      session: {
        guildId,
        ...(monthRange ? { battleDate: { gte: monthRange.start, lt: monthRange.end } } : {}),
      },
    },
    _sum: { count: true },
  });

  return Object.fromEntries(rows.map(row => [row.memberId, row._sum.count ?? 0]));
}

export async function deleteGvgParticipationSessionsForMonth(input: { guildId: string; month: string }) {
  const monthRange = parseGvgParticipationStatsMonth(input.month);
  if (!monthRange) {
    return { status: 400 as const, body: { error: 'Tháng bang chiến không hợp lệ.' } };
  }

  const result = await prisma.gvgParticipationSession.deleteMany({
    where: {
      guildId: input.guildId,
      battleDate: { gte: monthRange.start, lt: monthRange.end },
    },
  });

  publishGuildAppStateChanged({ guildId: input.guildId, reason: 'gvg_participation_updated' });
  return { status: 200 as const, body: { deletedCount: result.count } };
}

export async function finalizeGvgParticipationSession(input: {
  guildId: string;
  finalizedByDiscordUserId: string;
  battleDate: string;
  battleCount: number;
  participations?: Array<{ memberId: string; battleNumbers: unknown[] }>;
  memberIds?: string[];
  note?: string | null;
}) {
  const battleDate = normalizeBattleDate(input.battleDate);
  if (!battleDate) {
    return { status: 400 as const, body: { error: 'Ngày bang chiến không hợp lệ.' } };
  }

  const battleCount = input.battleCount === 1 ? 1 : input.battleCount === 2 ? 2 : null;
  if (!battleCount) {
    return { status: 400 as const, body: { error: 'Số trận phải là 1 hoặc 2.' } };
  }

  const participationMap = new Map<string, number[]>();
  if (Array.isArray(input.participations)) {
    for (const participation of input.participations) {
      if (!participation || typeof participation.memberId !== 'string' || !participation.memberId.trim()) continue;
      const battleNumbers = normalizeBattleNumbers(Array.isArray(participation.battleNumbers) ? participation.battleNumbers : [], battleCount);
      if (!battleNumbers) {
        return { status: 400 as const, body: { error: 'Danh sách trận tham gia không hợp lệ.' } };
      }
      if (battleNumbers.length) participationMap.set(participation.memberId.trim(), battleNumbers);
    }
  } else {
    const fullBattleNumbers = getFullBattleNumbers(battleCount);
    (input.memberIds || [])
      .filter(id => typeof id === 'string' && id.trim())
      .map(id => id.trim())
      .forEach(id => participationMap.set(id, fullBattleNumbers));
  }

  const memberIds = [...participationMap.keys()];
  const members = memberIds.length > 0 ? await prisma.member.findMany({
    where: { guildId: input.guildId, id: { in: memberIds }, active: true },
  }) : [];

  if (members.length !== memberIds.length) {
    return { status: 400 as const, body: { error: 'Danh sách thành viên có người không hợp lệ hoặc không còn hoạt động.' } };
  }

  const session = await prisma.$transaction(async tx => {
    const existing = await tx.gvgParticipationSession.findUnique({
      where: { guildId_battleDate: { guildId: input.guildId, battleDate } },
      select: { id: true },
    });

    if (existing) {
      await tx.gvgParticipationEntry.deleteMany({ where: { sessionId: existing.id } });
    }

    const savedSession = await tx.gvgParticipationSession.upsert({
      where: { guildId_battleDate: { guildId: input.guildId, battleDate } },
      update: {
        battleCount,
        finalizedByDiscordUserId: input.finalizedByDiscordUserId,
        finalizedAt: new Date(),
        note: input.note?.trim() || null,
      },
      create: {
        guildId: input.guildId,
        battleDate,
        battleCount,
        finalizedByDiscordUserId: input.finalizedByDiscordUserId,
        note: input.note?.trim() || null,
      },
    });

    if (members.length > 0) {
      await tx.gvgParticipationEntry.createMany({
        data: members.map(member => {
          const battleNumbers = participationMap.get(member.id)!;
          return {
            sessionId: savedSession.id,
            memberId: member.id,
            count: battleNumbers.length,
            battleNumbers,
            snapshotIngameName: member.ingameName || member.displayName,
            snapshotClassType: member.classType,
          };
        }),
      });
    }

    return tx.gvgParticipationSession.findUniqueOrThrow({
      where: { id: savedSession.id },
      include: { entries: true },
    });
  });

  publishGuildAppStateChanged({ guildId: input.guildId, reason: 'gvg_participation_updated' });
  return { status: 200 as const, body: { session: serializeSession(session) } };
}
