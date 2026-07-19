import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} from 'discord.js';
import type { AttendanceType } from '@prisma/client';
import type { AttendanceRenderOptions } from './attendanceRenderService.js';
import {
  attachAttendanceMessage,
  getAttendanceRenderPayload,
  markAttendanceRendered,
} from './attendanceService.js';
import { fetchDiscordChannel, setDiscordClient } from './discordClientService.js';

const ATTENDANCE_BUTTON_PREFIX = 'attendance';
const attendanceRefreshDebugEnabled = process.env.DISCORD_ATTENDANCE_DEBUG === 'true' || process.env.DISCORD_REALTIME_DEBUG === 'true';
const attendanceRefreshTimers = new Map<string, ReturnType<typeof setTimeout>>();
const attendanceRefreshRunning = new Set<string>();
const attendanceRefreshPending = new Map<string, {
  type: AttendanceType;
  channelId: string | null;
  messageId: string | null;
  closed: boolean;
  queuedAt: number;
  reason: 'vote' | 'close' | 'manual_refresh' | 'unknown';
  interactionId: string | null;
}>();

export const setAttendanceDiscordClient = setDiscordClient;

function getAttendanceRefreshDebounceMs() {
  const parsed = Number(process.env.DISCORD_ATTENDANCE_REFRESH_DEBOUNCE_MS ?? 400);
  return Number.isFinite(parsed) ? Math.max(0, parsed) : 400;
}

function getRefreshKey(type: AttendanceType, sessionId: string) {
  return `${type}:${sessionId}`;
}

function getSessionIdFromRefreshKey(key: string) {
  return key.slice(key.indexOf(':') + 1);
}

function logAttendanceRefresh(message: string, details?: Record<string, unknown>) {
  if (!attendanceRefreshDebugEnabled) return;
  if (details) {
    console.log(`[Attendance Refresh] ${message}`, details);
    return;
  }
  console.log(`[Attendance Refresh] ${message}`);
}

export function buildAttendanceButtons(sessionId: string, type: AttendanceType = 'GVG', disabled = false) {
  return new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId(`${ATTENDANCE_BUTTON_PREFIX}:${type}:GO:${sessionId}`)
      .setLabel('Tham gia')
      .setStyle(ButtonStyle.Success)
      .setDisabled(disabled),
    new ButtonBuilder()
      .setCustomId(`${ATTENDANCE_BUTTON_PREFIX}:${type}:NOGO:${sessionId}`)
      .setLabel('Không tham gia')
      .setStyle(ButtonStyle.Danger)
      .setDisabled(disabled),
  );
}

export function parseAttendanceButtonCustomId(customId: string): { type: AttendanceType; choice: 'GO' | 'NOGO'; sessionId: string } | null {
  const parts = customId.split(':');
  if (parts[0] !== ATTENDANCE_BUTTON_PREFIX) return null;

  if (parts.length === 3) {
    const [, choice, sessionId] = parts;
    if ((choice !== 'GO' && choice !== 'NOGO') || !sessionId) return null;
    return { type: 'GVG', choice, sessionId };
  }

  const [, type, choice, sessionId] = parts;
  if ((type !== 'GVG' && type !== 'SCRIM') || (choice !== 'GO' && choice !== 'NOGO') || !sessionId) return null;
  return { type, choice, sessionId };
}

export async function sendAttendanceDiscordMessage(sessionId: string, channelId: string | null, type: AttendanceType = 'GVG') {
  if (!channelId) return false;

  const renderStartedAt = Date.now();
  const renderResult = await getAttendanceRenderPayload(sessionId);
  if (renderResult.status !== 200) return false;

  const channel = await fetchDiscordChannel(channelId);
  if (!channel || !channel.isTextBased() || !('send' in channel)) return false;

  const message = await channel.send({
    content: renderResult.body.content,
    components: [buildAttendanceButtons(sessionId, type)],
  });
  await attachAttendanceMessage({ sessionId, discordMessageId: message.id });
  logAttendanceRefresh('Sent attendance message', {
    sessionId,
    type,
    channelId,
    messageId: message.id,
    elapsedMs: Date.now() - renderStartedAt,
  });
  return true;
}

