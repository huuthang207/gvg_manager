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
  | 'lineup_updated'
  | 'lineup_lock_changed'
  | 'attendance_updated'
  | 'gvg_participation_updated'
  | 'snapshot_saved'
  | 'snapshot_restored'
  | 'snapshot_deleted';

type RealtimeMessage =
  | { type: 'subscribed'; guildId: string }
  | {
    type: 'guild_app_state_changed';
    guildId: string;
    reason: RealtimeReason;
    updatedAt: string;
  }
  | {
    type: 'guild_members_patch';
    guildId: string;
    discordGuildId: string;
    lastSyncedAt: string | null;
    members: Member[];
  }
  | {
    type: 'guild_members_delta';
    guildId: string;
    discordGuildId: string;
    lastSyncedAt: string | null;
    upsertMembers: Member[];
    removedMemberIds: string[];
  };

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
  refreshLineupLock: () => Promise<void>;
  refreshGvgParticipationStats: () => Promise<void>;
  refreshSnapshots: () => Promise<void>;
  realtimeDebugEnabled: boolean;
}

const RECONNECT_DELAYS = [1000, 2000, 5000, 10000, 30000];
const SNAPSHOT_REASONS = new Set<RealtimeReason>(['snapshot_saved', 'snapshot_deleted', 'snapshot_restored']);
const ATTENDANCE_REALTIME_DEBOUNCE_MS = 300;

