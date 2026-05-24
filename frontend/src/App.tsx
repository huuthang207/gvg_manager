/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useCallback, useMemo, useRef } from 'react';
import { ClassType, Member, Skill, SquadGroup } from './types.ts';
import { Sidebar } from './features/app/Sidebar.tsx';
import { MemberDashboard } from './features/members/MemberDashboard.tsx';
import { TeamLayout } from './features/lineup/TeamLayout.tsx';
import { AttendanceView } from './features/attendance/AttendanceView.tsx';
import { syncDiscordMembers, acknowledgeClassChange, updateMemberIngameName, updateMemberClassRole, updateMyIngameName, deleteMember, assignMemberSkill, removeMemberSkill, updateRoleConfig, updateAccessRoles, saveSquadLayout, logoutDiscord, AppStateResponse, DiscordUser, loginWithDiscord, getAppState, getGvgParticipationStats, deleteGvgParticipationSessionsForMonth, updateAttendanceChannel, openAttendanceSession, closeActiveAttendanceSession, refreshActiveAttendanceSession, acquireLineupEditLock, getLineupEditLock, heartbeatLineupEditLock, overrideLineupEditLock, releaseLineupEditLock, resetCurrentGuildData } from './services/discordApi.ts';
import { useLineupSnapshots } from './hooks/useLineupSnapshots.ts';
import { Lock, LockOpen, ShieldAlert } from 'lucide-react';
import { getErrorMessage } from './lib/error.ts';
import { useAppStateLoader } from './features/app/useAppStateLoader.ts';
import { useGuildContext } from './features/guild/useGuildContext.ts';
import { useAuthBootstrap } from './features/auth/useAuthBootstrap.ts';
import { useSystemDialog } from './features/app/SystemDialogProvider.tsx';
import { API_BASE } from './services/apiBase.ts';
import { getDiscordGuildIconUrl } from './shared/utils/discordCdn.ts';
import type { AttendanceSession } from './shared/types/auth.ts';
import type { AttendanceLineupImportPayload, LineupMemberSource } from './shared/types/lineup.ts';

type Tab = 'dashboard' | 'teams' | 'attendance';

const DEFAULT_DOCUMENT_TITLE = 'GvG Manager';
const DYNAMIC_GUILD_ICON_SELECTOR = 'link[rel="icon"][data-dynamic-guild-icon="true"]';

interface AttendanceLineupImportResult {
  nextGroups: SquadGroup[];
  importedMainCount: number;
  importedReserveCount: number;
  skippedAlreadyAssignedCount: number;
  overflowCount: number;
}

const getActiveTabStorageKey = (userId: string, guildId: string) => `gvg_active_tab_${userId}_${guildId}`;
const isTab = (value: string | null): value is Tab => value === 'dashboard' || value === 'teams' || value === 'attendance';
const getCurrentMonthKey = (date = new Date()) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

function collectAssignedMemberIds(groups: SquadGroup[]) {
  const ids = new Set<string>();
  groups.forEach(group => {
    group.teams.forEach(team => {
      team.memberIds.forEach(id => id && ids.add(id));
      team.reserveMemberIds.forEach(id => id && ids.add(id));
    });
  });
  return ids;
}

function fillEmptySlots(ids: string[], assignedIds: Set<string>, fillSlot: (memberId: string) => boolean) {
  let importedCount = 0;
  let skippedAlreadyAssignedCount = 0;
  let overflowCount = 0;

  ids.forEach(memberId => {
    if (!memberId) return;
    if (assignedIds.has(memberId)) {
      skippedAlreadyAssignedCount += 1;
      return;
    }
    if (fillSlot(memberId)) {
      assignedIds.add(memberId);
      importedCount += 1;
    } else {
      overflowCount += 1;
    }
  });

  return { importedCount, skippedAlreadyAssignedCount, overflowCount };
}

function importMembersIntoSquadGroups(groups: SquadGroup[], payload: AttendanceLineupImportPayload): AttendanceLineupImportResult {
  const nextGroups = groups.map(group => ({
    ...group,
    teams: group.teams.map(team => ({
      ...team,
      memberIds: [...team.memberIds],
      reserveMemberIds: [...team.reserveMemberIds],
    })),
  }));
  const assignedIds = collectAssignedMemberIds(nextGroups);
  const fillMainSlot = (memberId: string) => {
    for (const group of nextGroups) {
      for (const team of group.teams) {
        const emptyIndex = team.memberIds.findIndex(id => !id);
        if (emptyIndex !== -1) {
          team.memberIds[emptyIndex] = memberId;
          return true;
        }
      }
    }
    return false;
  };
  const fillReserveSlot = (memberId: string) => {
    for (const group of nextGroups) {
      for (const team of group.teams) {
        const emptyIndex = team.reserveMemberIds.findIndex(id => !id);
        if (emptyIndex !== -1) {
          team.reserveMemberIds[emptyIndex] = memberId;
          return true;
        }
      }
    }
    return false;
  };
  const mainResult = fillEmptySlots(payload.mainMemberIds, assignedIds, fillMainSlot);
  const reserveResult = fillEmptySlots(payload.reserveMemberIds, assignedIds, fillReserveSlot);

  return {
    nextGroups,
    importedMainCount: mainResult.importedCount,
    importedReserveCount: reserveResult.importedCount,
    skippedAlreadyAssignedCount: mainResult.skippedAlreadyAssignedCount + reserveResult.skippedAlreadyAssignedCount,
    overflowCount: mainResult.overflowCount + reserveResult.overflowCount,
  };
}

