import { API_BASE, requestJson } from './apiBase.ts';
import { AppStateResponse } from './apiTypes.ts';

export async function updateAccessRoles(managerRoles: string[], memberRoles: string[]): Promise<AppStateResponse> {
  return requestJson(`${API_BASE}/api/discord/access-roles`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ managerRoles, memberRoles }),
  });
}

export async function resetCurrentGuildData(confirmation: string): Promise<AppStateResponse> {
  return requestJson(`${API_BASE}/api/discord/reset-current-guild-data`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ confirmation }),
  });
}

export async function updateRoleConfig(classRoleMap: Record<string, string>, requiredRoles: string[]): Promise<AppStateResponse> {
  return requestJson(`${API_BASE}/api/discord/role-config`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ classRoleMap, requiredRoles }),
  });
}