export function useGuildRealtime({
  isAuthenticated,
  isAuthorized,
  currentGuild,
  lastSyncedAt,
  applyAppState,
  setIsAuthorized,
  setBlockedReason,
  setLastSyncedAt,
  mergeMemberDelta,
  replaceMemberPool,
  refreshLineupLock,
  refreshGvgParticipationStats,
  refreshSnapshots,
  realtimeDebugEnabled,
}: UseGuildRealtimeParams) {
  const wsRef = React.useRef<WebSocket | null>(null);
  const reconnectTimerRef = React.useRef<number | null>(null);
  const reconnectAttemptRef = React.useRef(0);
  const appStateRefreshRef = React.useRef(false);
  const pendingAttendanceRefreshRef = React.useRef(false);
  const attendanceRefreshTimerRef = React.useRef<number | null>(null);

  const logRealtime = React.useCallback((...args: unknown[]) => {
    if (!realtimeDebugEnabled) return;
    console.log(...args);
  }, [realtimeDebugEnabled]);

  const clearReconnectTimer = React.useCallback(() => {
    if (reconnectTimerRef.current) {
      window.clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = null;
    }
  }, []);

  const clearAttendanceRefreshTimer = React.useCallback(() => {
    if (attendanceRefreshTimerRef.current) {
      window.clearTimeout(attendanceRefreshTimerRef.current);
      attendanceRefreshTimerRef.current = null;
    }
  }, []);

  const refreshAppStateFromRealtime = React.useCallback(async (reason: RealtimeReason | 'poll' = 'poll') => {
    if (appStateRefreshRef.current) {
      if (reason === 'attendance_updated') {
        pendingAttendanceRefreshRef.current = true;
        logRealtime('[WS] Coalesced attendance refresh while request is in flight');
      }
      return;
    }
    appStateRefreshRef.current = true;
    try {
      logRealtime('[WS] Refreshing app state from realtime', reason);
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
        logRealtime('[WS] Running queued attendance refresh after in-flight request');
        void refreshAppStateFromRealtime('attendance_updated');
      }
    }
  }, [applyAppState, logRealtime, setBlockedReason, setIsAuthorized]);

  const scheduleAttendanceRefresh = React.useCallback(() => {
    pendingAttendanceRefreshRef.current = true;
    if (attendanceRefreshTimerRef.current) {
      logRealtime('[WS] Coalesced attendance refresh within debounce window');
      return;
    }

    attendanceRefreshTimerRef.current = window.setTimeout(() => {
      attendanceRefreshTimerRef.current = null;
      if (!pendingAttendanceRefreshRef.current) return;
      pendingAttendanceRefreshRef.current = false;
      void refreshAppStateFromRealtime('attendance_updated');
    }, ATTENDANCE_REALTIME_DEBOUNCE_MS);
    logRealtime('[WS] Scheduled attendance refresh', ATTENDANCE_REALTIME_DEBOUNCE_MS);
  }, [logRealtime, refreshAppStateFromRealtime]);

  const subscribeCurrentGuild = React.useCallback(() => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN || !currentGuild) return;
    wsRef.current.send(JSON.stringify({ type: 'subscribe_guild', guildId: currentGuild.id }));
  }, [currentGuild]);

  const connectWebSocket = React.useCallback(() => {
    if (!isAuthenticated || !isAuthorized || !currentGuild) return;
    const wsUrl = API_BASE.replace('http://', 'ws://').replace('https://', 'wss://') + '/ws';

    const socket = new WebSocket(wsUrl);
    wsRef.current = socket;

    socket.onopen = () => {
      reconnectAttemptRef.current = 0;
      logRealtime('[WS] Connected');
      subscribeCurrentGuild();
    };

    socket.onerror = () => {
      console.warn('[WS] Connection error');
    };

    socket.onmessage = event => {
      try {
        const payload = JSON.parse(event.data as string) as Partial<RealtimeMessage>;

        if (payload.type === 'subscribed') {
          logRealtime('[WS] Subscribed guild', payload.guildId);
          return;
        }

        const matchedByInternalGuildId = payload.guildId && currentGuild && payload.guildId === currentGuild.id;
        const matchedByDiscordGuildId = 'discordGuildId' in payload && payload.discordGuildId && currentGuild && payload.discordGuildId === currentGuild.discordGuildId;
        if (!matchedByInternalGuildId && !matchedByDiscordGuildId) return;

        if (payload.type === 'guild_members_delta') {
          mergeMemberDelta(payload.upsertMembers || [], payload.removedMemberIds || []);
          setLastSyncedAt(payload.lastSyncedAt ?? null);
          return;
        }

        if (payload.type === 'guild_app_state_changed') {
          if (payload.reason === 'attendance_updated') {
            scheduleAttendanceRefresh();
          } else {
            void refreshAppStateFromRealtime(payload.reason ?? 'poll');
          }
          if (payload.reason && SNAPSHOT_REASONS.has(payload.reason)) {
            void refreshSnapshots();
          }
          if (payload.reason === 'lineup_lock_changed') {
            void refreshLineupLock();
          }
          if (payload.reason === 'gvg_participation_updated') {
            void refreshGvgParticipationStats();
          }
          return;
        }

        if (payload.type === 'guild_members_patch' && payload.members) {
          replaceMemberPool(payload.members);
          setLastSyncedAt(payload.lastSyncedAt ?? null);
        }
      } catch {
      }
    };

    socket.onclose = () => {
      wsRef.current = null;
      if (!isAuthenticated || !isAuthorized || !currentGuild) return;

      const attempt = reconnectAttemptRef.current + 1;
      reconnectAttemptRef.current = attempt;
      const delay = Math.min(30000, RECONNECT_DELAYS[Math.min(attempt - 1, 4)]);
      logRealtime('[WS] Reconnecting in', delay, 'ms');

      clearReconnectTimer();
      reconnectTimerRef.current = window.setTimeout(() => {
        connectWebSocket();
      }, delay);
    };
  }, [isAuthenticated, isAuthorized, currentGuild, logRealtime, subscribeCurrentGuild, mergeMemberDelta, setLastSyncedAt, scheduleAttendanceRefresh, refreshAppStateFromRealtime, refreshSnapshots, refreshLineupLock, refreshGvgParticipationStats, replaceMemberPool, clearReconnectTimer]);

  const closeRealtimeConnection = React.useCallback(() => {
    clearReconnectTimer();
    clearAttendanceRefreshTimer();
    pendingAttendanceRefreshRef.current = false;
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
  }, [clearAttendanceRefreshTimer, clearReconnectTimer]);

  React.useEffect(() => {
    const refreshAppState = async () => {
      if (document.visibilityState !== 'visible') return;
      try {
        const state = await getAppState();
        if (state.lastSyncedAt !== lastSyncedAt) {
          await applyAppState(state);
        }
      } catch {
      }
    };

    if (isAuthenticated && isAuthorized && currentGuild) {
      connectWebSocket();
      subscribeCurrentGuild();
    } else {
      closeRealtimeConnection();
    }

    const timer = window.setInterval(() => {
      void refreshAppState();
    }, 30000);

    return () => {
      window.clearInterval(timer);
      closeRealtimeConnection();
    };
  }, [isAuthenticated, isAuthorized, currentGuild, lastSyncedAt, applyAppState, connectWebSocket, subscribeCurrentGuild, closeRealtimeConnection]);

  React.useEffect(() => {
    subscribeCurrentGuild();
  }, [subscribeCurrentGuild]);

  React.useEffect(() => {
    if (!isAuthenticated || !isAuthorized) {
      reconnectAttemptRef.current = 0;
      clearReconnectTimer();
      clearAttendanceRefreshTimer();
      pendingAttendanceRefreshRef.current = false;
    }
  }, [isAuthenticated, isAuthorized, clearAttendanceRefreshTimer, clearReconnectTimer]);

  React.useEffect(() => {
    return () => {
      clearAttendanceRefreshTimer();
      clearReconnectTimer();
      closeRealtimeConnection();
    };
  }, [clearAttendanceRefreshTimer, clearReconnectTimer, closeRealtimeConnection]);

  return { closeRealtimeConnection };
}
