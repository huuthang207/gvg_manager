import { API_BASE, requestJson } from './apiBase.ts';
import { AccessibleGuildsResponse, AppStateResponse, GuildsResponse } from './apiTypes.ts';

export async function getAccessibleGuilds(): Promise<AccessibleGuildsResponse> {
  return requestJson(`${API_BASE}/api/guilds/accessible`, { credentials: 'include' });
}

export async function setActiveGuild(guildId: string): Promise<AppStateResponse> {
  return requestJson(`${API_BASE}/api/guilds/active`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ guildId }),
  });
}

export async function getDiscordGuilds(): Promise<GuildsResponse> {
  return requestJson(`${API_BASE}/api/discord/guilds`, { credentials: 'include' });
}

export async function getAppState(): Promise<AppStateResponse> {
  return requestJson(`${API_BASE}/api/app/state`, { credentials: 'include' });
}

export async function checkHealth(): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE}/api/health`);
    return res.ok;
  } catch {
    return false;
  }
}
