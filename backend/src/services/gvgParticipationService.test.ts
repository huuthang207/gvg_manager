import { beforeEach, test } from 'node:test';
import assert from 'node:assert/strict';
import { prisma } from '../db.js';
import {
  deleteGvgParticipationSessionsForMonth,
  finalizeGvgParticipationSession,
  getGvgParticipationStats,
  normalizeBattleDate,
  parseGvgParticipationStatsMonth,
} from './gvgParticipationService.js';

const now = new Date('2026-05-30T12:00:00.000Z');
const guildId = 'guild-1';
const memberA = {
  id: 'member-a',
  guildId,
  discordUserId: '111111111111111111',
  username: 'member-a',
  displayName: 'Member A',
  ingameName: 'Ingame A',
  avatar: null,
  classType: 'Tố Vấn',
  previousClassType: null,
  classChangedAt: null,
  joinedAt: null,
  active: true,
  createdAt: now,
  updatedAt: now,
};
const memberB = {
  ...memberA,
  id: 'member-b',
  discordUserId: '222222222222222222',
  username: 'member-b',
  displayName: 'Member B',
  ingameName: null,
  classType: 'Thiết Y',
};

function mockPrisma(model: keyof typeof prisma, methods: Record<string, unknown>) {
  const target = prisma[model] as unknown as Record<string, unknown>;
  Object.entries(methods).forEach(([name, fn]) => {
    target[name] = fn;
  });
}

function createParticipationSession(overrides: Record<string, unknown> = {}) {
  return {
    id: 'participation-session-1',
    guildId,
    battleDate: new Date('2026-05-30T00:00:00.000Z'),
    battleCount: 2,
    finalizedByDiscordUserId: 'admin-discord-id',
    finalizedAt: now,
    note: null,
    createdAt: now,
    updatedAt: now,
    entries: [],
    ...overrides,
  };
}

beforeEach(() => {
  mockPrisma('member', {
    findMany: async ({ where }: any) => [memberA, memberB].filter(member => where.id.in.includes(member.id)),
  });
  mockPrisma('gvgParticipationEntry', {
    groupBy: async () => [],
  });
  mockPrisma('gvgParticipationSession', {
    deleteMany: async () => ({ count: 0 }),
  });
  (prisma as unknown as { $transaction: unknown }).$transaction = async (callback: (tx: any) => Promise<unknown>) => callback({
    gvgParticipationSession: {
      findUnique: async () => null,
      upsert: async () => createParticipationSession(),
      findUniqueOrThrow: async () => createParticipationSession(),
    },
    gvgParticipationEntry: {
      deleteMany: async () => ({ count: 0 }),
      createMany: async () => ({ count: 0 }),
    },
  });
});

test('normalizes date input to UTC midnight', () => {
  const date = normalizeBattleDate('2026-05-30');
  assert.equal(date?.toISOString(), '2026-05-30T00:00:00.000Z');
});

test('parses GvG participation stats month to UTC range', () => {
  const range = parseGvgParticipationStatsMonth('2026-05');
  assert.equal(range?.month, '2026-05');
  assert.equal(range?.start.toISOString(), '2026-05-01T00:00:00.000Z');
  assert.equal(range?.end.toISOString(), '2026-06-01T00:00:00.000Z');
});

test('rejects invalid GvG participation stats months', () => {
  assert.equal(parseGvgParticipationStatsMonth('2026-00'), null);
  assert.equal(parseGvgParticipationStatsMonth('2026-13'), null);
  assert.equal(parseGvgParticipationStatsMonth('2026-5'), null);
  assert.equal(parseGvgParticipationStatsMonth('invalid'), null);
});

test('finalizes participation with per-battle entries and member snapshots', async () => {
  let createManyArgs: any = null;
  let upsertArgs: any = null;
  (prisma as unknown as { $transaction: unknown }).$transaction = async (callback: (tx: any) => Promise<unknown>) => callback({
    gvgParticipationSession: {
      findUnique: async () => null,
      upsert: async (args: any) => {
        upsertArgs = args;
        return createParticipationSession({ note: args.create.note });
      },
      findUniqueOrThrow: async () => createParticipationSession({
        note: 'note',
        entries: [
          {
            id: 'entry-a',
            memberId: memberA.id,
            count: 2,
            battleNumbers: [1, 2],
            snapshotIngameName: memberA.ingameName,
            snapshotClassType: memberA.classType,
          },
          {
            id: 'entry-b',
            memberId: memberB.id,
            count: 1,
            battleNumbers: [2],
            snapshotIngameName: memberB.displayName,
            snapshotClassType: memberB.classType,
          },
        ],
      }),
    },
    gvgParticipationEntry: {
      deleteMany: async () => ({ count: 0 }),
      createMany: async (args: any) => {
        createManyArgs = args;
        return { count: args.data.length };
      },
    },
  });

  const result = await finalizeGvgParticipationSession({
    guildId,
    finalizedByDiscordUserId: 'admin-discord-id',
    battleDate: '2026-05-30',
    battleCount: 2,
    participations: [
      { memberId: memberA.id, battleNumbers: [1, 2] },
      { memberId: memberB.id, battleNumbers: [2] },
    ],
    note: '  note  ',
  });

  assert.equal(result.status, 200);
  assert.equal(upsertArgs.create.note, 'note');
  assert.equal(upsertArgs.create.battleDate.toISOString(), '2026-05-30T00:00:00.000Z');
  assert.deepEqual(createManyArgs.data.map((entry: any) => ({
    memberId: entry.memberId,
    count: entry.count,
    battleNumbers: entry.battleNumbers,
    snapshotIngameName: entry.snapshotIngameName,
    snapshotClassType: entry.snapshotClassType,
  })), [
    { memberId: memberA.id, count: 2, battleNumbers: [1, 2], snapshotIngameName: 'Ingame A', snapshotClassType: 'Tố Vấn' },
    { memberId: memberB.id, count: 1, battleNumbers: [2], snapshotIngameName: 'Member B', snapshotClassType: 'Thiết Y' },
  ]);
  assert.deepEqual(result.body.session.entries.map(entry => [entry.memberId, entry.battleNumbers]), [
    [memberA.id, [1, 2]],
    [memberB.id, [2]],
  ]);
});

