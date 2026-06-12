import { beforeEach, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { prisma } from '../db.js';
import {
  castAttendanceVote,
  closeAttendanceSession,
  openAttendanceSession,
  refreshAttendanceSession,
  setAttendanceChannel,
} from './attendanceService.js';

const now = new Date('2026-05-17T12:00:00.000Z');
const guild = {
  id: 'guild-1',
  discordGuildId: '123456789012345678',
  name: 'Guild',
  icon: null,
  ownerUserId: 'user-1',
  lastSyncedAt: null,
  createdAt: now,
  updatedAt: now,
};
const channelConfig = {
  id: 'config-1',
  guildId: guild.id,
  discordChannelId: '234567890123456789',
  createdAt: now,
  updatedAt: now,
};
const member = {
  id: 'member-1',
  guildId: guild.id,
  discordUserId: '345678901234567890',
  username: 'discord-user',
  displayName: 'Discord Name',
  ingameName: 'Ingame Name',
  avatar: null,
  classType: 'Tố Vấn',
  joinedAt: null,
  active: true,
  createdAt: now,
  updatedAt: now,
};

function createSession(overrides: Record<string, unknown> = {}) {
  return {
    id: 'session-1',
    guildId: guild.id,
    status: 'OPEN',
    headerText: null,
    discordChannelId: channelConfig.discordChannelId,
    discordMessageId: '456789012345678901',
    openedByDiscordUserId: '345678901234567890',
    closedByDiscordUserId: null,
    openedAt: now,
    closedAt: null,
    lastRenderedAt: null,
    lastVoteAt: null,
    createdAt: now,
    updatedAt: now,
    votes: [],
    ...overrides,
  };
}

function mockPrisma(model: keyof typeof prisma, methods: Record<string, unknown>) {
  const target = prisma[model] as unknown as Record<string, unknown>;
  Object.entries(methods).forEach(([name, fn]) => {
    target[name] = fn;
  });
}

beforeEach(() => {
  mockPrisma('guild', {
    findUnique: async () => guild,
  });
  mockPrisma('attendanceChannelConfig', {
    findUnique: async () => channelConfig,
    upsert: async (_args: unknown) => channelConfig,
  });
  mockPrisma('attendanceSession', {
    findFirst: async () => null,
    create: async () => createSession({ headerText: 'Bang chiến tối nay' }),
    update: async () => createSession({ lastVoteAt: now }),
  });
  mockPrisma('member', {
    findFirst: async () => member,
  });
  mockPrisma('attendanceVote', {
    upsert: async () => ({ id: 'vote-1' }),
  });
});

describe('attendanceService', () => {
  it('sets attendance channel for an imported guild', async () => {
    let upsertArgs: any = null;
    mockPrisma('attendanceChannelConfig', {
      upsert: async (args: any) => {
        upsertArgs = args;
        return channelConfig;
      },
    });

    const result = await setAttendanceChannel(guild.discordGuildId, channelConfig.discordChannelId);

    assert.equal(result.status, 200);
    assert.deepEqual(upsertArgs.where, { guildId: guild.id });
    assert.deepEqual(upsertArgs.update, { discordChannelId: channelConfig.discordChannelId });
    assert.deepEqual(upsertArgs.create, { guildId: guild.id, discordChannelId: channelConfig.discordChannelId });
  });

  it('rejects invalid attendance channel ids', async () => {
    const result = await setAttendanceChannel(guild.discordGuildId, 'not-a-snowflake');

    assert.equal(result.status, 400);
    assert.match(result.body.error, /không hợp lệ/);
  });

  it('opens an attendance session when channel config exists and no session is open', async () => {
    let createArgs: any = null;
    mockPrisma('attendanceSession', {
      findFirst: async () => null,
      create: async (args: any) => {
        createArgs = args;
        return createSession({ headerText: args.data.headerText });
      },
    });

    const result = await openAttendanceSession({
      discordGuildId: guild.discordGuildId,
      openedByDiscordUserId: member.discordUserId,
      headerText: '  Bang chiến tối nay  ',
    });

    assert.equal(result.status, 201);
    assert.equal(result.body.session.headerText, 'Bang chiến tối nay');
    assert.equal(createArgs.data.guildId, guild.id);
    assert.equal(createArgs.data.discordChannelId, channelConfig.discordChannelId);
  });

  it('rejects opening a session without channel config', async () => {
    mockPrisma('attendanceChannelConfig', {
      findUnique: async () => null,
    });

    const result = await openAttendanceSession({
      discordGuildId: guild.discordGuildId,
      openedByDiscordUserId: member.discordUserId,
    });

    assert.equal(result.status, 400);
    assert.match(result.body.error, /Chưa cấu hình kênh điểm danh/);
  });

  it('rejects opening a second active session', async () => {
    mockPrisma('attendanceSession', {
      findFirst: async () => createSession(),
    });

    const result = await openAttendanceSession({
      discordGuildId: guild.discordGuildId,
      openedByDiscordUserId: member.discordUserId,
    });

    assert.equal(result.status, 409);
    assert.match(result.body.error, /Đang có một phiên điểm danh mở/);
  });

  it('casts a vote using the member snapshot data', async () => {
    let voteUpsertArgs: any = null;
    mockPrisma('attendanceSession', {
      findFirst: async () => createSession(),
      update: async () => createSession({
        lastVoteAt: now,
        votes: [{
          id: 'vote-1',
          memberId: member.id,
          choice: 'GO',
          snapshotIngameName: member.ingameName,
          snapshotClassType: member.classType,
          votedAt: now,
          updatedAt: now,
          member,
        }],
      }),
    });
    mockPrisma('attendanceVote', {
      upsert: async (args: any) => {
        voteUpsertArgs = args;
        return { id: 'vote-1' };
      },
    });

    const result = await castAttendanceVote({
      discordGuildId: guild.discordGuildId,
      discordUserId: member.discordUserId,
      sessionId: 'session-1',
      choice: 'GO',
    });

    assert.equal(result.status, 200);
    assert.deepEqual(voteUpsertArgs.where, { sessionId_memberId: { sessionId: 'session-1', memberId: member.id } });
    assert.equal(voteUpsertArgs.create.snapshotIngameName, member.ingameName);
    assert.equal(voteUpsertArgs.update.choice, 'GO');
    assert.equal(result.body.session.summary.go, 1);
  });

  it('updates an existing vote when a member votes again', async () => {
    let voteUpsertArgs: any = null;
    mockPrisma('attendanceSession', {
      findFirst: async () => createSession(),
      update: async () => createSession({
        lastVoteAt: now,
        votes: [{
          id: 'vote-1',
          memberId: member.id,
          choice: 'NOGO',
          snapshotIngameName: member.ingameName,
          snapshotClassType: member.classType,
          votedAt: now,
          updatedAt: now,
          member,
        }],
      }),
    });
    mockPrisma('attendanceVote', {
      upsert: async (args: any) => {
        voteUpsertArgs = args;
        return { id: 'vote-1' };
      },
    });

    const result = await castAttendanceVote({
      discordGuildId: guild.discordGuildId,
      discordUserId: member.discordUserId,
      sessionId: 'session-1',
      choice: 'NOGO',
    });

    assert.equal(result.status, 200);
    assert.equal(voteUpsertArgs.update.choice, 'NOGO');
    assert.equal(result.body.session.summary.nogo, 1);
    assert.equal(result.body.session.summary.go, 0);
  });

  it('rejects votes for closed or missing active sessions', async () => {
    mockPrisma('attendanceSession', {
      findFirst: async () => null,
    });

    const result = await castAttendanceVote({
      discordGuildId: guild.discordGuildId,
      discordUserId: member.discordUserId,
      sessionId: 'closed-session',
      choice: 'GO',
    });

    assert.equal(result.status, 404);
    assert.match(result.body.error, /không tồn tại hoặc đã đóng/);
  });

  it('rejects votes from inactive members', async () => {
    mockPrisma('attendanceSession', {
      findFirst: async () => createSession(),
    });
    mockPrisma('member', {
      findFirst: async () => ({ ...member, active: false }),
    });

    const result = await castAttendanceVote({
      discordGuildId: guild.discordGuildId,
      discordUserId: member.discordUserId,
      sessionId: 'session-1',
      choice: 'GO',
    });

    assert.equal(result.status, 403);
    assert.match(result.body.error, /không hoạt động/);
  });

  it('closes the active attendance session', async () => {
    let updateArgs: any = null;
    mockPrisma('attendanceSession', {
      findFirst: async () => createSession(),
      update: async (args: any) => {
        updateArgs = args;
        return createSession({
          status: 'CLOSED',
          closedByDiscordUserId: member.discordUserId,
          closedAt: now,
          lastRenderedAt: now,
        });
      },
    });

    const result = await closeAttendanceSession({
      discordGuildId: guild.discordGuildId,
      closedByDiscordUserId: member.discordUserId,
    });

    assert.equal(result.status, 200);
    assert.equal(result.body.session.status, 'CLOSED');
    assert.equal(result.body.session.closedByDiscordUserId, member.discordUserId);
    assert.equal(updateArgs.data.status, 'CLOSED');
  });

  it('rejects closing when no session is open', async () => {
    mockPrisma('attendanceSession', {
      findFirst: async () => null,
    });

    const result = await closeAttendanceSession({
      discordGuildId: guild.discordGuildId,
      closedByDiscordUserId: member.discordUserId,
    });

    assert.equal(result.status, 404);
    assert.match(result.body.error, /Không có phiên điểm danh nào đang mở/);
  });

  it('refreshes the active attendance session render timestamp', async () => {
    let updateArgs: any = null;
    mockPrisma('attendanceSession', {
      findFirst: async () => createSession(),
      update: async (args: any) => {
        updateArgs = args;
        return createSession({ lastRenderedAt: now });
      },
    });

    const result = await refreshAttendanceSession(guild.discordGuildId);

    assert.equal(result.status, 200);
    assert.ok(result.body.session.lastRenderedAt);
    assert.deepEqual(updateArgs.where, { id: 'session-1' });
  });
});
