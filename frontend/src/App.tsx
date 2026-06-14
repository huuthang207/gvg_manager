/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useCallback, useMemo } from 'react';
import { Member, Skill, SquadGroup } from './types.ts';
import { Sidebar } from './features/app/Sidebar.tsx';
import { MemberDashboard } from './features/members/MemberDashboard.tsx';
import { TeamLayout } from './features/lineup/TeamLayout.tsx';
import { AttendanceView } from './features/attendance/AttendanceView.tsx';
import { mergeMemberDeltaIntoPool, replaceMemberPoolPreservingSkills, sortMembersByDisplayName } from './features/members/memberPoolUtils.ts';
import { AppStateResponse, DiscordUser, loginWithDiscord } from './services/discordApi.ts';
import { useLineupSnapshots } from './hooks/useLineupSnapshots.ts';
import { useAppStateLoader } from './features/app/useAppStateLoader.ts';
import { useGuildContext } from './features/guild/useGuildContext.ts';
import { useAuthBootstrap } from './features/auth/useAuthBootstrap.ts';
import { useSystemDialog } from './features/app/SystemDialogProvider.tsx';
import { useGuildRealtime } from './features/app/useGuildRealtime.ts';
import { useMemberActions } from './features/members/useMemberActions.ts';
import { useAttendanceActions } from './features/attendance/useAttendanceActions.ts';
import { useLineupWorkspace } from './features/lineup/useLineupWorkspace.ts';
import { useGuildDocumentMetadata } from './features/app/useGuildDocumentMetadata.ts';
import { useGuildActiveTab } from './features/app/useGuildActiveTab.ts';
import { AppHeader } from './features/app/AppHeader.tsx';
import { useAppSessionActions } from './features/app/useAppSessionActions.ts';
import { useGvgParticipationStats } from './features/attendance/useGvgParticipationStats.ts';

