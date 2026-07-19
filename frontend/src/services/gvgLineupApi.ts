import { API_BASE, requestJson } from './apiBase.ts';
import type { GvgLineup } from './apiTypes.ts';

export type GvgLineupSavePayload = {
  divisions: Array<{
    id?: string;
    squads: Array<{
      squadNumber: number;
      memberIds: Array<string | null>;
    }>;
  }>;
};

export function getGvgLineup() {
  return requestJson<GvgLineup>(`${API_BASE}/api/gvg-lineup`, { credentials: 'include' });
}

export function saveGvgLineup(payload: GvgLineupSavePayload) {
  return requestJson<GvgLineup>(`${API_BASE}/api/gvg-lineup`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(payload),
  });
}

export function clearGvgLineupSquad(squadNumber: number) {
  return requestJson<GvgLineup>(`${API_BASE}/api/gvg-lineup/squads/${squadNumber}/clear`, {
    method: 'POST',
    credentials: 'include',
  });
}
