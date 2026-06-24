import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} from 'discord.js';
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

function logAttendanceRefresh(message: string, details?: Record<string, unknown>) {
  if (!attendanceRefreshDebugEnabled) return;
  if (details) {
    console.log(`[Attendance Refresh] ${message}`, details);
    return;
  }
  console.log(`[Attendance Refresh] ${message}`);
}

export function buildAttendanceButtons(sessionId: string, disabled = false) {
  return new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId(`${ATTENDANCE_BUTTON_PREFIX}:GO:${sessionId}`)
      .setLabel('Tham gia')
      .setStyle(ButtonStyle.Success)
      .setDisabled(disabled),
    new ButtonBuilder()
      .setCustomId(`${ATTENDANCE_BUTTON_PREFIX}:NOGO:${sessionId}`)
      .setLabel('Không tham gia')
      .setStyle(ButtonStyle.Danger)
      .setDisabled(disabled),
  );
}

export function parseAttendanceButtonCustomId(customId: string) {
  const [prefix, choice, sessionId] = customId.split(':');
  if (prefix !== ATTENDANCE_BUTTON_PREFIX) return null;
  if (choice !== 'GO' && choice !== 'NOGO') return null;
  if (!sessionId) return null;
  return { choice, sessionId };
}

export async function sendAttendanceDiscordMessage(sessionId: string, channelId: string | null) {
  if (!channelId) return false;

  const renderStartedAt = Date.now();
  const renderResult = await getAttendanceRenderPayload(sessionId);
  if (renderResult.status !== 200) return false;

  const channel = await fetchDiscordChannel(channelId);
  if (!channel || !channel.isTextBased() || !('send' in channel)) return false;

  const message = await channel.send({
    content: renderResult.body.content,
    components: [buildAttendanceButtons(sessionId)],
  });
  await attachAttendanceMessage({ sessionId, discordMessageId: message.id });
  logAttendanceRefresh('Sent attendance message', {
    sessionId,
    channelId,
    messageId: message.id,
    elapsedMs: Date.now() - renderStartedAt,
  });
  return true;
}

export async function editAttendanceDiscordMessage(sessionId: string, channelId: string | null, messageId: string | null, closed = false) {
  if (!channelId || !messageId) return false;

  const refreshStartedAt = Date.now();
  const renderStartedAt = Date.now();
  const renderResult = await getAttendanceRenderPayload(sessionId);
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
    components: [buildAttendanceButtons(sessionId, closed)],
  });
  await markAttendanceRendered(sessionId);

  logAttendanceRefresh('Edited attendance message', {
    sessionId,
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

async function runQueuedAttendanceDiscordRefresh(sessionId: string) {
  if (attendanceRefreshRunning.has(sessionId)) return;

  const pending = attendanceRefreshPending.get(sessionId);
  if (!pending) return;

  attendanceRefreshPending.delete(sessionId);
  attendanceRefreshRunning.add(sessionId);

  try {
    const refreshed = await editAttendanceDiscordMessage(sessionId, pending.channelId, pending.messageId, pending.closed);
    logAttendanceRefresh('Completed queued refresh', {
      sessionId,
      refreshed,
      reason: pending.reason,
      interactionId: pending.interactionId,
      queueWaitMs: Date.now() - pending.queuedAt,
    });
  } catch (err) {
    logAttendanceRefresh('Queued refresh failed', {
      sessionId,
      reason: pending.reason,
      interactionId: pending.interactionId,
      error: err instanceof Error ? err.message : String(err),
    });
    throw err;
  } finally {
    attendanceRefreshRunning.delete(sessionId);
    if (attendanceRefreshPending.has(sessionId)) {
      logAttendanceRefresh('Scheduling pending rerun', {
        sessionId,
        reason: attendanceRefreshPending.get(sessionId)?.reason ?? 'unknown',
        interactionId: attendanceRefreshPending.get(sessionId)?.interactionId ?? null,
      });
      queueAttendanceDiscordMessageRefresh({
        sessionId,
        discordChannelId: attendanceRefreshPending.get(sessionId)?.channelId ?? null,
        discordMessageId: attendanceRefreshPending.get(sessionId)?.messageId ?? null,
        closed: attendanceRefreshPending.get(sessionId)?.closed ?? false,
        reason: attendanceRefreshPending.get(sessionId)?.reason ?? 'unknown',
        interactionId: attendanceRefreshPending.get(sessionId)?.interactionId ?? null,
        delayMs: 0,
      });
    }
  }
}

export function queueAttendanceDiscordMessageRefresh(input: {
  sessionId: string;
  discordChannelId: string | null;
  discordMessageId: string | null;
  closed?: boolean;
  reason?: 'vote' | 'close' | 'manual_refresh' | 'unknown';
  interactionId?: string | null;
  delayMs?: number;
}) {
  if (!input.discordChannelId || !input.discordMessageId) return false;

  const queuedAt = Date.now();
  attendanceRefreshPending.set(input.sessionId, {
    channelId: input.discordChannelId,
    messageId: input.discordMessageId,
    closed: input.closed ?? false,
    queuedAt,
    reason: input.reason ?? 'unknown',
    interactionId: input.interactionId ?? null,
  });

  if (attendanceRefreshRunning.has(input.sessionId)) {
    logAttendanceRefresh('Coalesced refresh while active', {
      sessionId: input.sessionId,
      closed: input.closed ?? false,
      reason: input.reason ?? 'unknown',
      interactionId: input.interactionId ?? null,
      queuedAt,
    });
    return true;
  }

  const currentTimer = attendanceRefreshTimers.get(input.sessionId);
  if (currentTimer) {
    clearTimeout(currentTimer);
  }

  const delayMs = Math.max(0, input.delayMs ?? getAttendanceRefreshDebounceMs());
  const timer = setTimeout(() => {
    attendanceRefreshTimers.delete(input.sessionId);
    void runQueuedAttendanceDiscordRefresh(input.sessionId).catch(err => {
      console.warn('[Attendance Refresh] Queued refresh failed:', err instanceof Error ? err.message : err);
    });
  }, delayMs);

  attendanceRefreshTimers.set(input.sessionId, timer);
  logAttendanceRefresh('Queued attendance refresh', {
    sessionId: input.sessionId,
    closed: input.closed ?? false,
    reason: input.reason ?? 'unknown',
    interactionId: input.interactionId ?? null,
    delayMs,
    queuedAt,
    replacedExistingTimer: Boolean(currentTimer),
  });
  return true;
}
