import { API_BASE, requestJson } from './apiBase.ts';
import type { AppStateResponse } from './apiTypes.ts';

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

export async function getGvgParticipationSessions(limit = 20) {
  return requestJson<{ sessions: GvgParticipationSession[] }>(`${API_BASE}/api/gvg-participation/sessions?limit=${limit}`, { credentials: 'include' });
}

export async function finalizeGvgParticipationSession(input: { battleDate: string; battleCount: number; participations: Array<{ memberId: string; battleNumbers: number[] }>; note?: string | null }) {
  return requestJson<AppStateResponse & { gvgParticipationSession: GvgParticipationSession }>(`${API_BASE}/api/gvg-participation/sessions/finalize`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(input),
  });
}
