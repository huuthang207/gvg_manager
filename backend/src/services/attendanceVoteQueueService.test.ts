import { beforeEach, test } from 'node:test';
import assert from 'node:assert/strict';
import { AttendanceVoteJobStatus, type AttendanceChoice } from '@prisma/client';
import { prisma } from '../db.js';
import {
  __resetAttendanceVoteWorkerForTests,
  claimAttendanceVoteJobs,
  enqueueAttendanceVoteJob,
  processAttendanceVoteJob,
  runAttendanceVoteWorkerBatch,
} from './attendanceVoteQueueService.js';
import { setAttendanceDiscordClient } from './attendanceDiscordService.js';

const now = new Date('2026-06-24T12:00:00.000Z');

function mockPrisma(model: keyof typeof prisma, methods: Record<string, unknown>) {
  const target = prisma[model] as unknown as Record<string, unknown>;
  Object.entries(methods).forEach(([name, fn]) => {
    target[name] = fn;
  });
}

function createJob(overrides: Record<string, unknown> = {}) {
  return {
    id: 'job-1',
    sessionId: 'session-1',
    guildId: 'guild-1',
    discordGuildId: '123456789012345678',
    discordUserId: '345678901234567890',
    discordMessageId: '456789012345678901',
    choice: 'GO',
    status: 'PENDING',
    attempts: 0,
    availableAt: now,
    lockedAt: null,
    lockedBy: null,
    processedAt: null,
    lastError: null,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  } as any;
}

beforeEach(() => {
  __resetAttendanceVoteWorkerForTests();
  setAttendanceDiscordClient({
    channels: {
      fetch: async () => ({
        isTextBased: () => true,
        messages: {
          fetch: async () => ({
            edit: async () => undefined,
          }),
        },
      }),
    },
  } as any);
});

test('enqueueAttendanceVoteJob upserts latest choice for the same session and discord user', async () => {
  let upsertArgs: any = null;
  mockPrisma('attendanceSession', {
    findUnique: async () => ({
      id: 'session-1',
      guildId: 'guild-1',
      guild: { discordGuildId: '123456789012345678' },
    }),
  });
  mockPrisma('attendanceVoteJob', {
    upsert: async (args: any) => {
      upsertArgs = args;
      return createJob({ choice: args.update.choice });
    },
  });

  const result = await enqueueAttendanceVoteJob({
    sessionId: 'session-1',
    discordGuildId: '123456789012345678',
    discordUserId: '345678901234567890',
    choice: 'NOGO' as AttendanceChoice,
    discordMessageId: '456789012345678901',
  });

  assert.equal(result.status, 202);
  assert.deepEqual(upsertArgs.where, {
    sessionId_discordUserId: {
      sessionId: 'session-1',
      discordUserId: '345678901234567890',
    },
  });
  assert.equal(upsertArgs.update.choice, 'NOGO');
});

test('claimAttendanceVoteJobs claims pending jobs for the worker', async () => {
  let updateManyCalls = 0;
  mockPrisma('attendanceVoteJob', {
    findMany: async () => [createJob()],
    updateMany: async () => {
      updateManyCalls += 1;
      return { count: 1 };
    },
    findUnique: async () => createJob({ status: AttendanceVoteJobStatus.PROCESSING, attempts: 1, lockedBy: 'worker-1', lockedAt: now }),
  });

  const jobs = await claimAttendanceVoteJobs(5, 'worker-1');

  assert.equal(updateManyCalls, 1);
  assert.equal(jobs.length, 1);
  assert.equal(jobs[0]?.status, AttendanceVoteJobStatus.PROCESSING);
  assert.equal(jobs[0]?.lockedBy, 'worker-1');
});

test('processAttendanceVoteJob marks the job succeeded and queues refresh after persistence', async () => {
  const updates: any[] = [];
  mockPrisma('guild', {
    findUnique: async () => ({ id: 'guild-1', discordGuildId: '123456789012345678' }),
  });
  mockPrisma('attendanceSession', {
    findFirst: async () => ({
      id: 'session-1',
      guildId: 'guild-1',
      discordChannelId: '234567890123456789',
      discordMessageId: '456789012345678901',
    }),
    update: async () => ({
      id: 'session-1',
      guildId: 'guild-1',
      discordChannelId: '234567890123456789',
      discordMessageId: '456789012345678901',
    }),
    findUnique: async () => ({
      id: 'session-1',
      guildId: 'guild-1',
      status: 'OPEN',
      headerText: null,
      discordChannelId: '234567890123456789',
      discordMessageId: '456789012345678901',
      openedByDiscordUserId: '111111111111111111',
      closedByDiscordUserId: null,
      openedAt: now,
      closedAt: null,
      lastRenderedAt: now,
      lastVoteAt: now,
      createdAt: now,
      updatedAt: now,
      votes: [],
    }),
  });
  mockPrisma('member', {
    findUnique: async () => ({
      id: 'member-1',
      active: true,
      ingameName: 'Ingame Name',
      displayName: 'Discord Name',
      classType: 'Tố Vấn',
    }),
  });
  mockPrisma('attendanceVote', {
    upsert: async () => ({ id: 'vote-1' }),
  });
  mockPrisma('attendanceVoteJob', {
    update: async (args: any) => {
      updates.push(args);
      return createJob({ status: args.data.status ?? AttendanceVoteJobStatus.SUCCEEDED });
    },
  });

  const result = await processAttendanceVoteJob(createJob({ attempts: 1 }), 'worker-1');

  assert.equal(result.ok, true);
  assert.equal(updates[0].data.status, AttendanceVoteJobStatus.SUCCEEDED);
});

