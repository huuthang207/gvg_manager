import { afterEach, beforeEach, test } from 'node:test';
import assert from 'node:assert/strict';
import { prisma } from '../db.js';
import {
  queueAttendanceDiscordMessageRefresh,
  setAttendanceDiscordClient,
} from './attendanceDiscordService.js';

const now = new Date('2026-05-17T12:00:00.000Z');
const originalDebounce = process.env.DISCORD_ATTENDANCE_REFRESH_DEBOUNCE_MS;

function wait(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function createSession() {
  return {
    id: 'session-1',
    guildId: 'guild-1',
    status: 'OPEN',
    headerText: 'Bang chiến tối nay',
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
  };
}

function mockPrisma(model: keyof typeof prisma, methods: Record<string, unknown>) {
  const target = prisma[model] as unknown as Record<string, unknown>;
  Object.entries(methods).forEach(([name, fn]) => {
    target[name] = fn;
  });
}

beforeEach(() => {
  process.env.DISCORD_ATTENDANCE_REFRESH_DEBOUNCE_MS = '5';
  mockPrisma('attendanceSession', {
    findUnique: async () => createSession(),
    update: async () => createSession(),
  });
});

afterEach(async () => {
  if (originalDebounce === undefined) {
    delete process.env.DISCORD_ATTENDANCE_REFRESH_DEBOUNCE_MS;
  } else {
    process.env.DISCORD_ATTENDANCE_REFRESH_DEBOUNCE_MS = originalDebounce;
  }
  setAttendanceDiscordClient({
    channels: {
      fetch: async () => null,
    },
  } as any);
  await wait(20);
});

test('coalesces repeated refresh requests before the debounce window elapses', async () => {
  let editCount = 0;
  let renderUpdateCount = 0;

  mockPrisma('attendanceSession', {
    findUnique: async () => createSession(),
    update: async () => {
      renderUpdateCount += 1;
      return createSession();
    },
  });

  setAttendanceDiscordClient({
    channels: {
      fetch: async () => ({
        isTextBased: () => true,
        messages: {
          fetch: async () => ({
            edit: async () => {
              editCount += 1;
            },
          }),
        },
      }),
    },
  } as any);

  assert.equal(queueAttendanceDiscordMessageRefresh({
    sessionId: 'session-1',
    discordChannelId: '234567890123456789',
    discordMessageId: '456789012345678901',
  }), true);
  assert.equal(queueAttendanceDiscordMessageRefresh({
    sessionId: 'session-1',
    discordChannelId: '234567890123456789',
    discordMessageId: '456789012345678901',
  }), true);

  await wait(40);

  assert.equal(editCount, 1);
  assert.equal(renderUpdateCount, 1);
});

test('schedules exactly one follow-up refresh when a new request arrives during an active refresh', async () => {
  let editCount = 0;
  let resolveFirstEdit: (() => void) | undefined;
  const firstEditDone = new Promise<void>(resolve => {
    resolveFirstEdit = resolve;
  });

  setAttendanceDiscordClient({
    channels: {
      fetch: async () => ({
        isTextBased: () => true,
        messages: {
          fetch: async () => ({
            edit: async () => {
              editCount += 1;
              if (editCount === 1) {
                await firstEditDone;
              }
            },
          }),
        },
      }),
    },
  } as any);

  queueAttendanceDiscordMessageRefresh({
    sessionId: 'session-1',
    discordChannelId: '234567890123456789',
    discordMessageId: '456789012345678901',
  });

  await wait(15);

  queueAttendanceDiscordMessageRefresh({
    sessionId: 'session-1',
    discordChannelId: '234567890123456789',
    discordMessageId: '456789012345678901',
  });

  resolveFirstEdit?.();
  await wait(40);

  assert.equal(editCount, 2);
});

test('recovers from a failed refresh so later refresh requests can still run', async () => {
  let editCount = 0;

  setAttendanceDiscordClient({
    channels: {
      fetch: async () => ({
        isTextBased: () => true,
        messages: {
          fetch: async () => ({
            edit: async () => {
              editCount += 1;
              if (editCount === 1) {
                throw new Error('discord edit failed');
              }
            },
          }),
        },
      }),
    },
  } as any);

  queueAttendanceDiscordMessageRefresh({
    sessionId: 'session-1',
    discordChannelId: '234567890123456789',
    discordMessageId: '456789012345678901',
  });

  await wait(20);

  queueAttendanceDiscordMessageRefresh({
    sessionId: 'session-1',
    discordChannelId: '234567890123456789',
    discordMessageId: '456789012345678901',
  });

  await wait(30);

  assert.equal(editCount, 2);
});
