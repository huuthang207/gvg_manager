import { beforeEach, test } from 'node:test';
import assert from 'node:assert/strict';
import { prisma } from './db.js';
import { handleAttendanceInteraction } from './botAttendance.js';
import { __resetAttendanceVoteWorkerForTests } from './services/attendanceVoteQueueService.js';

const now = new Date('2026-05-17T12:00:00.000Z');

function createQueueJob(overrides: Record<string, unknown> = {}) {
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

function mockPrisma(model: keyof typeof prisma, methods: Record<string, unknown>) {
  const target = prisma[model] as unknown as Record<string, unknown>;
  Object.entries(methods).forEach(([name, fn]) => {
    target[name] = fn;
  });
}

function setupAttendanceVoteJobMocks(options: {
  sessionRecord?: Record<string, unknown> | null;
  upsertImpl?: (args: any) => any;
} = {}) {
  const state = {
    job: createQueueJob(),
  };

  mockPrisma('attendanceSession', {
    findUnique: async () => ('sessionRecord' in options)
      ? options.sessionRecord ?? null
      : {
        id: 'session-1',
        guildId: 'guild-1',
        guild: { discordGuildId: '123456789012345678' },
      },
  });

  mockPrisma('attendanceVoteJob', {
    upsert: async (args: any) => {
      if (options.upsertImpl) {
        return options.upsertImpl(args);
      }
      state.job = createQueueJob({
        ...state.job,
        sessionId: args.create.sessionId,
        guildId: args.create.guildId,
        discordGuildId: args.create.discordGuildId,
        discordUserId: args.create.discordUserId,
        discordMessageId: args.create.discordMessageId,
        choice: args.update.choice,
        status: 'PENDING',
        lockedAt: null,
        lockedBy: null,
        processedAt: null,
        lastError: null,
      });
      return state.job;
    },
    findMany: async () => [],
    updateMany: async () => ({ count: 0 }),
    findUnique: async () => state.job,
    update: async (args: any) => {
      state.job = createQueueJob({
        ...state.job,
        ...args.data,
      });
      return state.job;
    },
  });

  return state;
}

function createButtonInteraction(overrides: Record<string, unknown> = {}) {
  let deferred = false;
  let replied = false;
  const followUpContents: string[] = [];

  const interaction: Record<string, unknown> = {
    id: 'interaction-1',
    channelId: 'channel-1',
    customId: 'attendance:GO:session-1',
    guildId: '123456789012345678',
    user: { id: '345678901234567890' },
    message: { id: '456789012345678901' },
    deferred: false,
    replied: false,
    isChatInputCommand: () => false,
    isButton: () => true,
    deferUpdate: async () => {
      deferred = true;
      interaction.deferred = true;
    },
    followUp: async ({ content }: { content: string }) => {
      replied = true;
      followUpContents.push(content);
      interaction.replied = true;
    },
    reply: async ({ content }: { content: string }) => {
      replied = true;
      followUpContents.push(content);
      interaction.replied = true;
    },
  };

  return {
    ...interaction,
    get deferredState() {
      return deferred;
    },
    get replyState() {
      return replied;
    },
    get replyContent() {
      return followUpContents[followUpContents.length - 1] ?? null;
    },
    get followUpContents() {
      return [...followUpContents];
    },
    ...overrides,
  } as any;
}

beforeEach(() => {
  __resetAttendanceVoteWorkerForTests();
});

test('acknowledges and enqueues a successful attendance button vote', async () => {
  const interaction = createButtonInteraction();
  setupAttendanceVoteJobMocks();

  const handled = await handleAttendanceInteraction(interaction);

  assert.equal(handled, true);
  assert.equal(interaction.deferredState, true);
  assert.equal(interaction.replyState, true);
  assert.equal(interaction.replyContent, 'Đã nhận lựa chọn: Tham gia. Đang cập nhật điểm danh.');
});

test('returns an error follow-up when enqueue rejects because session is invalid', async () => {
  const interaction = createButtonInteraction();
  setupAttendanceVoteJobMocks({ sessionRecord: null });

  const handled = await handleAttendanceInteraction(interaction);

  assert.equal(handled, true);
  assert.equal(interaction.deferredState, true);
  assert.equal(interaction.replyState, true);
  assert.match(interaction.replyContent ?? '', /không tồn tại hoặc không thuộc server Discord hiện tại/i);
});

test('stops processing safely when deferUpdate fails with unknown interaction', async () => {
  const interaction = createButtonInteraction({
    deferUpdate: async () => {
      const error = new Error('Unknown interaction') as Error & { code?: number };
      error.code = 10062;
      throw error;
    },
  });
  let jobUpsertCalled = false;
  setupAttendanceVoteJobMocks({
    upsertImpl: async () => {
      jobUpsertCalled = true;
      return createQueueJob();
    },
  });

  const handled = await handleAttendanceInteraction(interaction);

  assert.equal(handled, true);
  assert.equal(jobUpsertCalled, false);
  assert.equal(interaction.replyState, false);
});

test('returns an error follow-up when enqueue throws after acknowledge', async () => {
  const interaction = createButtonInteraction();
  setupAttendanceVoteJobMocks({
    upsertImpl: async () => {
      throw new Error('queue failed');
    },
  });

  const handled = await handleAttendanceInteraction(interaction);

  assert.equal(handled, true);
  assert.equal(interaction.deferredState, true);
  assert.equal(interaction.replyContent, 'Không thể xếp hàng xử lý điểm danh lúc này. Vui lòng thử lại sau.');
});

test('keeps request successful even when success follow-up fails', async () => {
  const interaction = createButtonInteraction({
    followUp: async () => {
      throw new Error('follow-up failed');
    },
  });
  setupAttendanceVoteJobMocks();

  const handled = await handleAttendanceInteraction(interaction);

  assert.equal(handled, true);
  assert.equal(interaction.deferredState, true);
  assert.equal(interaction.replyState, false);
});
