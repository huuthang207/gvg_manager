import { API_BASE, requestJson } from './apiBase.ts';
import type { AppStateResponse } from './apiTypes.ts';
import type { AttendanceSession, AttendanceType } from '../shared/types/auth.ts';

function typeQuery(type: AttendanceType) {
  return `type=${encodeURIComponent(type)}`;
}

export async function updateAttendanceChannel(discordChannelId: string, type: AttendanceType): Promise<AppStateResponse> {
  return requestJson(`${API_BASE}/api/attendance/config/channel`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ discordChannelId, type }),
  });
}

export async function openAttendanceSession(headerText: string, type: AttendanceType): Promise<AppStateResponse> {
  return requestJson(`${API_BASE}/api/attendance/sessions/open`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ headerText, type }),
  });
}

export async function closeActiveAttendanceSession(type: AttendanceType): Promise<AppStateResponse> {
  return requestJson(`${API_BASE}/api/attendance/sessions/active/close`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ type }),
  });
}

export async function refreshActiveAttendanceSession(type: AttendanceType): Promise<AppStateResponse> {
  return requestJson(`${API_BASE}/api/attendance/sessions/active/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ type }),
  });
}

export async function getAttendanceHistory(type: AttendanceType, limit = 20, offset = 0): Promise<{ sessions: AttendanceSession[]; hasMore?: boolean; nextOffset?: number }> {
  return requestJson(`${API_BASE}/api/attendance/history?${typeQuery(type)}&limit=${encodeURIComponent(String(limit))}&offset=${encodeURIComponent(String(offset))}`, { credentials: 'include' });
}

export async function getAttendanceSession(sessionId: string, type: AttendanceType): Promise<{ session: AttendanceSession }> {
  return requestJson(`${API_BASE}/api/attendance/history/${encodeURIComponent(sessionId)}?${typeQuery(type)}`, { credentials: 'include' });
}

export async function deleteAttendanceHistorySession(sessionId: string, type: AttendanceType): Promise<{ success: boolean }> {
  return requestJson(`${API_BASE}/api/attendance/history/${encodeURIComponent(sessionId)}?${typeQuery(type)}`, { method: 'DELETE', credentials: 'include' });
}
