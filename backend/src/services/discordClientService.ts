import type { Client } from 'discord.js';

let discordClient: Pick<Client, 'channels'> | null = null;

export function setDiscordClient(client: Pick<Client, 'channels'>) {
  discordClient = client;
}

export async function fetchDiscordChannel(channelId: string | null) {
  if (!discordClient || !channelId) return null;

  return discordClient.channels.fetch(channelId).catch(() => null);
}

export async function fetchDiscordChannelName(channelId: string | null) {
  const channel = await fetchDiscordChannel(channelId);
  return channel && 'name' in channel && typeof channel.name === 'string' ? channel.name : null;
}
