/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useCallback, useMemo, useRef } from 'react';
import { Member, Skill, SquadGroup } from './types.ts';
import { Sidebar } from './features/app/Sidebar.tsx';
import { MemberDashboard } from './features/members/MemberDashboard.tsx';
import { TeamLayout } from './features/lineup/TeamLayout.tsx';
import { syncDiscordMembers, acknowledgeClassChange, updateMemberIngameName, updateMyIngameName, deleteMember, deleteInactiveMember, assignMemberSkill, removeMemberSkill, updateRoleConfig, updateAccessRoles, saveSquadLayout, logoutDiscord, AppStateResponse, DiscordUser, loginWithDiscord, getAppState } from './services/discordApi.ts';
import { useLineupSnapshots } from './hooks/useLineupSnapshots.ts';
import { cn } from './lib/utils.ts';
import { getErrorMessage } from './lib/error.ts';
import { Maximize2, Minimize2 } from 'lucide-react';
import { useAppStateLoader } from './features/app/useAppStateLoader.ts';
import { useGuildContext } from './features/guild/useGuildContext.ts';
import { useAuthBootstrap } from './features/auth/useAuthBootstrap.ts';
import { useSystemDialog } from './features/app/SystemDialogProvider.tsx';
import { API_BASE } from './services/apiBase.ts';

type Tab = 'dashboard' | 'teams';
type LineupEntryMode = 'menu' | 'create' | 'current';

const getLineupEntryStorageKey = (userId: string, guildId: string) => `gvg_lineup_entry_${userId}_${guildId}`;
const getActiveTabStorageKey = (userId: string, guildId: string) => `gvg_active_tab_${userId}_${guildId}`;
const isLineupEntryMode = (value: string | null): value is LineupEntryMode => value === 'menu' || value === 'create' || value === 'current';
const isTab = (value: string | null): value is Tab => value === 'dashboard' || value === 'teams';

