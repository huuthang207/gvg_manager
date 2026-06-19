import { test } from 'node:test';
import assert from 'node:assert/strict';
import { prisma } from './db.js';
import { handleAttendanceInteraction } from './botAttendance.js';
import { setAttendanceDiscordClient } from './services/attendanceDiscordService.js';

const now = new Date('2026-05-17T12:00:00.000Z');

function mockPrisma(model: keyof typeof prisma, methods: Record<string, unknown>) {
  const target = prisma[model] as unknown as Record<string, unknown>;
  Object.entries(methods).forEach(([name, fn]) => {
    target[name] = fn;
  });
}

function createButtonInteraction(overrides: Record<string, unknown> = {}) {
  let deferred = false;
  let replied = false;
  let replyContent: string | null = null;

  const interaction: Record<string, unknown> = {
    customId: 'attendance:GO:session-1',
    guildId: '123456789012345678',
    user: { id: '345678901234567890' },
    message: { id: '456789012345678901' },
    deferred: false,
    replied: false,
    isChatInputCommand: () => false,
    isButton: () => true,
    deferReply: async () => {
      deferred = true;
      interaction.deferred = true;
    },
    editReply: async ({ content }: { content: string }) => {
      replied = true;
      replyContent = content;
      interaction.replied = true;
    },
    reply: async ({ content }: { content: string }) => {
      replied = true;
      replyContent = content;
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
      return replyContent;
    },
    ...overrides,
  } as any;
}

test('acknowledges a successful attendance button vote even when background refresh later fails', async () => {
  const interaction = createButtonInteraction();
  mockPrisma('guild', {
    findUnique: async () => ({ id: 'guild-1', discordGuildId: interaction.guildId }),
  });
  mockPrisma('attendanceSession', {
    findFirst: async () => ({
      id: 'session-1',
      guildId: 'guild-1',
      discordChannelId: '234567890123456789',
      discordMessageId: interaction.message.id,
    }),
    update: async () => ({
      id: 'session-1',
      guildId: 'guild-1',
      discordChannelId: '234567890123456789',
      discordMessageId: interaction.message.id,
    }),
    findUnique: async () => ({
      id: 'session-1',
      guildId: 'guild-1',
      status: 'OPEN',
      headerText: null,
      discordChannelId: '234567890123456789',
      discordMessageId: interaction.message.id,
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

  setAttendanceDiscordClient({
    channels: {
      fetch: async () => ({
        isTextBased: () => true,
        messages: {
          fetch: async () => ({
            edit: async () => {
              throw new Error('refresh failed');
            },
          }),
        },
      }),
    },
  } as any);

  const handled = await handleAttendanceInteraction(interaction);

  assert.equal(handled, true);
  assert.equal(interaction.replyState, true);
  assert.equal(interaction.replyContent, 'Đã ghi nhận lựa chọn: Tham gia.');
});

test('returns an error reply when the persisted attendance vote is rejected', async () => {
  const interaction = createButtonInteraction({ user: { id: '999999999999999999' } });
  mockPrisma('guild', {
    findUnique: async () => ({ id: 'guild-1', discordGuildId: interaction.guildId }),
  });
  mockPrisma('attendanceSession', {
    findFirst: async () => ({
      id: 'session-1',
      guildId: 'guild-1',
      discordChannelId: '234567890123456789',
      discordMessageId: interaction.message.id,
    }),
  });
  mockPrisma('member', {
    findUnique: async () => null,
  });

  const handled = await handleAttendanceInteraction(interaction);

  assert.equal(handled, true);
  assert.equal(interaction.replyState, true);
  assert.match(interaction.replyContent ?? '', /chưa được import hoặc đồng bộ/i);
});
