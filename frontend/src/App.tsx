import React, { useCallback, useMemo, useState } from 'react';
import type { Member } from './types.ts';
import { Sidebar } from './features/app/Sidebar.tsx';
import { MemberDashboard } from './features/members/MemberDashboard.tsx';
import { AttendanceView } from './features/attendance/AttendanceView.tsx';
import { mergeMemberDeltaIntoPool, replaceMemberPool, sortMembersByDisplayName } from './features/members/memberPoolUtils.ts';
import { AppStateResponse, DiscordUser, loginWithDiscord } from './services/discordApi.ts';
import { useAppStateLoader } from './features/app/useAppStateLoader.ts';
import { useAuthBootstrap } from './features/auth/useAuthBootstrap.ts';
import { useSystemDialog } from './features/app/SystemDialogProvider.tsx';
import { useGuildRealtime } from './features/app/useGuildRealtime.ts';
import { useMemberActions } from './features/members/useMemberActions.ts';
import { useAttendanceActions } from './features/attendance/useAttendanceActions.ts';
import { useGuildDocumentMetadata } from './features/app/useGuildDocumentMetadata.ts';
import { useGuildActiveTab } from './features/app/useGuildActiveTab.ts';
import { AppHeader } from './features/app/AppHeader.tsx';
import { useAppSessionActions } from './features/app/useAppSessionActions.ts';
import { useGvgParticipationStats } from './features/attendance/useGvgParticipationStats.ts';
import { GvgLineupWorkspace } from './features/gvg-lineup/GvgLineupWorkspace.tsx';
import type { GvgLineup } from './services/apiTypes.ts';

