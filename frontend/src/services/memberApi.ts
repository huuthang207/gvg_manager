import { API_BASE, requestJson } from './apiBase.ts';
import { AppStateResponse, ImportResponse } from './apiTypes.ts';
import { ClassType, Skill } from '../types.ts';

export async function importDiscordMembers(
  guildId: string,
  options?: { persist?: boolean; classRoleMap?: Record<string, string>; requiredRoles?: string[]; selectedMemberIds?: string[] }
): Promise<ImportResponse> {
  return requestJson(`${API_BASE}/api/discord/import`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ guildId, ...options }),
  });
}

export async function acknowledgeClassChange(memberId: string): Promise<AppStateResponse> {
  return requestJson(`${API_BASE}/api/members/${memberId}/class-change/ack`, { method: 'POST', credentials: 'include' });
}

export async function updateMemberIngameName(memberId: string, ingameName: string): Promise<AppStateResponse> {
  return requestJson(`${API_BASE}/api/members/${memberId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ ingameName }),
  });
}

export async function updateMemberClassRole(memberId: string, classType: ClassType): Promise<AppStateResponse> {
  return requestJson(`${API_BASE}/api/members/${memberId}/class-role`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ classType }),
  });
}

export async function updateMyIngameName(ingameName: string): Promise<AppStateResponse> {
  return requestJson(`${API_BASE}/api/members/me/ingame-name`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ ingameName }),
  });
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

export async function assignMemberSkill(memberId: string, skill: Skill): Promise<AppStateResponse> {
  return requestJson(`${API_BASE}/api/members/${memberId}/skills/${skill.id}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ skill }),
  });
}

export async function removeMemberSkill(memberId: string, skillId: string): Promise<AppStateResponse> {
  return requestJson(`${API_BASE}/api/members/${memberId}/skills/${skillId}`, { method: 'DELETE', credentials: 'include' });
}

export async function clearMemberSkills(memberIds: string[]): Promise<AppStateResponse> {
  return requestJson(`${API_BASE}/api/members/skills/clear`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ memberIds }),
  });
}

export async function syncDiscordMembers(): Promise<AppStateResponse> {
  return requestJson(`${API_BASE}/api/discord/sync`, { method: 'POST', credentials: 'include' });
}

export async function fetchDiscordRoles(guildId: string): Promise<ImportResponse['roles']> {
  const data = await requestJson<{ roles: ImportResponse['roles'] }>(`${API_BASE}/api/discord/roles/${guildId}`);
  return data.roles;
}

export async function fetchCurrentDiscordRoles(): Promise<ImportResponse['roles']> {
  const data = await requestJson<{ roles: ImportResponse['roles'] }>(`${API_BASE}/api/discord/roles/current`, { credentials: 'include' });
  return data.roles;
}
