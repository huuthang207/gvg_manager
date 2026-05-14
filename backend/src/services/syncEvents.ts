type SyncEvent = {
  type: 'guild_synced';
  guildId: string;
  discordGuildId: string;
  at: string;
};

type Subscriber = {
  id: string;
  userId: string;
  send: (event: SyncEvent) => void;
};

const subscribers = new Map<string, Subscriber>();

export function subscribeSyncEvents(userId: string, send: (event: SyncEvent) => void) {
  const id = `${userId}:${Date.now()}:${Math.random().toString(36).slice(2)}`;
  subscribers.set(id, { id, userId, send });
  console.log(`[SSE] Subscriber connected: user=${userId}, total=${subscribers.size}`);

  return () => {
    subscribers.delete(id);
    console.log(`[SSE] Subscriber disconnected: user=${userId}, total=${subscribers.size}`);
  };
}

export function publishGuildSyncedEvent(payload: { guildId: string; discordGuildId: string }) {
  const event: SyncEvent = {
    type: 'guild_synced',
    guildId: payload.guildId,
    discordGuildId: payload.discordGuildId,
    at: new Date().toISOString(),
  };

  console.log(`[SSE] Publishing guild_synced: guild=${payload.guildId}, subscribers=${subscribers.size}`);

  subscribers.forEach(subscriber => {
    try {
      subscriber.send(event);
    } catch {
      subscribers.delete(subscriber.id);
    }
  });
}
