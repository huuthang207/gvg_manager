import axios, { AxiosInstance } from 'axios';
import { config } from 'dotenv';

config();

const DISCORD_API = 'https://discord.com/api/v10';
const BOT_TOKEN = process.env.DISCORD_BOT_TOKEN!;

export interface DiscordRole {
  id: string;
  name: string;
  color: number;
  position: number;
}

export interface DiscordMember {
  id: string;
  username: string;
  global_name: string | null;
  roles: string[];
  avatar: string | null;
  joined_at: string;
  nick: string | null;
}

const discordApi: AxiosInstance = axios.create({
  baseURL: DISCORD_API,
  headers: {
    Authorization: `Bot ${BOT_TOKEN}`,
    'Content-Type': 'application/json',
  },
  timeout: 15000,
});

export async function getGuildRoles(guildId: string): Promise<DiscordRole[]> {
  const response = await discordApi.get<DiscordRole[]>(`/guilds/${guildId}/roles`);
  return response.data
    .filter(r => r.name !== '@everyone')
    .sort((a, b) => b.position - a.position);
}

// Get guild members (kept for reference, use getGuildMembersWithRoles instead)
export async function getGuildMembers(guildId: string): Promise<DiscordMember[]> {
  return (await getGuildMembersWithRoles(guildId)).members;
}

export async function removeGuildMemberRole(guildId: string, discordUserId: string, roleName: string): Promise<boolean> {
  const roles = await getGuildRoles(guildId);
  const role = roles.find(r => r.name === roleName);
  if (!role) return false;

  await discordApi.delete(`/guilds/${guildId}/members/${discordUserId}/roles/${role.id}`);
  return true;
}

export async function getGuildMembersWithRoles(guildId: string): Promise<{ members: DiscordMember[]; roles: DiscordRole[] }> {
  const roles = await getGuildRoles(guildId);
  const roleMap = new Map(roles.map(r => [r.id, r.name]));

  const members: DiscordMember[] = [];
  let after: string | undefined;

  while (true) {
    const params: Record<string, string | number> = { limit: 1000 };
    if (after) params.after = after;

    const response = await discordApi.get<any[]>(`/guilds/${guildId}/members`, { params });

    if (response.data.length === 0) break;

    for (const raw of response.data) {
      const member: DiscordMember = {
        id: raw.user.id,
        username: raw.user.username,
        global_name: raw.user.global_name ?? raw.user.username,
        roles: (raw.roles || [])
          .map((roleId: string) => roleMap.get(roleId))
          .filter(Boolean) as string[],
        avatar: raw.user.avatar ?? null,
        joined_at: raw.joined_at,
        nick: raw.nick ?? null,
      };
      members.push(member);
    }

    after = response.data[response.data.length - 1].user.id;

    if (response.data.length < 1000) break;
  }

  return { members, roles };
}

// Check if bot is in a guild by trying to access guild info
export async function isBotInGuild(guildId: string): Promise<boolean> {
  try {
    await discordApi.get(`/guilds/${guildId}`);
    return true;
  } catch (err: any) {
    if (err.response?.status === 403 || err.response?.status === 404) {
      return false;
    }
    throw err;
  }
}

// Get bot's guilds (guilds where bot is present)
export async function getBotGuilds(): Promise<{ id: string }[]> {
  const response = await discordApi.get('/users/@me/guilds');
  return response.data;
}