export default function App() {
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
  const [attendanceActionLoading, setAttendanceActionLoading] = useState(false);
  const [, setSyncing] = useState(false);
  const realtimeDebugEnabled = import.meta.env.DEV || import.meta.env.VITE_REALTIME_DEBUG === 'true';
  const { alert, confirm } = useSystemDialog();

  useGuildDocumentMetadata(currentGuild);

  const { activeTab, updateActiveTab, clearActiveTabState } = useGuildActiveTab({
    currentUser,
    currentGuild,
    permissions,
  });
  const [teamsTabMounted, setTeamsTabMounted] = useState(activeTab === 'teams');

  React.useEffect(() => {
    if (activeTab === 'teams') {
      setTeamsTabMounted(true);
    }
  }, [activeTab]);

  const mergeMemberDelta = useCallback((upsertMembers: Member[], removedMemberIds: string[]) => {
    setMemberPool(prev => mergeMemberDeltaIntoPool(prev, upsertMembers, removedMemberIds));
  }, []);

  const replaceMemberPool = useCallback((members: Member[]) => {
    setMemberPool(prev => sortMembersByDisplayName(replaceMemberPoolPreservingSkills(prev, members)));
  }, []);

  const {
    lineupLock,
    setLineupLock,
    lineupLockActionLoading,
    lineupReadOnly,
    assignedMemberIds,
    lineupVisibleMemberPool,
    lineupMemberSource,
    lineupMemberSourceSessionId,
    lineupMemberSourceSession,
    lineupMemberSourceIncludeNotVoted,
    refreshLineupLock,
    handleAcquireLineupLock,
    handleReleaseLineupLock,
    handleOverrideLineupLock,
    handleSquadGroupsChange,
    handleResetSquadGroups,
    handleSquadGroupLeaderChange,
    handleImportAttendanceToLineup,
    flushPendingSquadLayoutSave,
    clearLineupWorkspaceUiState,
    setLineupMemberSource,
    setLineupMemberSourceSession,
    setLineupMemberSourceIncludeNotVoted,
    releaseHeldLineupLock,
  } = useLineupWorkspace({
    squadGroups,
    setSquadGroups,
    memberPool,
    setMemberPool,
    currentGuild,
    isAuthenticated,
    isAuthorized,
    permissions,
    updateActiveTab,
    alert,
    confirm,
  });

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

  const {
    gvgParticipationMonth,
    setGvgParticipationMonth,
    gvgParticipationStats,
    setGvgParticipationStats,
    refreshGvgParticipationStats,
  } = useGvgParticipationStats({
    currentGuild,
    isAuthenticated,
    isAuthorized,
    permissions,
  });

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

  const dashboardMembers = useMemo(() => memberPool.map(member => ({
    ...member,
    gvgParticipationCount: gvgParticipationStats[member.id] ?? 0,
  })), [gvgParticipationStats, memberPool]);

  const getMemberById = useCallback((id: string) => {
    return memberPool.find(m => m.id === id) || null;
  }, [memberPool]);

  // Handlers
  const {
    handleSetAttendanceChannel,
    handleOpenAttendanceSession,
    handleCloseAttendanceSession,
    handleRefreshAttendanceSession,
    handleDeleteGvgParticipationMonth,
  } = useAttendanceActions({
    applyAppState,
    refreshGvgParticipationStats,
    setAttendanceActionLoading,
    alert,
    confirm,
  });

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

  const {
    handleAssignSkillToMember,
    handleRemoveSkillFromMember,
    handleDeleteMember,
    handleUpdateIngameName,
    handleUpdateMemberClassRole,
    handleUpdateMyIngameName,
    handleResetCurrentGuildData,
    handleUpdateRoleConfig,
  } = useMemberActions({
    applyAppState,
    loadAppState,
    setMemberPool,
    setSkills,
    setSyncing,
    resetSnapshots,
    updateActiveTab,
    alert,
  });

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
    replaceMemberPool,
    refreshLineupLock,
    refreshGvgParticipationStats,
    refreshSnapshots,
    realtimeDebugEnabled,
  });


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

  const { handleLogout } = useAppSessionActions({
    closeRealtimeConnection,
    clearActiveTabState,
    clearLineupWorkspaceUiState,
    releaseHeldLineupLock,
    resetSnapshots,
    setIsAuthenticated,
    setCurrentUser,
    setMemberPool,
    setSkills,
    setRoleConfig,
    setCurrentGuild,
    setCurrentRole,
    setPermissions,
    setLineupLock,
    setGvgParticipationStats,
    setSquadGroups,
    setAccessibleGuilds,
  });

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
        <AppHeader
          activeTab={activeTab}
          canManageLineup={canManageLineup}
          lineupLock={lineupLock}
          lineupLockActionLoading={lineupLockActionLoading}
          onAcquireLineupLock={handleAcquireLineupLock}
          onReleaseLineupLock={handleReleaseLineupLock}
          onOverrideLineupLock={handleOverrideLineupLock}
        />

        {/* Tab Content */}
        <div className="flex-1 overflow-hidden">
          {activeTab === 'dashboard' && (
            <MemberDashboard
              members={dashboardMembers}
              gvgParticipationMonth={gvgParticipationMonth}
              onGvgParticipationMonthChange={setGvgParticipationMonth}
              onImport={handleDiscordImport}
              onDelete={handleDeleteMember}
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

          {teamsTabMounted && (
            <div className={activeTab === 'teams' ? 'h-full' : 'hidden'}>
              <TeamLayout
                squadGroups={squadGroups}
                memberPool={lineupVisibleMemberPool}
                fullMemberPool={memberPool}
                skills={skills}
                currentUser={currentUser}
                assignedMemberIds={assignedMemberIds}
                onSquadGroupsChange={handleSquadGroupsChange}
                onResetSquadGroups={handleResetSquadGroups}
                onSquadGroupLeaderChange={handleSquadGroupLeaderChange}
                onMemberPoolChange={setMemberPool}
                onAssignSkillToMember={handleAssignSkillToMember}
                onSkillsChange={setSkills}
                onRemoveSkillFromMember={handleRemoveSkillFromMember}
                onImportAttendanceToLineup={handleImportAttendanceToLineup}
                lineupMemberSource={lineupMemberSource}
                lineupMemberSourceSessionId={lineupMemberSourceSessionId}
                lineupMemberSourceSession={lineupMemberSourceSession}
                lineupMemberSourceIncludeNotVoted={lineupMemberSourceIncludeNotVoted}
                onLineupMemberSourceChange={setLineupMemberSource}
                onLineupMemberSourceSessionChange={setLineupMemberSourceSession}
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
            </div>
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