import React from 'react';
import { API_BASE } from '../../services/apiBase.ts';
import { getAppState } from '../../services/discordApi.ts';
import type { AppStateResponse } from '../../services/apiTypes.ts';
import type { Member } from '../../types.ts';

type RealtimeReason =
  | 'member_updated'
  | 'member_removed'
  | 'access_updated'
  | 'settings_updated'
  | 'attendance_updated'
  | 'gvg_participation_updated'
  | 'gvg_lineup_updated';

type RealtimeMessage =
  | { type: 'subscribed'; guildId: string }
  | { type: 'guild_app_state_changed'; guildId: string; reason: RealtimeReason; updatedAt: string }
  | { type: 'guild_members_patch'; guildId: string; discordGuildId: string; lastSyncedAt: string | null; members: Member[] }
  | { type: 'guild_members_delta'; guildId: string; discordGuildId: string; lastSyncedAt: string | null; upsertMembers: Member[]; removedMemberIds: string[] };

interface UseGuildRealtimeParams {
  isAuthenticated: boolean;
  isAuthorized: boolean;
  currentGuild: AppStateResponse['guild'] | null;
  lastSyncedAt: string | null;
  applyAppState: (state: Awaited<ReturnType<typeof getAppState>>) => Promise<void>;
  setIsAuthorized: React.Dispatch<React.SetStateAction<boolean>>;
  setBlockedReason: React.Dispatch<React.SetStateAction<string | null>>;
  setLastSyncedAt: React.Dispatch<React.SetStateAction<string | null>>;
  mergeMemberDelta: (upsertMembers: Member[], removedMemberIds: string[]) => void;
  replaceMemberPool: (members: Member[]) => void;
  refreshGvgParticipationStats: () => Promise<void>;
  realtimeDebugEnabled: boolean;
}

const RECONNECT_DELAYS = [1000, 2000, 5000, 10000, 30000];
const ATTENDANCE_REALTIME_DEBOUNCE_MS = 300;

