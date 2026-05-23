import type { IncomingMessage } from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import { getSession } from '../session.js';

const realtimeDebugEnabled = process.env.DISCORD_REALTIME_DEBUG === 'true';

function logRealtime(message: string) {
  if (!realtimeDebugEnabled) return;
  console.log(message);
}

type ClientMessage =
  | { type: 'subscribe_guild'; guildId: string };

export type GuildAppStateChangeReason =
  | 'member_updated'
  | 'member_removed'
  | 'access_updated'
  | 'settings_updated'
  | 'lineup_updated'
  | 'lineup_lock_changed'
  | 'attendance_updated'
  | 'snapshot_saved'
  | 'snapshot_restored'
  | 'snapshot_deleted';

type ServerMessage =
  | { type: 'subscribed'; guildId: string }
  | {
    type: 'guild_app_state_changed';
    guildId: string;
    reason: GuildAppStateChangeReason;
    updatedAt: string;
  }
  | {
    type: 'guild_members_patch';
    guildId: string;
    discordGuildId: string;
    lastSyncedAt: string | null;
    members: unknown[];
  }
  | {
    type: 'guild_members_delta';
    guildId: string;
    discordGuildId: string;
    lastSyncedAt: string | null;
    upsertMembers: unknown[];
    removedMemberIds: string[];
  };

export type GuildMembersDeltaPayload = {
  guildId: string;
  discordGuildId: string;
  lastSyncedAt: string | null;
  upsertMembers: unknown[];
  removedMemberIds: string[];
};

export type GuildMembersPatchPayload = {
  guildId: string;
  discordGuildId: string;
  lastSyncedAt: string | null;
  members: unknown[];
};

export type GuildAppStateChangedPayload = {
  guildId: string;
  reason: GuildAppStateChangeReason;
};

type SocketMeta = {
  userId: string;
  guildId: string | null;
};

const socketMeta = new Map<WebSocket, SocketMeta>();

function parseSessionIdFromCookie(rawCookie: string | undefined) {
  if (!rawCookie) return null;
  const parts = rawCookie.split(';').map(part => part.trim());
  const sessionPart = parts.find(part => part.startsWith('session_id='));
  if (!sessionPart) return null;
  return decodeURIComponent(sessionPart.slice('session_id='.length));
}

function send(socket: WebSocket, message: ServerMessage) {
  if (socket.readyState !== WebSocket.OPEN) return;
  socket.send(JSON.stringify(message));
}

function handleMessage(socket: WebSocket, raw: Buffer) {
  let message: ClientMessage | null = null;
  try {
    message = JSON.parse(raw.toString()) as ClientMessage;
  } catch {
    return;
  }

  if (!message || message.type !== 'subscribe_guild' || !message.guildId) return;

  const meta = socketMeta.get(socket);
  if (!meta) return;

  meta.guildId = message.guildId;
  socketMeta.set(socket, meta);
  logRealtime(`[WS] Subscribed guild=${message.guildId} user=${meta.userId}`);
  send(socket, { type: 'subscribed', guildId: message.guildId });
}

async function handleConnection(socket: WebSocket, request: IncomingMessage) {
  const sessionId = parseSessionIdFromCookie(request.headers.cookie);
  if (!sessionId) {
    socket.close(1008, 'Missing session');
    return;
  }

  const session = await getSession(sessionId);
  if (!session) {
    socket.close(1008, 'Invalid session');
    return;
  }

  socketMeta.set(socket, {
    userId: session.userId,
    guildId: session.activeGuildId ?? null,
  });

  logRealtime(`[WS] Connected user=${session.userId} guild=${session.activeGuildId ?? 'none'}`);

  socket.on('message', data => {
    if (!(data instanceof Buffer)) return;
    handleMessage(socket, data);
  });

  socket.on('close', () => {
    socketMeta.delete(socket);
    logRealtime('[WS] Connection closed');
  });
}

export function attachRealtimeGateway(wss: WebSocketServer) {
  wss.on('connection', (socket: WebSocket, request: IncomingMessage) => {
    void handleConnection(socket, request);
  });
}

export function publishGuildAppStateChanged(payload: GuildAppStateChangedPayload) {
  const updatedAt = new Date().toISOString();

  socketMeta.forEach((meta, socket) => {
    if (meta.guildId !== payload.guildId) return;

    send(socket, {
      type: 'guild_app_state_changed',
      guildId: payload.guildId,
      reason: payload.reason,
      updatedAt,
    });
  });
}

export function publishGuildMembersPatch(payload: GuildMembersPatchPayload) {
  socketMeta.forEach((meta, socket) => {
    if (meta.guildId !== payload.guildId) return;

    send(socket, {
      type: 'guild_members_patch',
      guildId: payload.guildId,
      discordGuildId: payload.discordGuildId,
      lastSyncedAt: payload.lastSyncedAt,
      members: payload.members,
    });
  });
}

export function publishGuildMembersDelta(payload: GuildMembersDeltaPayload) {
  socketMeta.forEach((meta, socket) => {
    if (meta.guildId !== payload.guildId) return;

    send(socket, {
      type: 'guild_members_delta',
      guildId: payload.guildId,
      discordGuildId: payload.discordGuildId,
      lastSyncedAt: payload.lastSyncedAt,
      upsertMembers: payload.upsertMembers,
      removedMemberIds: payload.removedMemberIds,
    });
  });
}

export { realtimeDebugEnabled };