test('processAttendanceVoteJob marks non-retryable domain failures as failed', async () => {
  const updates: any[] = [];
  mockPrisma('guild', {
    findUnique: async () => ({ id: 'guild-1', discordGuildId: '123456789012345678' }),
  });
  mockPrisma('attendanceSession', {
    findFirst: async () => null,
  });
  mockPrisma('attendanceVoteJob', {
    update: async (args: any) => {
      updates.push(args);
      return createJob({ status: args.data.status });
    },
  });

  const result = await processAttendanceVoteJob(createJob({ attempts: 1 }), 'worker-1');

  assert.equal(result.ok, false);
  assert.equal(result.retrying, false);
  assert.equal(updates[0].data.status, AttendanceVoteJobStatus.FAILED);
});

test('processAttendanceVoteJob retries thrown persistence errors before max attempts', async () => {
  const updates: any[] = [];
  mockPrisma('guild', {
    findUnique: async () => ({ id: 'guild-1', discordGuildId: '123456789012345678' }),
  });
  mockPrisma('attendanceSession', {
    findFirst: async () => ({
      id: 'session-1',
      guildId: 'guild-1',
      discordChannelId: '234567890123456789',
      discordMessageId: '456789012345678901',
    }),
  });
  mockPrisma('member', {
    findUnique: async () => ({
      id: 'member-1',
      active: true,
      ingameName: 'Ingame Name',
      displayName: 'Discord Name',
      classType: 'Tố Vấn',
    }),
  });
  mockPrisma('attendanceVote', {
    upsert: async () => {
      throw new Error('db failed');
    },
  });
  mockPrisma('attendanceVoteJob', {
    update: async (args: any) => {
      updates.push(args);
      return createJob({ status: args.data.status });
    },
  });

  const result = await processAttendanceVoteJob(createJob({ attempts: 1 }), 'worker-1');

  assert.equal(result.ok, false);
  assert.equal(result.retrying, true);
  assert.equal(updates[0].data.status, AttendanceVoteJobStatus.PENDING);
  assert.ok(updates[0].data.availableAt instanceof Date);
});

test('runAttendanceVoteWorkerBatch processes claimed jobs', async () => {
  let claimed = false;
  let processed = false;
  mockPrisma('attendanceVoteJob', {
    findMany: async () => [createJob()],
    updateMany: async () => ({ count: 1 }),
    findUnique: async () => createJob({ status: AttendanceVoteJobStatus.PROCESSING, attempts: 1, lockedBy: 'worker-1', lockedAt: now }),
    update: async () => {
      processed = true;
      return createJob({ status: AttendanceVoteJobStatus.SUCCEEDED });
    },
  });
  mockPrisma('guild', {
    findUnique: async () => ({ id: 'guild-1', discordGuildId: '123456789012345678' }),
  });
  mockPrisma('attendanceSession', {
    findFirst: async () => {
      claimed = true;
      return {
        id: 'session-1',
        guildId: 'guild-1',
        discordChannelId: '234567890123456789',
        discordMessageId: '456789012345678901',
      };
    },
    update: async () => ({
      id: 'session-1',
      guildId: 'guild-1',
      discordChannelId: '234567890123456789',
      discordMessageId: '456789012345678901',
    }),
    findUnique: async () => ({
      id: 'session-1',
      guildId: 'guild-1',
      status: 'OPEN',
      headerText: null,
      discordChannelId: '234567890123456789',
      discordMessageId: '456789012345678901',
      openedByDiscordUserId: '111111111111111111',
      closedByDiscordUserId: null,
      openedAt: now,
      closedAt: null,
      lastRenderedAt: now,
      lastVoteAt: now,
      createdAt: now,
      updatedAt: now,
      votes: [],
    }),
  });
  mockPrisma('member', {
    findUnique: async () => ({
      id: 'member-1',
      active: true,
      ingameName: 'Ingame Name',
      displayName: 'Discord Name',
      classType: 'Tố Vấn',
    }),
  });
  mockPrisma('attendanceVote', {
    upsert: async () => ({ id: 'vote-1' }),
  });

  const processedCount = await runAttendanceVoteWorkerBatch();

  assert.equal(processedCount, 1);
  assert.equal(claimed, true);
  assert.equal(processed, true);
});