export function useGuildRealtime({ isAuthenticated, isAuthorized, currentGuild, lastSyncedAt, applyAppState, setIsAuthorized, setBlockedReason, setLastSyncedAt, mergeMemberDelta, replaceMemberPool, refreshGvgParticipationStats, realtimeDebugEnabled }: UseGuildRealtimeParams) {
  const wsRef = React.useRef<WebSocket | null>(null);
  const reconnectTimerRef = React.useRef<number | null>(null);
  const reconnectAttemptRef = React.useRef(0);
  const appStateRefreshRef = React.useRef(false);
  const pendingAttendanceRefreshRef = React.useRef(false);
  const attendanceRefreshTimerRef = React.useRef<number | null>(null);

  const logRealtime = React.useCallback((...args: unknown[]) => {
    if (realtimeDebugEnabled) console.log(...args);
  }, [realtimeDebugEnabled]);

  const clearReconnectTimer = React.useCallback(() => {
    if (reconnectTimerRef.current) window.clearTimeout(reconnectTimerRef.current);
    reconnectTimerRef.current = null;
  }, []);

  const clearAttendanceRefreshTimer = React.useCallback(() => {
    if (attendanceRefreshTimerRef.current) window.clearTimeout(attendanceRefreshTimerRef.current);
    attendanceRefreshTimerRef.current = null;
  }, []);

  const refreshAppStateFromRealtime = React.useCallback(async (reason: RealtimeReason | 'poll' = 'poll') => {
    if (appStateRefreshRef.current) {
      if (reason === 'attendance_updated') pendingAttendanceRefreshRef.current = true;
      return;
    }
    appStateRefreshRef.current = true;
    try {
      const state = await getAppState();
      await applyAppState(state);
      const hasGuildAccess = !!state.guild && (state.permissions ?? []).includes('view:guild');
      setIsAuthorized(hasGuildAccess);
      setBlockedReason(hasGuildAccess ? null : 'Bạn không còn quyền truy cập server bang.');
    } catch {
    } finally {
      appStateRefreshRef.current = false;
      if (pendingAttendanceRefreshRef.current) {
        pendingAttendanceRefreshRef.current = false;
        void refreshAppStateFromRealtime('attendance_updated');
      }
    }
  }, [applyAppState, setBlockedReason, setIsAuthorized]);

  const scheduleAttendanceRefresh = React.useCallback(() => {
    pendingAttendanceRefreshRef.current = true;
    if (attendanceRefreshTimerRef.current) return;
    attendanceRefreshTimerRef.current = window.setTimeout(() => {
      attendanceRefreshTimerRef.current = null;
      if (!pendingAttendanceRefreshRef.current) return;
      pendingAttendanceRefreshRef.current = false;
      void refreshAppStateFromRealtime('attendance_updated');
    }, ATTENDANCE_REALTIME_DEBOUNCE_MS);
  }, [refreshAppStateFromRealtime]);

  const subscribeCurrentGuild = React.useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN && currentGuild) {
      wsRef.current.send(JSON.stringify({ type: 'subscribe_guild', guildId: currentGuild.id }));
    }
  }, [currentGuild]);

  const connectWebSocket = React.useCallback(() => {
    if (!isAuthenticated || !isAuthorized || !currentGuild) return;
    const socket = new WebSocket(`${API_BASE.replace('http://', 'ws://').replace('https://', 'wss://')}/ws`);
    wsRef.current = socket;
    socket.onopen = () => {
      reconnectAttemptRef.current = 0;
      logRealtime('[WS] Connected');
      subscribeCurrentGuild();
    };
    socket.onerror = () => console.warn('[WS] Connection error');
    socket.onmessage = event => {
      try {
        const payload = JSON.parse(event.data as string) as Partial<RealtimeMessage>;
        if (payload.type === 'subscribed') return;
        const internalMatch = payload.guildId === currentGuild.id;
        const discordMatch = 'discordGuildId' in payload && payload.discordGuildId === currentGuild.discordGuildId;
        if (!internalMatch && !discordMatch) return;
        if (payload.type === 'guild_members_delta') {
          mergeMemberDelta(payload.upsertMembers || [], payload.removedMemberIds || []);
          setLastSyncedAt(payload.lastSyncedAt ?? null);
        } else if (payload.type === 'guild_members_patch' && payload.members) {
          replaceMemberPool(payload.members);
          setLastSyncedAt(payload.lastSyncedAt ?? null);
        } else if (payload.type === 'guild_app_state_changed') {
          if (payload.reason === 'attendance_updated') scheduleAttendanceRefresh();
          else void refreshAppStateFromRealtime(payload.reason ?? 'poll');
          if (payload.reason === 'gvg_participation_updated') void refreshGvgParticipationStats();
        }
      } catch {
      }
    };
    socket.onclose = () => {
      wsRef.current = null;
      if (!isAuthenticated || !isAuthorized || !currentGuild) return;
      const delay = Math.min(30000, RECONNECT_DELAYS[Math.min(reconnectAttemptRef.current++, 4)]);
      clearReconnectTimer();
      reconnectTimerRef.current = window.setTimeout(connectWebSocket, delay);
    };
  }, [clearReconnectTimer, currentGuild, isAuthenticated, isAuthorized, logRealtime, mergeMemberDelta, refreshAppStateFromRealtime, refreshGvgParticipationStats, replaceMemberPool, scheduleAttendanceRefresh, setLastSyncedAt, subscribeCurrentGuild]);

  const closeRealtimeConnection = React.useCallback(() => {
    clearReconnectTimer();
    clearAttendanceRefreshTimer();
    pendingAttendanceRefreshRef.current = false;
    wsRef.current?.close();
    wsRef.current = null;
  }, [clearAttendanceRefreshTimer, clearReconnectTimer]);

  React.useEffect(() => {
    if (isAuthenticated && isAuthorized && currentGuild) {
      connectWebSocket();
      subscribeCurrentGuild();
    } else closeRealtimeConnection();
    const timer = window.setInterval(() => {
      if (document.visibilityState === 'visible') void refreshAppStateFromRealtime();
    }, 30000);
    return () => {
      window.clearInterval(timer);
      closeRealtimeConnection();
    };
  }, [closeRealtimeConnection, connectWebSocket, currentGuild, isAuthenticated, isAuthorized, lastSyncedAt, refreshAppStateFromRealtime, subscribeCurrentGuild]);

  return { closeRealtimeConnection };
}