export default function App() {
  // Active tab state
  const [activeTab, setActiveTab] = useState<Tab>('dashboard');


  // Auth state
  const [authLoading, setAuthLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [blockedReason, setBlockedReason] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<DiscordUser | null>(null);

  // State
  const [squadGroups, setSquadGroups] = useState<SquadGroup[]>([]);
  const [memberPool, setMemberPool] = useState<Member[]>([]);
  const [skills, setSkills] = useState<Skill[]>([]);
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null);
  const [roleConfig, setRoleConfig] = useState<AppStateResponse['roleConfig']>(null);
  const [currentRole, setCurrentRole] = useState<AppStateResponse['currentRole']>(null);
  const [permissions, setPermissions] = useState<string[]>([]);
  const [currentGuild, setCurrentGuild] = useState<AppStateResponse['guild']>(null);
  const [attendance, setAttendance] = useState<AppStateResponse['attendance']>({ config: null, activeSession: null, recentSessions: [] });
  const [lineupMemberSource, setLineupMemberSource] = useState<LineupMemberSource>('guild');
  const [lineupMemberSourceSessionId, setLineupMemberSourceSessionId] = useState<string | null>(null);
  const [lineupMemberSourceSession, setLineupMemberSourceSession] = useState<AttendanceSession | null>(null);
  const [lineupMemberSourceIncludeNotVoted, setLineupMemberSourceIncludeNotVoted] = useState(false);
  const [lineupLock, setLineupLock] = useState<AppStateResponse['lineupLock']>(null);
  const [lineupLockActionLoading, setLineupLockActionLoading] = useState(false);
  const [attendanceActionLoading, setAttendanceActionLoading] = useState(false);
  const [gvgParticipationMonth, setGvgParticipationMonth] = useState(getCurrentMonthKey);
  const [gvgParticipationStats, setGvgParticipationStats] = useState<Record<string, number>>({});
  const [syncing, setSyncing] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimerRef = useRef<number | null>(null);
  const reconnectAttemptRef = useRef(0);
  const appStateRefreshRef = useRef(false);
  const squadLayoutSaveRef = useRef<Promise<void>>(Promise.resolve());
  const refreshSnapshotsRef = useRef<(() => Promise<void>) | null>(null);
  const realtimeDebugEnabled = import.meta.env.DEV || import.meta.env.VITE_REALTIME_DEBUG === 'true';
  const { alert, confirm } = useSystemDialog();

  const logRealtime = useCallback((...args: unknown[]) => {
    if (!realtimeDebugEnabled) return;
    console.log(...args);
  }, [realtimeDebugEnabled]);

  React.useEffect(() => {
    document.title = currentGuild?.name || DEFAULT_DOCUMENT_TITLE;

    return () => {
      document.title = DEFAULT_DOCUMENT_TITLE;
    };
  }, [currentGuild?.name]);

  React.useEffect(() => {
    const existingIcon = document.querySelector<HTMLLinkElement>(DYNAMIC_GUILD_ICON_SELECTOR);
    const iconUrl = currentGuild
      ? getDiscordGuildIconUrl(currentGuild.discordGuildId, currentGuild.icon, 96)
      : null;

    if (!iconUrl) {
      existingIcon?.remove();
      return;
    }

    const icon = existingIcon ?? document.createElement('link');
    icon.rel = 'icon';
    icon.type = 'image/png';
    icon.href = iconUrl;
    icon.dataset.dynamicGuildIcon = 'true';

    if (!existingIcon) {
      document.head.appendChild(icon);
    }

    return () => {
      document.querySelector<HTMLLinkElement>(DYNAMIC_GUILD_ICON_SELECTOR)?.remove();
    };
  }, [currentGuild?.discordGuildId, currentGuild?.icon]);

  React.useEffect(() => {
    if (!currentUser || !currentGuild) {
      setActiveTab('dashboard');
      return;
    }

    const canManageAttendance = permissions.includes('manage:lineup');
    const storedTab = localStorage.getItem(getActiveTabStorageKey(currentUser.id, currentGuild.id));
    setActiveTab(isTab(storedTab) && (storedTab !== 'attendance' || canManageAttendance) ? storedTab : 'dashboard');
  }, [currentGuild?.id, currentUser?.id]);

  const updateActiveTab = useCallback((tab: Tab) => {
    if (tab === 'attendance' && !permissions.includes('manage:lineup')) return;

    setActiveTab(tab);
    if (currentUser && currentGuild) {
      localStorage.setItem(getActiveTabStorageKey(currentUser.id, currentGuild.id), tab);
    }
  }, [currentGuild, currentUser, permissions]);

  const clearCurrentUiState = useCallback(() => {
    if (currentUser && currentGuild) {
      localStorage.removeItem(getActiveTabStorageKey(currentUser.id, currentGuild.id));
    }
    setActiveTab('dashboard');
    setLineupMemberSource('guild');
    setLineupMemberSourceSessionId(null);
    setLineupMemberSourceSession(null);
    setLineupMemberSourceIncludeNotVoted(false);
  }, [currentGuild, currentUser]);

  const clearReconnectTimer = useCallback(() => {
    if (reconnectTimerRef.current) {
      window.clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = null;
    }
  }, []);

  const normalizeMember = useCallback((member: Member): Member => ({
    ...member,
    classType: member.classType as Member['classType'],
    previousClassType: member.previousClassType as Member['classType'] | null | undefined,
  }), []);

  const sortMembers = useCallback((members: Member[]) => {
    return [...members].sort((a, b) => {
      const aLabel = a.name || a.discordDisplayName || a.discordUsername || '';
      const bLabel = b.name || b.discordDisplayName || b.discordUsername || '';
      return aLabel.localeCompare(bLabel);
    });
  }, []);

  const mergeMemberDelta = useCallback((upsertMembers: Member[], removedMemberIds: string[]) => {
    setMemberPool(prev => {
      const map = new Map<string, Member>(prev.map(member => [member.id, member]));
      upsertMembers.forEach(member => {
        const previous = map.get(member.id);
        map.set(member.id, {
          ...normalizeMember(member),
          assignedSkills: member.assignedSkills ?? previous?.assignedSkills ?? [],
        });
      });
      removedMemberIds.forEach(id => {
        map.delete(id);
      });
      return sortMembers(Array.from(map.values()));
    });
  }, [normalizeMember, sortMembers]);

  const replaceMemberPool = useCallback((members: Member[]) => {
    setMemberPool(prev => {
      const previousSkillsByMemberId = new Map(prev.map(member => [member.id, member.assignedSkills || []]));

      return sortMembers(members.map(member => ({
        ...normalizeMember(member),
        assignedSkills: member.assignedSkills ?? previousSkillsByMemberId.get(member.id) ?? [],
      })));
    });
  }, [normalizeMember, sortMembers]);

  const {
    applyAppState,
    loadAppState,
  } = useAppStateLoader({
    setMemberPool,
    setSkills,
    setLastSyncedAt,
    setRoleConfig,
    setCurrentGuild,
    setCurrentRole,
    setPermissions,
    setSquadGroups,
    setCurrentUser,
    setAttendance,
    setLineupLock,
  });

  const refreshLineupLock = useCallback(async () => {
    if (!currentGuild || !permissions.includes('view:guild')) {
      setLineupLock(null);
      return;
    }

    try {
      setLineupLock(await getLineupEditLock());
    } catch {
    }
  }, [currentGuild, permissions]);

  const refreshGvgParticipationStats = useCallback(async () => {
    if (!currentGuild || !permissions.includes('view:guild')) {
      setGvgParticipationStats({});
      return;
    }

    try {
      const response = await getGvgParticipationStats(gvgParticipationMonth);
      setGvgParticipationStats(response.stats);
    } catch {
      setGvgParticipationStats({});
    }
  }, [currentGuild, gvgParticipationMonth, permissions]);

  const refreshAppStateFromRealtime = useCallback(async () => {
    if (appStateRefreshRef.current) return;
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
    }
  }, [applyAppState, setBlockedReason, setIsAuthorized]);

  const subscribeCurrentGuild = useCallback(() => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN || !currentGuild) return;
    wsRef.current.send(JSON.stringify({ type: 'subscribe_guild', guildId: currentGuild.id }));
  }, [currentGuild]);

  const connectWebSocket = useCallback(() => {
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
        const payload = JSON.parse(event.data as string) as {
          type?: string;
          guildId?: string;
          discordGuildId?: string;
          lastSyncedAt?: string | null;
          members?: Member[];
          upsertMembers?: Member[];
          removedMemberIds?: string[];
          reason?: string;
          updatedAt?: string;
        };

        if (payload.type === 'subscribed') {
          logRealtime('[WS] Subscribed guild', payload.guildId);
          return;
        }

        const matchedByInternalGuildId = payload.guildId && currentGuild && payload.guildId === currentGuild.id;
        const matchedByDiscordGuildId = payload.discordGuildId && currentGuild && payload.discordGuildId === currentGuild.discordGuildId;
        if (!matchedByInternalGuildId && !matchedByDiscordGuildId) return;

        if (payload.type === 'guild_members_delta') {
          mergeMemberDelta(payload.upsertMembers || [], payload.removedMemberIds || []);
          setLastSyncedAt(payload.lastSyncedAt ?? null);
          return;
        }

        if (payload.type === 'guild_app_state_changed') {
          void refreshAppStateFromRealtime();
          if (payload.reason === 'snapshot_saved' || payload.reason === 'snapshot_deleted' || payload.reason === 'snapshot_restored') {
            void refreshSnapshotsRef.current?.();
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
      const delay = Math.min(30000, [1000, 2000, 5000, 10000, 30000][Math.min(attempt - 1, 4)]);
      logRealtime('[WS] Reconnecting in', delay, 'ms');

      clearReconnectTimer();
      reconnectTimerRef.current = window.setTimeout(() => {
        connectWebSocket();
      }, delay);
    };
  }, [isAuthenticated, isAuthorized, currentGuild, logRealtime, subscribeCurrentGuild, mergeMemberDelta, replaceMemberPool, refreshAppStateFromRealtime, refreshLineupLock, refreshGvgParticipationStats, clearReconnectTimer]);

  const closeWebSocket = useCallback(() => {
    clearReconnectTimer();
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
  }, [clearReconnectTimer]);

  useAuthBootstrap({
    loadAppState,
    setAuthLoading,
    setIsAuthenticated,
    setIsAuthorized,
    setBlockedReason,
    setCurrentUser,
  });

  // Computed values
  const canManageLineup = permissions.includes('manage:lineup');
  const canManageSnapshots = permissions.includes('manage:snapshots');
  const canRestoreSnapshots = permissions.includes('restore:snapshots');
  const canManageMembers = permissions.includes('manage:members');
  const canManageSettings = permissions.includes('manage:settings');
  const canSelfService = permissions.includes('view:guild');
  const lineupReadOnly = !canManageLineup || !lineupLock?.isHeldByMe;

  const assignedMemberIds = useMemo(() => collectAssignedMemberIds(squadGroups), [squadGroups]);
  const dashboardMembers = useMemo(() => memberPool.map(member => ({
    ...member,
    gvgParticipationCount: gvgParticipationStats[member.id] ?? 0,
  })), [gvgParticipationStats, memberPool]);

  const lineupVisibleMemberPool = useMemo(() => {
    if (lineupMemberSource !== 'attendance' || !lineupMemberSourceSession) return memberPool;

    const votedMemberIds = new Set(lineupMemberSourceSession.votes.map(vote => vote.memberId));
    const visibleMemberIds = new Set(
      lineupMemberSourceSession.votes
        .filter(vote => vote.choice === 'GO' || vote.choice === 'MAYBE')
        .map(vote => vote.memberId),
    );

    if (lineupMemberSourceIncludeNotVoted) {
      memberPool.forEach(member => {
        if (member.active !== false && !votedMemberIds.has(member.id)) {
          visibleMemberIds.add(member.id);
        }
      });
    }

    return memberPool.filter(member => visibleMemberIds.has(member.id));
  }, [lineupMemberSource, lineupMemberSourceIncludeNotVoted, lineupMemberSourceSession, memberPool]);

  const getMemberById = useCallback((id: string) => {
    return memberPool.find(m => m.id === id) || null;
  }, [memberPool]);

  // Handlers
  const handleAssignSkillToMember = useCallback((memberId: string, skill: Skill) => {
    setMemberPool(prev => prev.map(m => {
      if (m.id === memberId) {
        const assignedSkills = m.assignedSkills || [];
        if (assignedSkills.includes(skill.id)) return m;
        return {
          ...m,
          assignedSkills: [...assignedSkills, skill.id],
        };
      }
      return m;
    }));
    void assignMemberSkill(memberId, skill).then(applyAppState).catch(err => {
      void alert({ message: getErrorMessage(err, 'Không thể lưu kỹ năng cho thành viên'), variant: 'error' });
      void loadAppState();
    });
  }, [applyAppState, loadAppState]);

  const handleRemoveSkillFromMember = useCallback((memberId: string, skillId: string) => {
    setMemberPool(prev => prev.map(m => {
      if (m.id === memberId) {
        return {
          ...m,
          assignedSkills: (m.assignedSkills || []).filter(id => id !== skillId)
        };
      }
      return m;
    }));
    void removeMemberSkill(memberId, skillId).then(applyAppState).catch(err => {
      void alert({ message: getErrorMessage(err, 'Không thể gỡ kỹ năng khỏi thành viên'), variant: 'error' });
      void loadAppState();
    });
  }, [applyAppState, loadAppState]);

  const handleAddSkills = (skillsData: Omit<Skill, 'id'>[]) => {
    const newSkills = skillsData.map(data => ({
      ...data,
      id: Date.now().toString() + Math.random().toString(36).substr(2, 5)
    }));
    setSkills(prev => [...prev, ...newSkills]);
  };

  const handleDeleteSkill = async (id: string) => {
    const confirmed = await confirm({
      message: 'Bạn có chắc muốn xóa kỹ năng này?',
      variant: 'danger',
      confirmLabel: 'Xóa',
    });
    if (!confirmed) return;

    setSkills(prev => prev.filter(s => s.id !== id));
    setMemberPool(prev => prev.map(m => ({
      ...m,
      assignedSkills: (m.assignedSkills || []).filter(sid => sid !== id)
    })));
  };

  const persistSquadGroups = (groups: SquadGroup[], applySavedState = false) => {
    const saveTask = squadLayoutSaveRef.current.then(async () => {
      try {
        const state = await saveSquadLayout(groups);
        if (applySavedState) {
          setSquadGroups(state.squadGroups || []);
        }
      } catch (err) {
        void alert({ message: getErrorMessage(err, 'Không thể lưu đội hình'), variant: 'error' });
        throw err;
      }
    });

    squadLayoutSaveRef.current = saveTask.catch(() => undefined);
    return saveTask;
  };

  const flushPendingSquadLayoutSave = useCallback(async () => {
    await squadLayoutSaveRef.current;
  }, []);

  const handleSquadGroupsChange: React.Dispatch<React.SetStateAction<SquadGroup[]>> = (update) => {
    setSquadGroups(prev => {
      const next = typeof update === 'function' ? update(prev) : update;

      if (next.length === 0 && prev.length > 0) {
        const assignedIds = collectAssignedMemberIds(prev);
        setMemberPool(members => members.map(member => assignedIds.has(member.id) ? { ...member, assignedSkills: [] } : member));
      }

      void persistSquadGroups(next, prev.length === 0);
      return next;
    });
  };

  const handleImportAttendanceToLineup = useCallback((payload: AttendanceLineupImportPayload) => {
    if (!canManageLineup || !lineupLock?.isHeldByMe) {
      void alert({ message: 'Bạn cần giữ quyền chỉnh sửa đội hình trước khi nhập danh sách điểm danh. Hãy sang tab Xếp đội hình và bấm Bắt đầu.', variant: 'warning' });
      return;
    }
    if (!squadGroups.length) {
      void alert({ message: 'Chưa có đội hình để nhập danh sách điểm danh.', variant: 'warning' });
      return;
    }

    const result = importMembersIntoSquadGroups(squadGroups, payload);
    handleSquadGroupsChange(result.nextGroups);
    updateActiveTab('teams');
    void alert({
      message: `Đã nhập ${result.importedMainCount} thành viên chính và ${result.importedReserveCount} dự bị. Bỏ qua ${result.skippedAlreadyAssignedCount} người đã có trong đội hình, ${result.overflowCount} người chưa có slot trống.`,
      variant: result.importedMainCount || result.importedReserveCount ? 'success' : 'warning',
    });
  }, [alert, canManageLineup, handleSquadGroupsChange, lineupLock?.isHeldByMe, squadGroups, updateActiveTab]);

  const handleMemberNoteChange = (teamId: string, memberId: string, note: string) => {
    handleSquadGroupsChange(prev => prev.map(group => ({
      ...group,
      teams: group.teams.map(team => {
        if (team.id !== teamId) return team;

        const memberNotes = { ...(team.memberNotes ?? {}) };
        const trimmedNote = note.trim();
        if (trimmedNote) {
          memberNotes[memberId] = trimmedNote;
        } else {
          delete memberNotes[memberId];
        }

        return { ...team, memberNotes };
      }),
    })));
  };

  const runLineupLockAction = async (action: () => Promise<AppStateResponse['lineupLock']>, fallbackMessage: string) => {
    setLineupLockActionLoading(true);
    try {
      setLineupLock(await action());
    } catch (err) {
      void alert({ message: getErrorMessage(err, fallbackMessage), variant: 'error' });
      void refreshLineupLock();
    } finally {
      setLineupLockActionLoading(false);
    }
  };

  const handleAcquireLineupLock = () => {
    void runLineupLockAction(acquireLineupEditLock, 'Không thể bắt đầu chỉnh sửa đội hình');
  };

  const handleReleaseLineupLock = () => {
    void runLineupLockAction(releaseLineupEditLock, 'Không thể kết thúc chỉnh sửa đội hình');
  };

  const handleOverrideLineupLock = async () => {
    const confirmed = await confirm({
      message: `Đội hình đang được chỉnh bởi ${lineupLock?.holderName || 'người khác'}. Bạn có chắc muốn chiếm quyền chỉnh sửa?`,
      variant: 'warning',
      confirmLabel: 'Chiếm quyền',
    });
    if (!confirmed) return;

    void runLineupLockAction(overrideLineupEditLock, 'Không thể chiếm quyền chỉnh sửa đội hình');
  };

  const handleDeleteMember = async (memberId: string) => {
    try {
      const state = await deleteMember(memberId);
      await applyAppState(state);
    } catch (err) {
      void alert({ message: getErrorMessage(err, 'Không thể gỡ role Bang Viên khỏi thành viên'), variant: 'error' });
      throw err;
    }
  };

  const handleSquadGroupLeaderChange = (groupId: string, leaderMemberId: string | null) => {
    handleSquadGroupsChange(prev => prev.map(group => {
      if (group.id !== groupId) return group;
      return {
        ...group,
        leaderMemberId,
      };
    }));
  };

  const handleSyncDiscord = async () => {
    setSyncing(true);
    try {
      const state = await syncDiscordMembers();
      await applyAppState(state);
    } catch (err) {
      void alert({ message: getErrorMessage(err, 'Không thể đồng bộ Discord'), variant: 'error' });
    } finally {
      setSyncing(false);
    }
  };

  const handleAcknowledgeClassChange = async (memberId: string) => {
    try {
      const state = await acknowledgeClassChange(memberId);
      await applyAppState(state);
    } catch (err) {
      void alert({ message: getErrorMessage(err, 'Không thể cập nhật trạng thái đổi phái'), variant: 'error' });
    }
  };

  const handleUpdateIngameName = async (memberId: string, ingameName: string) => {
    try {
      const state = await updateMemberIngameName(memberId, ingameName);
      await applyAppState(state);
    } catch (err) {
      void alert({ message: getErrorMessage(err, 'Không thể cập nhật tên ingame'), variant: 'error' });
      throw err;
    }
  };

  const handleUpdateMemberClassRole = async (memberId: string, classType: ClassType) => {
    try {
      const state = await updateMemberClassRole(memberId, classType);
      await applyAppState(state);
    } catch (err) {
      void alert({ message: getErrorMessage(err, 'Không thể cập nhật role môn phái'), variant: 'error' });
      throw err;
    }
  };

  const handleUpdateMyIngameName = async (ingameName: string) => {
    try {
      const state = await updateMyIngameName(ingameName);
      await applyAppState(state);
    } catch (err) {
      void alert({ message: getErrorMessage(err, 'Không thể cập nhật tên ingame'), variant: 'error' });
      throw err;
    }
  };

  const handleResetCurrentGuildData = async (confirmation: string) => {
    try {
      const state = await resetCurrentGuildData(confirmation);
      resetSnapshots();
      await applyAppState(state);
      updateActiveTab('dashboard');
    } catch (err) {
      void alert({ message: getErrorMessage(err, 'Không thể reset dữ liệu server'), variant: 'error' });
      throw err;
    }
  };

  const handleUpdateRoleConfig = async (classRoleMap: Record<string, string>, requiredRoles: string[], accessRoles?: { managerRoles: string[]; memberRoles: string[] }) => {
    try {
      let state = await updateRoleConfig(classRoleMap, requiredRoles);
      if (accessRoles) {
        state = await updateAccessRoles(accessRoles.managerRoles, accessRoles.memberRoles);
      }
      await applyAppState(state);
    } catch (err) {
      void alert({ message: getErrorMessage(err, 'Không thể cập nhật cấu hình role'), variant: 'error' });
      throw err;
    }
  };

  const runAttendanceAction = async (action: () => Promise<AppStateResponse>, fallbackMessage: string) => {
    setAttendanceActionLoading(true);
    try {
      const state = await action();
      await applyAppState(state);
    } catch (err) {
      void alert({ message: getErrorMessage(err, fallbackMessage), variant: 'error' });
    } finally {
      setAttendanceActionLoading(false);
    }
  };

  const handleSetAttendanceChannel = (discordChannelId: string) => {
    void runAttendanceAction(
      () => updateAttendanceChannel(discordChannelId.trim()),
      'Không thể lưu kênh điểm danh',
    );
  };

  const handleOpenAttendanceSession = (headerText: string) => {
    void runAttendanceAction(
      () => openAttendanceSession(headerText.trim()),
      'Không thể mở phiên điểm danh',
    );
  };

  const handleCloseAttendanceSession = async () => {
    const confirmed = await confirm({
      message: 'Bạn có chắc muốn đóng phiên điểm danh hiện tại?',
      variant: 'danger',
      confirmLabel: 'Đóng phiên',
    });
    if (!confirmed) return;

    void runAttendanceAction(
      closeActiveAttendanceSession,
      'Không thể đóng phiên điểm danh',
    );
  };

  const handleRefreshAttendanceSession = () => {
    void runAttendanceAction(
      refreshActiveAttendanceSession,
      'Không thể refresh phiên điểm danh',
    );
  };

  const handleDeleteGvgParticipationMonth = async (month: string) => {
    try {
      const state = await deleteGvgParticipationSessionsForMonth(month);
      await applyAppState(state);
      await refreshGvgParticipationStats();
      return state.gvgParticipationDeletedCount;
    } catch (err) {
      void alert({ message: getErrorMessage(err, 'Không thể xoá dữ liệu bang chiến tháng này'), variant: 'error' });
      throw err;
    }
  };

  const {
    snapshots,
    snapshotsOpen,
    snapshotsLoading,
    snapshotDetailLoading,
    snapshotActionLoading,
    selectedSnapshotId,
    pendingSnapshotId,
    selectedSnapshot,
    recentSnapshotAction,
    openSnapshots,
    closeSnapshots,
    selectSnapshot,
    saveSnapshot,
    restoreSnapshot,
    removeSnapshot,
    resetSnapshots,
    refreshSnapshots,
  } = useLineupSnapshots({ applyAppState, flushPendingSquadLayoutSave });

  React.useEffect(() => {
    refreshSnapshotsRef.current = refreshSnapshots;
  }, [refreshSnapshots]);

  React.useEffect(() => {
    if (!isAuthenticated || !isAuthorized || !currentGuild || !canManageLineup || !lineupLock?.isHeldByMe) return;

    const timer = window.setInterval(() => {
      void heartbeatLineupEditLock()
        .then(lock => setLineupLock(lock))
        .catch(() => refreshLineupLock());
    }, 20000);

    return () => {
      window.clearInterval(timer);
    };
  }, [canManageLineup, currentGuild, isAuthenticated, isAuthorized, lineupLock?.isHeldByMe, refreshLineupLock]);

  React.useEffect(() => {
    if (!isAuthenticated || !isAuthorized || !currentGuild || !permissions.includes('view:guild')) {
      setLineupLock(null);
      return;
    }

    void refreshLineupLock();
  }, [currentGuild, isAuthenticated, isAuthorized, permissions, refreshLineupLock]);

  React.useEffect(() => {
    if (!isAuthenticated || !isAuthorized || !currentGuild || !permissions.includes('view:guild')) {
      setGvgParticipationStats({});
      return;
    }

    void refreshGvgParticipationStats();
  }, [currentGuild, isAuthenticated, isAuthorized, permissions, refreshGvgParticipationStats]);

  const {
    accessibleGuilds,
    switchingGuild,
    setAccessibleGuilds,
    loadAccessibleGuilds,
    handleGuildSwitch,
  } = useGuildContext(applyAppState, resetSnapshots);

  React.useEffect(() => {
    if (isAuthenticated && isAuthorized) {
      void loadAccessibleGuilds();
    }
  }, [isAuthenticated, isAuthorized, loadAccessibleGuilds]);

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
      closeWebSocket();
    }

    const timer = window.setInterval(() => {
      void refreshAppState();
    }, 30000);

    return () => {
      window.clearInterval(timer);
      closeWebSocket();
    };
  }, [isAuthenticated, isAuthorized, currentGuild, lastSyncedAt, applyAppState, connectWebSocket, subscribeCurrentGuild, closeWebSocket]);

  React.useEffect(() => {
    subscribeCurrentGuild();
  }, [subscribeCurrentGuild]);

  React.useEffect(() => {
    if (!isAuthenticated || !isAuthorized) {
      reconnectAttemptRef.current = 0;
      clearReconnectTimer();
    }
  }, [isAuthenticated, isAuthorized, clearReconnectTimer]);

  React.useEffect(() => {
    return () => {
      clearReconnectTimer();
      closeWebSocket();
    };
  }, [clearReconnectTimer, closeWebSocket]);

  const handleLogout = async () => {
    closeWebSocket();
    clearCurrentUiState();
    if (lineupLock?.isHeldByMe) {
      void releaseLineupEditLock().catch(() => undefined);
    }
    try {
      await logoutDiscord();
    } catch (err) {
      console.error('Logout failed:', err);
    } finally {
      setIsAuthenticated(false);
      setCurrentUser(null);
      setMemberPool([]);
      setSkills([]);
      setRoleConfig(null);
      setCurrentGuild(null);
      setCurrentRole(null);
      setPermissions([]);
      setLineupLock(null);
      setGvgParticipationStats({});
      setSquadGroups([]);
      setAccessibleGuilds([]);
      resetSnapshots();
    }
  };

  const handleDiscordImport = async (importedMembers: Member[]) => {
    setMemberPool(prev => {
      const existingDiscordIds = new Set(
        prev.filter(m => m.discordId).map(m => m.discordId)
      );
      const newMembers = importedMembers.filter(m => !existingDiscordIds.has(m.discordId));
      return [...newMembers, ...prev];
    });
    try {
      await loadAppState();
    } catch (err) {
      console.error('Failed to reload app state:', err);
    }
    updateActiveTab('dashboard');
  };

  if (authLoading) {
    return (
      <div className="app-shell flex h-screen items-center justify-center text-slate-300 font-sans">
        Đang tải dữ liệu...
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="app-shell min-h-screen text-slate-100 flex items-center justify-center p-6 font-sans">
        <div className="app-surface w-full max-w-md rounded-2xl p-8 text-center space-y-4">
          <h1 className="text-xl font-black uppercase tracking-widest text-white">GvG Manager</h1>
          <p className="text-sm text-slate-400">Đăng nhập Discord để vào hệ thống.</p>
          <button
            onClick={loginWithDiscord}
            className="inline-flex items-center gap-2 px-5 py-3 bg-[#5865F2] hover:bg-[#4752C4] text-white rounded-xl font-black uppercase tracking-widest text-xs transition-all shadow-lg shadow-[#5865F2]/20"
          >
            Đăng nhập với Discord
          </button>
        </div>
      </div>
    );
  }

  if (!isAuthorized) {
    return (
      <div className="app-shell min-h-screen text-slate-100 flex items-center justify-center p-6 font-sans">
        <div className="w-full max-w-lg rounded-2xl border border-red-400/30 bg-slate-900/75 p-8 text-center shadow-2xl shadow-red-950/20 space-y-4">
          <h1 className="text-xl font-black uppercase tracking-widest text-white">Không có quyền truy cập</h1>
          <p className="text-sm text-slate-300">{blockedReason || 'Tài khoản của bạn chưa đủ điều kiện vào hệ thống.'}</p>
          <p className="text-xs text-slate-500">Vui lòng liên hệ quản trị bang để được cấp đúng role yêu cầu.</p>
          <button
            onClick={handleLogout}
            className="inline-flex items-center gap-2 px-5 py-3 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl font-bold text-xs transition-colors"
          >
            Đăng xuất
          </button>
        </div>
      </div>
    );
  }


  return (
    <div className="app-shell flex h-screen overflow-hidden text-slate-100 font-sans">
      {/* Sidebar */}
      <Sidebar
        activeTab={activeTab}
        onTabChange={updateActiveTab}
        currentUser={currentUser}
        onLogout={handleLogout}
        currentGuild={currentGuild}
        canManageAttendance={canManageLineup}
      />

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="h-14 flex items-center justify-between border-b border-slate-800/80 bg-slate-950/45 px-6 backdrop-blur-md z-10 shrink-0">
          <div className="flex items-center gap-4">
            <h1 className="text-lg font-bold text-white">
              {activeTab === 'dashboard' ? 'Quản Lý Thành Viên' : activeTab === 'teams' ? 'Sắp Xếp Đội Hình' : 'Điểm Danh Bang Chiến'}
            </h1>
          </div>

          <div className="flex items-center gap-3">
            {activeTab === 'teams' && canManageLineup && (
              <div className="flex items-center gap-1.5">
                <div
                  className={`flex min-w-0 items-center gap-2 rounded-lg border px-2.5 py-1.5 ${lineupLock?.isHeldByMe ? 'border-emerald-400/25 bg-emerald-500/10 text-emerald-200' : lineupLock ? 'border-amber-400/25 bg-amber-500/10 text-amber-200' : 'border-sky-400/25 bg-sky-500/10 text-sky-200'}`}
                  title={lineupLock?.isHeldByMe ? 'Người khác vẫn có thể xem cập nhật realtime nhưng không thể thay đổi.' : lineupLock ? 'Đội hình đang được khóa bởi người khác.' : 'Bấm bắt đầu để khóa quyền thay đổi đội hình cho phiên của bạn.'}
                >
                  {lineupLock?.isHeldByMe ? <LockOpen size={14} className="shrink-0" /> : lineupLock ? <Lock size={14} className="shrink-0" /> : <ShieldAlert size={14} className="shrink-0" />}
                  <span className="max-w-44 truncate text-[11px] font-black uppercase tracking-wider">
                    {lineupLock?.isHeldByMe ? 'Đang chỉnh sửa' : lineupLock ? `Khóa bởi ${lineupLock.holderName}` : 'Chế độ xem'}
                  </span>
                </div>

                {lineupLock?.isHeldByMe ? (
                  <button
                    onClick={handleReleaseLineupLock}
                    disabled={lineupLockActionLoading}
                    className="rounded-lg border border-emerald-400/30 bg-emerald-500/12 px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider text-emerald-200 transition-colors hover:border-emerald-300/50 hover:bg-emerald-500/18 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Kết thúc
                  </button>
                ) : (
                  <>
                    <button
                      onClick={handleAcquireLineupLock}
                      disabled={lineupLockActionLoading || !!lineupLock}
                      className="rounded-lg border border-sky-400/30 bg-sky-500/12 px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider text-sky-200 transition-colors hover:border-sky-300/50 hover:bg-sky-500/18 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Bắt đầu
                    </button>
                    {lineupLock?.canOverride && (
                      <button
                        onClick={handleOverrideLineupLock}
                        disabled={lineupLockActionLoading}
                        className="rounded-lg border border-amber-400/30 bg-amber-500/12 px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider text-amber-200 transition-colors hover:border-amber-300/50 hover:bg-amber-500/18 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        Chiếm quyền
                      </button>
                    )}
                  </>
                )}
              </div>
            )}
          </div>
        </header>

        {/* Tab Content */}
        <div className="flex-1 overflow-hidden">
          {activeTab === 'dashboard' && (
            <MemberDashboard
              members={dashboardMembers}
              gvgParticipationMonth={gvgParticipationMonth}
              onGvgParticipationMonthChange={setGvgParticipationMonth}
              onImport={handleDiscordImport}
              onDelete={handleDeleteMember}
              onAcknowledgeClassChange={handleAcknowledgeClassChange}
              onUpdateIngameName={handleUpdateIngameName}
              onUpdateMemberClassRole={handleUpdateMemberClassRole}
              onUpdateMyIngameName={handleUpdateMyIngameName}
              currentUser={currentUser}
              currentRole={currentRole}
              canManageMembers={canManageMembers}
              canManageSettings={canManageSettings}
              canSelfService={canSelfService}
              roleConfig={roleConfig}
              onUpdateRoleConfig={handleUpdateRoleConfig}
              onResetCurrentGuildData={handleResetCurrentGuildData}
              lastSyncedAt={lastSyncedAt}
            />
          )}

          {activeTab === 'teams' && (
            <TeamLayout
              squadGroups={squadGroups}
              memberPool={lineupVisibleMemberPool}
              fullMemberPool={memberPool}
              skills={skills}
              currentUser={currentUser}
              assignedMemberIds={assignedMemberIds}
              onSquadGroupsChange={handleSquadGroupsChange}
              onSquadGroupLeaderChange={handleSquadGroupLeaderChange}
              onMemberPoolChange={setMemberPool}
              onAssignSkillToMember={handleAssignSkillToMember}
              onSkillsChange={setSkills}
              onRemoveSkillFromMember={handleRemoveSkillFromMember}
              onMemberNoteChange={handleMemberNoteChange}
              onImportAttendanceToLineup={handleImportAttendanceToLineup}
              lineupMemberSource={lineupMemberSource}
              lineupMemberSourceSessionId={lineupMemberSourceSessionId}
              lineupMemberSourceSession={lineupMemberSourceSession}
              lineupMemberSourceIncludeNotVoted={lineupMemberSourceIncludeNotVoted}
              onLineupMemberSourceChange={setLineupMemberSource}
              onLineupMemberSourceSessionChange={(session) => {
                setLineupMemberSourceSession(session);
                setLineupMemberSourceSessionId(session?.id ?? null);
              }}
              onLineupMemberSourceIncludeNotVotedChange={setLineupMemberSourceIncludeNotVoted}
              getMemberById={getMemberById}
              readOnly={lineupReadOnly}
              snapshotsOnly={false}
              canManageLineup={canManageLineup}
              canManageSnapshots={canManageSnapshots}
              canRestoreSnapshots={canRestoreSnapshots}
              snapshotState={{
                snapshots,
                snapshotsOpen,
                snapshotsLoading,
                snapshotDetailLoading,
                snapshotActionLoading,
                selectedSnapshotId,
                pendingSnapshotId,
                selectedSnapshot,
                recentSnapshotAction,
              }}
              snapshotActions={{
                openSnapshots,
                closeSnapshots,
                selectSnapshot,
                saveSnapshot,
                restoreSnapshot,
                removeSnapshot,
                refreshSnapshots,
              }}
            />
          )}

          {activeTab === 'attendance' && canManageLineup && (
            <AttendanceView
              attendance={attendance}
              members={memberPool}
              actionLoading={attendanceActionLoading}
              onSetChannel={handleSetAttendanceChannel}
              onOpenSession={handleOpenAttendanceSession}
              onCloseSession={handleCloseAttendanceSession}
              onRefreshSession={handleRefreshAttendanceSession}
              onDeleteGvgParticipationMonth={handleDeleteGvgParticipationMonth}
            />
          )}
        </div>
      </div>

    </div>
  );
}