test('replaces existing entries when finalizing the same battle date again', async () => {
  let deletedWhere: any = null;
  (prisma as unknown as { $transaction: unknown }).$transaction = async (callback: (tx: any) => Promise<unknown>) => callback({
    gvgParticipationSession: {
      findUnique: async () => ({ id: 'existing-session' }),
      upsert: async () => createParticipationSession({ id: 'existing-session' }),
      findUniqueOrThrow: async () => createParticipationSession({ id: 'existing-session' }),
    },
    gvgParticipationEntry: {
      deleteMany: async (args: any) => {
        deletedWhere = args.where;
        return { count: 2 };
      },
      createMany: async () => ({ count: 1 }),
    },
  });

  const result = await finalizeGvgParticipationSession({
    guildId,
    finalizedByDiscordUserId: 'admin-discord-id',
    battleDate: '2026-05-30',
    battleCount: 1,
    memberIds: [memberA.id],
  });

  assert.equal(result.status, 200);
  assert.deepEqual(deletedWhere, { sessionId: 'existing-session' });
});

test('rejects invalid battle numbers', async () => {
  const result = await finalizeGvgParticipationSession({
    guildId,
    finalizedByDiscordUserId: 'admin-discord-id',
    battleDate: '2026-05-30',
    battleCount: 2,
    participations: [{ memberId: memberA.id, battleNumbers: [3] }],
  });

  assert.equal(result.status, 400);
  assert.match(result.body.error, /Danh sách trận tham gia không hợp lệ/);
});

test('rejects inactive or missing participation members', async () => {
  mockPrisma('member', {
    findMany: async () => [memberA],
  });

  const result = await finalizeGvgParticipationSession({
    guildId,
    finalizedByDiscordUserId: 'admin-discord-id',
    battleDate: '2026-05-30',
    battleCount: 2,
    memberIds: [memberA.id, memberB.id],
  });

  assert.equal(result.status, 400);
  assert.match(result.body.error, /không hợp lệ hoặc không còn hoạt động/);
});

test('aggregates participation stats within the requested month', async () => {
  let groupByArgs: any = null;
  mockPrisma('gvgParticipationEntry', {
    groupBy: async (args: any) => {
      groupByArgs = args;
      return [
        { memberId: memberA.id, _sum: { count: 3 } },
        { memberId: memberB.id, _sum: { count: 1 } },
      ];
    },
  });

  const stats = await getGvgParticipationStats(guildId, { month: '2026-05' });

  assert.deepEqual(stats, { [memberA.id]: 3, [memberB.id]: 1 });
  assert.equal(groupByArgs.where.session.guildId, guildId);
  assert.equal(groupByArgs.where.session.battleDate.gte.toISOString(), '2026-05-01T00:00:00.000Z');
  assert.equal(groupByArgs.where.session.battleDate.lt.toISOString(), '2026-06-01T00:00:00.000Z');
});

test('deletes participation sessions for a valid month', async () => {
  let deleteManyArgs: any = null;
  mockPrisma('gvgParticipationSession', {
    deleteMany: async (args: any) => {
      deleteManyArgs = args;
      return { count: 2 };
    },
  });

  const result = await deleteGvgParticipationSessionsForMonth({ guildId, month: '2026-05' });

  assert.equal(result.status, 200);
  assert.equal(result.body.deletedCount, 2);
  assert.equal(deleteManyArgs.where.guildId, guildId);
  assert.equal(deleteManyArgs.where.battleDate.gte.toISOString(), '2026-05-01T00:00:00.000Z');
  assert.equal(deleteManyArgs.where.battleDate.lt.toISOString(), '2026-06-01T00:00:00.000Z');
});

test('rejects deleting participation sessions for an invalid month', async () => {
  const result = await deleteGvgParticipationSessionsForMonth({ guildId, month: '2026-5' });

  assert.equal(result.status, 400);
  assert.match(result.body.error, /Tháng bang chiến không hợp lệ/);
});