export async function editAttendanceDiscordMessage(
  sessionId: string,
  channelId: string | null,
  messageId: string | null,
  closed = false,
  type: AttendanceType = 'GVG',
  renderOptions?: AttendanceRenderOptions,
) {
  if (!channelId || !messageId) return false;

  const refreshStartedAt = Date.now();
  const renderStartedAt = Date.now();
  const renderResult = await getAttendanceRenderPayload(sessionId, renderOptions);
  if (renderResult.status !== 200) return false;

  const channelFetchStartedAt = Date.now();
  const channel = await fetchDiscordChannel(channelId);
  if (!channel || !channel.isTextBased()) return false;

  const messageFetchStartedAt = Date.now();
  const message = await channel.messages.fetch(messageId).catch(() => null);
  if (!message) return false;

  const editStartedAt = Date.now();
  await message.edit({
    content: renderResult.body.content,
    components: [buildAttendanceButtons(sessionId, type, closed)],
  });
  await markAttendanceRendered(sessionId);

  logAttendanceRefresh('Edited attendance message', {
    sessionId,
    type,
    channelId,
    messageId,
    closed,
    renderMs: channelFetchStartedAt - renderStartedAt,
    channelFetchMs: messageFetchStartedAt - channelFetchStartedAt,
    messageFetchMs: editStartedAt - messageFetchStartedAt,
    messageEditMs: Date.now() - editStartedAt,
    totalMs: Date.now() - refreshStartedAt,
    contentLength: renderResult.body.content.length,
  });

  return true;
}

async function runQueuedAttendanceDiscordRefresh(key: string) {
  if (attendanceRefreshRunning.has(key)) return;

  const pending = attendanceRefreshPending.get(key);
  if (!pending) return;

  attendanceRefreshPending.delete(key);
  attendanceRefreshRunning.add(key);

  const sessionId = getSessionIdFromRefreshKey(key);
  try {
    const refreshed = await editAttendanceDiscordMessage(sessionId, pending.channelId, pending.messageId, pending.closed, pending.type);
    logAttendanceRefresh('Completed queued refresh', {
      key,
      sessionId,
      type: pending.type,
      refreshed,
      reason: pending.reason,
      interactionId: pending.interactionId,
      queueWaitMs: Date.now() - pending.queuedAt,
    });
  } catch (err) {
    logAttendanceRefresh('Queued refresh failed', {
      key,
      sessionId,
      type: pending.type,
      reason: pending.reason,
      interactionId: pending.interactionId,
      error: err instanceof Error ? err.message : String(err),
    });
    throw err;
  } finally {
    attendanceRefreshRunning.delete(key);
    const nextPending = attendanceRefreshPending.get(key);
    if (nextPending) {
      logAttendanceRefresh('Scheduling pending rerun', {
        key,
        sessionId,
        type: nextPending.type,
        reason: nextPending.reason,
        interactionId: nextPending.interactionId,
      });
      queueAttendanceDiscordMessageRefresh({
        sessionId,
        type: nextPending.type,
        discordChannelId: nextPending.channelId,
        discordMessageId: nextPending.messageId,
        closed: nextPending.closed,
        reason: nextPending.reason,
        interactionId: nextPending.interactionId,
        delayMs: 0,
      });
    }
  }
}

export function queueAttendanceDiscordMessageRefresh(input: {
  sessionId: string;
  type?: AttendanceType;
  discordChannelId: string | null;
  discordMessageId: string | null;
  closed?: boolean;
  reason?: 'vote' | 'close' | 'manual_refresh' | 'unknown';
  interactionId?: string | null;
  delayMs?: number;
}) {
  if (!input.discordChannelId || !input.discordMessageId) return false;

  const type = input.type ?? 'GVG';
  const key = getRefreshKey(type, input.sessionId);
  const queuedAt = Date.now();
  const pending = {
    type,
    channelId: input.discordChannelId,
    messageId: input.discordMessageId,
    closed: input.closed ?? false,
    queuedAt,
    reason: input.reason ?? 'unknown' as const,
    interactionId: input.interactionId ?? null,
  };
  attendanceRefreshPending.set(key, pending);

  if (attendanceRefreshRunning.has(key)) {
    logAttendanceRefresh('Coalesced refresh while active', {
      key,
      sessionId: input.sessionId,
      type,
      closed: pending.closed,
      reason: pending.reason,
      interactionId: pending.interactionId,
      queuedAt,
    });
    return true;
  }

  const currentTimer = attendanceRefreshTimers.get(key);
  if (currentTimer) clearTimeout(currentTimer);

  const delayMs = Math.max(0, input.delayMs ?? getAttendanceRefreshDebounceMs());
  const timer = setTimeout(() => {
    attendanceRefreshTimers.delete(key);
    void runQueuedAttendanceDiscordRefresh(key).catch(err => {
      console.warn('[Attendance Refresh] Queued refresh failed:', err instanceof Error ? err.message : err);
    });
  }, delayMs);

  attendanceRefreshTimers.set(key, timer);
  logAttendanceRefresh('Queued attendance refresh', {
    key,
    sessionId: input.sessionId,
    type,
    closed: pending.closed,
    reason: pending.reason,
    interactionId: pending.interactionId,
    delayMs,
    queuedAt,
    replacedExistingTimer: Boolean(currentTimer),
  });
  return true;
}