export default function App() {
  const [authLoading, setAuthLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [blockedReason, setBlockedReason] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<DiscordUser | null>(null);
  const [memberPool, setMemberPool] = useState<Member[]>([]);
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null);
  const [roleConfig, setRoleConfig] = useState<AppStateResponse['roleConfig']>(null);
  const [currentRole, setCurrentRole] = useState<AppStateResponse['currentRole']>(null);
  const [permissions, setPermissions] = useState<string[]>([]);
  const [currentGuild, setCurrentGuild] = useState<AppStateResponse['guild']>(null);
  const [attendance, setAttendance] = useState<AppStateResponse['attendance']>({
    gvg: { type: 'GVG', config: null, activeSession: null, recentSessions: [] },
    scrim: { type: 'SCRIM', config: null, activeSession: null, recentSessions: [] },
  });
  const [attendanceActionLoading, setAttendanceActionLoading] = useState(false);
  const [gvgLineup, setGvgLineup] = useState<GvgLineup | null>(null);
  const [, setSyncing] = useState(false);
  const realtimeDebugEnabled = import.meta.env.DEV || import.meta.env.VITE_REALTIME_DEBUG === 'true';
  const { alert, confirm } = useSystemDialog();

  useGuildDocumentMetadata(currentGuild);

  const { activeTab, updateActiveTab, clearActiveTabState } = useGuildActiveTab({ currentUser, currentGuild, permissions });

  const mergeMemberDelta = useCallback((upsertMembers: Member[], removedMemberIds: string[]) => {
    setMemberPool(prev => mergeMemberDeltaIntoPool(prev, upsertMembers, removedMemberIds));
  }, []);

  const replaceMemberPoolState = useCallback((members: Member[]) => {
    setMemberPool(prev => sortMembersByDisplayName(replaceMemberPool(prev, members)));
  }, []);

  const { applyAppState, loadAppState } = useAppStateLoader({
    setMemberPool,
    setLastSyncedAt,
    setRoleConfig,
    setCurrentGuild,
    setCurrentRole,
    setPermissions,
    setCurrentUser,
    setAttendance,
    setGvgLineup,
  });

  const {
    gvgParticipationMonth,
    setGvgParticipationMonth,
    gvgParticipationStats,
    setGvgParticipationStats: replaceGvgParticipationStats,
    refreshGvgParticipationStats,
  } = useGvgParticipationStats({ currentGuild, isAuthenticated, isAuthorized, permissions });

  useAuthBootstrap({ loadAppState, setAuthLoading, setIsAuthenticated, setIsAuthorized, setBlockedReason, setCurrentUser });

  const canManageAttendance = permissions.includes('manage:attendance');
  const canManageMembers = permissions.includes('manage:members');
  const canManageSettings = permissions.includes('manage:settings');
  const canSelfService = permissions.includes('view:guild');

  const dashboardMembers = useMemo(() => memberPool.map(member => ({
    ...member,
    gvgParticipationCount: gvgParticipationStats[member.id] ?? 0,
  })), [gvgParticipationStats, memberPool]);

  const {
    handleSetAttendanceChannel,
    handleOpenAttendanceSession,
    handleCloseAttendanceSession,
    handleRefreshAttendanceSession,
    handleDeleteGvgParticipationMonth,
  } = useAttendanceActions({ applyAppState, refreshGvgParticipationStats, setAttendanceActionLoading, alert, confirm });

  const {
    handleDeleteMember,
    handleUpdateIngameName,
    handleUpdateMemberClassRole,
    handleUpdateMyIngameName,
    handleResetCurrentGuildData,
    handleUpdateRoleConfig,
  } = useMemberActions({ applyAppState, loadAppState, setSyncing, updateActiveTab, alert });

  const gvgLineupMutationPendingRef = React.useRef(false);

  const { closeRealtimeConnection } = useGuildRealtime({
    isAuthenticated,
    isAuthorized,
    currentGuild,
    lastSyncedAt,
    applyAppState,
    setIsAuthorized,
    setBlockedReason,
    setLastSyncedAt,
    mergeMemberDelta,
    replaceMemberPool: replaceMemberPoolState,
    refreshGvgParticipationStats,
    shouldIgnoreGvgLineupRealtimeUpdate: () => gvgLineupMutationPendingRef.current,
    realtimeDebugEnabled,
  });

  const { handleLogout } = useAppSessionActions({
    closeRealtimeConnection,
    clearActiveTabState,
    setIsAuthenticated,
    setCurrentUser,
    setMemberPool,
    setRoleConfig,
    setCurrentGuild,
    setCurrentRole,
    setPermissions,
    setGvgParticipationStats: replaceGvgParticipationStats,
    setGvgLineup,
  });

  const handleDiscordImport = async (importedMembers: Member[]) => {
    setMemberPool(prev => {
      const existingDiscordIds = new Set(prev.filter(member => member.discordId).map(member => member.discordId));
      return [...importedMembers.filter(member => !existingDiscordIds.has(member.discordId)), ...prev];
    });
    try {
      await loadAppState();
    } catch (err) {
      console.error('Failed to reload app state:', err);
    }
    updateActiveTab('dashboard');
  };

  if (authLoading) return <div className="app-shell flex h-screen items-center justify-center text-slate-300 font-sans">Đang tải dữ liệu...</div>;

  if (!isAuthenticated) {
    return <div className="app-shell min-h-screen text-slate-100 flex items-center justify-center p-6 font-sans"><div className="app-surface w-full max-w-md rounded-2xl p-8 text-center space-y-4"><h1 className="text-xl font-black uppercase tracking-widest text-white">GvG Manager</h1><p className="text-sm text-slate-400">Đăng nhập Discord để vào hệ thống.</p><button onClick={loginWithDiscord} className="inline-flex items-center gap-2 px-5 py-3 bg-[#5865F2] hover:bg-[#4752C4] text-white rounded-xl font-black uppercase tracking-widest text-xs transition-all shadow-lg shadow-[#5865F2]/20">Đăng nhập với Discord</button></div></div>;
  }

  if (!isAuthorized) {
    return <div className="app-shell min-h-screen text-slate-100 flex items-center justify-center p-6 font-sans"><div className="w-full max-w-lg rounded-2xl border border-red-400/30 bg-slate-900/75 p-8 text-center shadow-2xl shadow-red-950/20 space-y-4"><h1 className="text-xl font-black uppercase tracking-widest text-white">Không có quyền truy cập</h1><p className="text-sm text-slate-300">{blockedReason || 'Tài khoản của bạn chưa đủ điều kiện vào hệ thống.'}</p><p className="text-xs text-slate-500">Vui lòng liên hệ quản trị bang để được cấp đúng role yêu cầu.</p><button onClick={handleLogout} className="inline-flex items-center gap-2 px-5 py-3 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl font-bold text-xs transition-colors">Đăng xuất</button></div></div>;
  }

  return (
    <div className="app-shell flex h-screen overflow-hidden text-slate-100 font-sans">
      <Sidebar activeTab={activeTab} onTabChange={updateActiveTab} currentUser={currentUser} onLogout={handleLogout} currentGuild={currentGuild} canManageAttendance={canManageAttendance} />
      <div className="min-h-0 flex-1 flex flex-col overflow-hidden">
        <AppHeader activeTab={activeTab} />
        <div className="min-h-0 flex flex-1 flex-col overflow-hidden">
          {activeTab === 'dashboard' && <MemberDashboard members={dashboardMembers} gvgParticipationMonth={gvgParticipationMonth} onGvgParticipationMonthChange={setGvgParticipationMonth} onImport={handleDiscordImport} onDelete={handleDeleteMember} onUpdateIngameName={handleUpdateIngameName} onUpdateMemberClassRole={handleUpdateMemberClassRole} onUpdateMyIngameName={handleUpdateMyIngameName} currentUser={currentUser} currentRole={currentRole} canManageMembers={canManageMembers} canManageSettings={canManageSettings} canSelfService={canSelfService} roleConfig={roleConfig} onUpdateRoleConfig={handleUpdateRoleConfig} onResetCurrentGuildData={handleResetCurrentGuildData} lastSyncedAt={lastSyncedAt} />}
          {activeTab === 'gvg-lineup' && <GvgLineupWorkspace lineup={gvgLineup} members={memberPool} canEdit={currentRole === 'owner'} onLineupChange={setGvgLineup} onLineupMutationPendingChange={pending => { gvgLineupMutationPendingRef.current = pending; }} onReload={async () => { await loadAppState(); }} />}
          {activeTab === 'attendance' && canManageAttendance && <AttendanceView attendance={attendance} members={memberPool} actionLoading={attendanceActionLoading} onSetChannel={handleSetAttendanceChannel} onOpenSession={handleOpenAttendanceSession} onCloseSession={handleCloseAttendanceSession} onRefreshSession={handleRefreshAttendanceSession} onDeleteGvgParticipationMonth={handleDeleteGvgParticipationMonth} />}
        </div>
      </div>
    </div>
  );
}
