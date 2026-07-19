import { API_BASE, requestJson } from './apiBase.ts';
import type { AppStateResponse, ImportResponse } from './apiTypes.ts';
import type { ClassType } from '../types.ts';

export async function importDiscordMembers(guildId: string, options?: { persist?: boolean; classRoleMap?: Record<string, string>; requiredRoles?: string[]; selectedMemberIds?: string[] }): Promise<ImportResponse> {
  return requestJson(`${API_BASE}/api/discord/import`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include', body: JSON.stringify({ guildId, ...options }),
  });
}

export async function updateMemberIngameName(memberId: string, ingameName: string): Promise<AppStateResponse> {
  return requestJson(`${API_BASE}/api/members/${memberId}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, credentials: 'include', body: JSON.stringify({ ingameName }) });
}

export async function updateMemberClassRole(memberId: string, classType: ClassType): Promise<AppStateResponse> {
  return requestJson(`${API_BASE}/api/members/${memberId}/class-role`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, credentials: 'include', body: JSON.stringify({ classType }) });
}

export async function updateMyIngameName(ingameName: string): Promise<AppStateResponse> {
  return requestJson(`${API_BASE}/api/members/me/ingame-name`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, credentials: 'include', body: JSON.stringify({ ingameName }) });
}

export async function deleteMember(memberId: string): Promise<AppStateResponse> {
  return requestJson(`${API_BASE}/api/members/${memberId}`, { method: 'DELETE', credentials: 'include' });
}

export async function deleteInactiveMember(memberId: string): Promise<AppStateResponse> {
  return requestJson(`${API_BASE}/api/members/${memberId}/database`, { method: 'DELETE', credentials: 'include' });
}

export async function deleteInactiveMembers(): Promise<AppStateResponse> {
  return requestJson(`${API_BASE}/api/members/inactive/database`, { method: 'DELETE', credentials: 'include' });
}

export async function syncDiscordMembers(): Promise<AppStateResponse> {
  return requestJson(`${API_BASE}/api/discord/sync`, { method: 'POST', credentials: 'include' });
}

export async function fetchDiscordRoles(guildId: string): Promise<ImportResponse['roles']> {
  return (await requestJson<{ roles: ImportResponse['roles'] }>(`${API_BASE}/api/discord/roles/${guildId}`)).roles;
}

export async function fetchCurrentDiscordRoles(): Promise<ImportResponse['roles']> {
  return (await requestJson<{ roles: ImportResponse['roles'] }>(`${API_BASE}/api/discord/roles/current`, { credentials: 'include' })).roles;
}
