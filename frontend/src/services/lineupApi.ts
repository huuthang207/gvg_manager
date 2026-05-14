import { API_BASE, requestJson, requestVoid } from './apiBase.ts';
import { AppStateResponse, LineupSnapshotDetail, LineupSnapshotSummary } from './apiTypes.ts';

export async function saveSquadLayout(groups: AppStateResponse['squadGroups']): Promise<AppStateResponse> {
  return requestJson(`${API_BASE}/api/squad-layout`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ groups }),
  });
}

export async function getLineupSnapshots(): Promise<LineupSnapshotSummary[]> {
  const data = await requestJson<{ snapshots: LineupSnapshotSummary[] }>(`${API_BASE}/api/lineup-snapshots`, { credentials: 'include' });
  return data.snapshots;
}

export async function createLineupSnapshot(name: string): Promise<LineupSnapshotDetail> {
  return requestJson(`${API_BASE}/api/lineup-snapshots`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ name }),
  });
}

export async function updateLineupSnapshot(snapshotId: string, name: string): Promise<LineupSnapshotDetail> {
  return requestJson(`${API_BASE}/api/lineup-snapshots/${snapshotId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ name }),
  });
}

export async function getLineupSnapshot(snapshotId: string): Promise<LineupSnapshotDetail> {
  return requestJson(`${API_BASE}/api/lineup-snapshots/${snapshotId}`, { credentials: 'include' });
}

export async function restoreLineupSnapshot(snapshotId: string): Promise<AppStateResponse> {
  return requestJson(`${API_BASE}/api/lineup-snapshots/${snapshotId}/restore`, { method: 'POST', credentials: 'include' });
}

export async function deleteLineupSnapshot(snapshotId: string): Promise<void> {
  await requestVoid(`${API_BASE}/api/lineup-snapshots/${snapshotId}`, { method: 'DELETE', credentials: 'include' });
}
