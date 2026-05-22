import { API_BASE, requestJson } from './apiBase.ts';
import type { AppStateResponse } from './apiTypes.ts';
import type { AttendanceSession } from '../shared/types/auth.ts';

export async function updateAttendanceChannel(discordChannelId: string): Promise<AppStateResponse> {
  return requestJson(`${API_BASE}/api/attendance/config/channel`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ discordChannelId }),
  });
}

export async function openAttendanceSession(headerText: string): Promise<AppStateResponse> {
  return requestJson(`${API_BASE}/api/attendance/sessions/open`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ headerText }),
  });
}

export async function closeActiveAttendanceSession(): Promise<AppStateResponse> {
  return requestJson(`${API_BASE}/api/attendance/sessions/active/close`, {
    method: 'POST',
    credentials: 'include',
  });
}

export async function refreshActiveAttendanceSession(): Promise<AppStateResponse> {
  return requestJson(`${API_BASE}/api/attendance/sessions/active/refresh`, {
    method: 'POST',
    credentials: 'include',
  });
}

export async function getAttendanceHistory(limit = 20, offset = 0): Promise<{ sessions: AttendanceSession[]; hasMore?: boolean; nextOffset?: number }> {
  return requestJson(`${API_BASE}/api/attendance/history?limit=${encodeURIComponent(String(limit))}&offset=${encodeURIComponent(String(offset))}`, {
    credentials: 'include',
  });
}

export async function getAttendanceSession(sessionId: string): Promise<{ session: AttendanceSession }> {
  return requestJson(`${API_BASE}/api/attendance/history/${encodeURIComponent(sessionId)}`, {
    credentials: 'include',
  });
}

export async function deleteAttendanceHistorySession(sessionId: string): Promise<{ success: boolean }> {
  return requestJson(`${API_BASE}/api/attendance/history/${encodeURIComponent(sessionId)}`, {
    method: 'DELETE',
    credentials: 'include',
  });
}
