import { API_BASE, requestJson } from './apiBase.ts';
import type { GvgLineup } from './apiTypes.ts';

function lineupRequest(path: string, options: RequestInit = {}) {
  return requestJson<GvgLineup>(`${API_BASE}/api/gvg-lineup${path}`, { credentials: 'include', ...options });
}

export function getGvgLineup() {
  return lineupRequest('');
}

export function createGvgLineupDivision() {
  return lineupRequest('/divisions', { method: 'POST' });
}

export function deleteGvgLineupDivision(divisionId: string) {
  return lineupRequest(`/divisions/${divisionId}`, { method: 'DELETE' });
}

export function updateGvgLineupDivisionNote(divisionId: string, note: string | null) {
  return lineupRequest(`/divisions/${divisionId}/note`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ note }) });
}

export function createGvgLineupSquad(divisionId: string) {
  return lineupRequest(`/divisions/${divisionId}/squads`, { method: 'POST' });
}

export function deleteGvgLineupSquad(squadId: string) {
  return lineupRequest(`/squads/${squadId}`, { method: 'DELETE' });
}

export function moveGvgLineupSquad(squadId: string, divisionId: string) {
  return lineupRequest(`/squads/${squadId}/move`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ divisionId }) });
}

export function reorderGvgLineupSquads(divisionId: string, squadIds: string[]) {
  return lineupRequest(`/divisions/${divisionId}/squads/reorder`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ squadIds }) });
}

export function updateGvgLineupSquadSlots(squadId: string, memberIds: Array<string | null>) {
  return lineupRequest(`/squads/${squadId}/slots`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ memberIds }) });
}

export function clearGvgLineupSquad(squadId: string) {
  return lineupRequest(`/squads/${squadId}/clear`, { method: 'POST' });
}

export function updateGvgLineupSquadName(squadNumber: number, name: string) {
  return lineupRequest(`/squads/${squadNumber}/name`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name }) });
}
