import { API_BASE, requestJson, requestVoid } from './apiBase.ts';
import { DiscordUser } from './apiTypes.ts';

export function loginWithDiscord(): void {
  window.location.href = `${API_BASE}/api/discord/oauth/authorize`;
}

export async function checkAuthStatus(): Promise<{ authenticated: boolean; authorized?: boolean; blockedReason?: string | null; expiresAt?: number; user?: DiscordUser | null }> {
  return requestJson(`${API_BASE}/api/discord/auth/status`, { credentials: 'include' });
}

export async function logoutDiscord(): Promise<void> {
  await requestVoid(`${API_BASE}/api/discord/session`, { method: 'DELETE', credentials: 'include' });
}

export async function getBotInviteUrl(): Promise<string> {
  const data = await requestJson<{ inviteUrl: string }>(`${API_BASE}/api/discord/bot/invite`, { credentials: 'include' });
  return data.inviteUrl;
}
