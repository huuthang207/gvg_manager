import { API_BASE, requestJson } from './apiBase.ts';
import type { AppStateResponse } from './apiTypes.ts';

export type GvgParticipationStats = Record<string, number>;

export interface GvgParticipationSession {
  id: string;
  guildId: string;
  battleDate: string;
  battleCount: number;
  finalizedByDiscordUserId: string | null;
  finalizedAt: string;
  note: string | null;
  createdAt: string;
  updatedAt: string;
  entries: Array<{
    id: string;
    memberId: string;
    count: number;
    battleNumbers: number[];
    snapshotIngameName: string | null;
    snapshotClassType: string | null;
  }>;
}

export async function getGvgParticipationSessions(limit = 20, offset = 0) {
  return requestJson<{ sessions: GvgParticipationSession[]; hasMore?: boolean; nextOffset?: number | null }>(`${API_BASE}/api/gvg-participation/sessions?limit=${limit}&offset=${offset}`, { credentials: 'include' });
}

export async function getGvgParticipationStats(month: string) {
  return requestJson<{ month: string; stats: GvgParticipationStats }>(`${API_BASE}/api/gvg-participation/stats?month=${encodeURIComponent(month)}`, { credentials: 'include' });
}

export async function deleteGvgParticipationSessionsForMonth(month: string) {
  return requestJson<AppStateResponse & { gvgParticipationDeletedCount: number }>(`${API_BASE}/api/gvg-participation/sessions/month`, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ month }),
  });
}

export async function finalizeGvgParticipationSession(input: { battleDate: string; battleCount: number; participations: Array<{ memberId: string; battleNumbers: number[] }>; note?: string | null }) {
  return requestJson<AppStateResponse & { gvgParticipationSession: GvgParticipationSession }>(`${API_BASE}/api/gvg-participation/sessions/finalize`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(input),
  });
}