export default function App() {
  // Active tab state
  const [activeTab, setActiveTab] = useState<Tab>('dashboard');
  const [lineupEntryMode, setLineupEntryMode] = useState<LineupEntryMode>('menu');

  // Zoom state for team layout
  const [isZoomed, setIsZoomed] = useState(false);

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
  const [syncing, setSyncing] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimerRef = useRef<number | null>(null);
  const reconnectAttemptRef = useRef(0);
  const appStateRefreshRef = useRef(false);
  const refreshSnapshotsRef = useRef<(() => Promise<void>) | null>(null);
  const realtimeDebugEnabled = import.meta.env.DEV || import.meta.env.VITE_REALTIME_DEBUG === 'true';
  const { alert, confirm } = useSystemDialog();

  const logRealtime = useCallback((...args: unknown[]) => {
    if (!realtimeDebugEnabled) return;
    console.log(...args);
  }, [realtimeDebugEnabled]);

  React.useEffect(() => {
    if (!currentUser || !currentGuild) {
      setLineupEntryMode('menu');
      setActiveTab('dashboard');
      return;
    }

    const storedMode = localStorage.getItem(getLineupEntryStorageKey(currentUser.id, currentGuild.id));
    const storedTab = localStorage.getItem(getActiveTabStorageKey(currentUser.id, currentGuild.id));
    setLineupEntryMode(isLineupEntryMode(storedMode) ? storedMode : 'menu');
    setActiveTab(isTab(storedTab) ? storedTab : 'dashboard');
  }, [currentGuild, currentUser]);

  const updateActiveTab = useCallback((tab: Tab) => {
    setActiveTab(tab);
    if (currentUser && currentGuild) {
      localStorage.setItem(getActiveTabStorageKey(currentUser.id, currentGuild.id), tab);
    }
  }, [currentGuild, currentUser]);

  const updateLineupEntryMode = useCallback((mode: LineupEntryMode) => {
    setLineupEntryMode(mode);
    if (currentUser && currentGuild) {
      localStorage.setItem(getLineupEntryStorageKey(currentUser.id, currentGuild.id), mode);
    }
  }, [currentGuild, currentUser]);

  const clearCurrentUiState = useCallback(() => {
    if (currentUser && currentGuild) {
      localStorage.removeItem(getLineupEntryStorageKey(currentUser.id, currentGuild.id));
      localStorage.removeItem(getActiveTabStorageKey(currentUser.id, currentGuild.id));
    }
    setLineupEntryMode('menu');
    setActiveTab('dashboard');
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
          assignedSkills: member.assignedSkills?.length ? member.assignedSkills : previous?.assignedSkills || [],
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
        assignedSkills: member.assignedSkills?.length ? member.assignedSkills : previousSkillsByMemberId.get(member.id) || [],
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
  });

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
  }, [isAuthenticated, isAuthorized, currentGuild, logRealtime, subscribeCurrentGuild, mergeMemberDelta, replaceMemberPool, refreshAppStateFromRealtime, clearReconnectTimer]);

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

  const assignedMemberIds = useMemo(() => {
    const ids = new Set<string>();
    squadGroups.forEach(group => {
      group.teams.forEach(team => {
        team.memberIds.forEach(id => id && ids.add(id));
        team.reserveMemberIds.forEach(id => id && ids.add(id));
      });
    });
    return ids;
  }, [squadGroups]);

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

  const handleClearAllSkills = async () => {
    const confirmed = await confirm({
      message: 'Bạn có chắc muốn xóa TẤT CẢ kỹ năng?',
      variant: 'danger',
      confirmLabel: 'Xóa tất cả',
    });
    if (!confirmed) return;

    setSkills([]);
    setMemberPool(prev => prev.map(m => ({ ...m, assignedSkills: [] })));
  };

  const persistSquadGroups = async (groups: SquadGroup[], applySavedState = false) => {
    try {
      const state = await saveSquadLayout(groups);
      if (applySavedState) {
        setSquadGroups(state.squadGroups || []);
      }
    } catch (err) {
      void alert({ message: getErrorMessage(err, 'Không thể lưu đội hình'), variant: 'error' });
    }
  };

  const handleSquadGroupsChange: React.Dispatch<React.SetStateAction<SquadGroup[]>> = (update) => {
    setSquadGroups(prev => {
      const next = typeof update === 'function' ? update(prev) : update;
      void persistSquadGroups(next, prev.length === 0);
      return next;
    });
  };

  const handleDeleteMember = async (memberId: string) => {
    const member = memberPool.find(item => item.id === memberId);
    const isInactive = member?.active === false;

    try {
      const state = isInactive ? await deleteInactiveMember(memberId) : await deleteMember(memberId);
      await applyAppState(state);
    } catch (err) {
      void alert({ message: getErrorMessage(err, isInactive ? 'Không thể xóa vĩnh viễn thành viên' : 'Không thể gỡ role Bang Viên khỏi thành viên'), variant: 'error' });
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

  const handleUpdateMyIngameName = async (ingameName: string) => {
    try {
      const state = await updateMyIngameName(ingameName);
      await applyAppState(state);
    } catch (err) {
      void alert({ message: getErrorMessage(err, 'Không thể cập nhật tên ingame'), variant: 'error' });
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
  } = useLineupSnapshots({ applyAppState });

  React.useEffect(() => {
    refreshSnapshotsRef.current = refreshSnapshots;
  }, [refreshSnapshots]);

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
      setSquadGroups([]);
      setAccessibleGuilds([]);
      resetSnapshots();
      setLineupEntryMode('menu');
      setIsZoomed(false);
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

  const clearAll = useCallback(async () => {
    const confirmed = await confirm({
      message: 'Bạn có chắc chắn muốn xóa toàn bộ đội hình?',
      variant: 'danger',
      confirmLabel: 'Xóa toàn bộ',
    });
    if (!confirmed) return;

    handleSquadGroupsChange(prev => prev.map(group => ({
      ...group,
      teams: group.teams.map(team => ({
        ...team,
        memberIds: Array(6).fill(''),
        reserveMemberIds: Array(3).fill(''),
      })),
    })));
    setMemberPool(prev => prev.map(m => ({ ...m, assignedSkills: [] })));
  }, [confirm]);

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
        accessibleGuilds={accessibleGuilds}
        onGuildSwitch={handleGuildSwitch}
        switchingGuild={switchingGuild}
      />

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="h-14 flex items-center justify-between border-b border-slate-800/80 bg-slate-950/45 px-6 backdrop-blur-md z-10 shrink-0">
          <div className="flex items-center gap-4">
            <h1 className="text-lg font-bold text-white">
              {activeTab === 'dashboard' ? 'Quản Lý Thành Viên' : 'Sắp Xếp Đội Hình'}
            </h1>
          </div>

          <div className="flex items-center gap-3">
            {activeTab === 'teams' && squadGroups.length > 0 && currentRole !== 'member' && (
              <>
                <button
                  onClick={clearAll}
                  className="p-2 text-slate-500 hover:text-red-400 transition-all hover:scale-110 active:scale-90"
                  title="Xóa toàn bộ"
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="3,6 5,6 21,6" />
                    <path d="M19,6v14a2,2 0 0,1-2,2H7a2,2 0 0,1-2-2V6m3,0V4a2,2 0 0,1,2-2h4a2,2 0 0,1,2,2v2" />
                  </svg>
                </button>

                <button
                  onClick={() => setIsZoomed(!isZoomed)}
                  className={cn(
                    "p-2 rounded-lg transition-all flex items-center justify-center",
                    isZoomed
                      ? "bg-amber-500 text-white shadow-lg shadow-amber-500/30"
                      : "text-slate-500 hover:text-blue-400 hover:bg-slate-800/50"
                  )}
                  title={isZoomed ? "Hiện menu" : "Phóng to"}
                >
                  {isZoomed ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
                </button>
              </>
            )}

          </div>
        </header>

        {/* Tab Content */}
        <div className="flex-1 overflow-hidden">
          {activeTab === 'dashboard' && (
            <MemberDashboard
              members={memberPool}
              onImport={handleDiscordImport}
              onDelete={handleDeleteMember}
              onRefresh={handleSyncDiscord}
              onAcknowledgeClassChange={handleAcknowledgeClassChange}
              onUpdateIngameName={handleUpdateIngameName}
              onUpdateMyIngameName={handleUpdateMyIngameName}
              currentUser={currentUser}
              currentRole={currentRole}
              canManageMembers={canManageMembers}
              canManageSettings={canManageSettings}
              canSelfService={canSelfService}
              roleConfig={roleConfig}
              onUpdateRoleConfig={handleUpdateRoleConfig}
              syncing={syncing}
              lastSyncedAt={lastSyncedAt}
            />
          )}

          {activeTab === 'teams' && (
            <TeamLayout
              squadGroups={squadGroups}
              memberPool={memberPool}
              skills={skills}
              assignedMemberIds={assignedMemberIds}
              onSquadGroupsChange={handleSquadGroupsChange}
              lineupEntryMode={lineupEntryMode}
              onLineupEntryModeChange={updateLineupEntryMode}
              onSquadGroupLeaderChange={handleSquadGroupLeaderChange}
              onMemberPoolChange={setMemberPool}
              onAssignSkillToMember={handleAssignSkillToMember}
              onSkillsChange={setSkills}
              onAddSkills={handleAddSkills}
              onDeleteSkill={handleDeleteSkill}
              onClearAllSkills={handleClearAllSkills}
              onRemoveSkillFromMember={handleRemoveSkillFromMember}
              onClearAll={clearAll}
              getMemberById={getMemberById}
              isZoomed={isZoomed}
              onZoomToggle={() => setIsZoomed(!isZoomed)}
              readOnly={!canManageLineup}
              snapshotsOnly={false}
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
        </div>
      </div>

    </div>
  );
}