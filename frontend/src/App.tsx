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
import { AdminDashboard } from './features/admin/AdminDashboard.tsx';
import { BillingView } from './features/billing/BillingView.tsx';
import { SubscriptionBanner } from './features/billing/SubscriptionBanner.tsx';
import { OnboardingView } from './features/onboarding/OnboardingView.tsx';
import { mergeMemberDeltaIntoPool, replaceMemberPoolPreservingSkills, sortMembersByDisplayName } from './features/members/memberPoolUtils.ts';
import { AppStateResponse, DiscordUser, loginWithDiscord, SystemAdminRole } from './services/discordApi.ts';
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
  const [activeGuildId, setActiveGuildId] = useState<string | null>(null);
  const [needsOnboarding, setNeedsOnboarding] = useState(false);
  const [systemAdminRole, setSystemAdminRole] = useState<SystemAdminRole | null>(null);

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
  const [subscription, setSubscription] = useState<AppStateResponse['subscription']>(null);
  const [appSystemAdmin, setAppSystemAdmin] = useState<AppStateResponse['systemAdmin']>(null);
  const [appNeedsOnboarding, setAppNeedsOnboarding] = useState(false);
  const [attendanceActionLoading, setAttendanceActionLoading] = useState(false);
  const [, setSyncing] = useState(false);
  const realtimeDebugEnabled = import.meta.env.DEV || import.meta.env.VITE_REALTIME_DEBUG === 'true';
  const { alert, confirm } = useSystemDialog();

  useGuildDocumentMetadata(currentGuild);

  const hasSystemAdminEntry = Boolean(appSystemAdmin?.role || systemAdminRole);
  const showBillingTab = Boolean(currentGuild && subscription);
  const { activeTab, updateActiveTab, clearActiveTabState } = useGuildActiveTab({
    currentUser,
    currentGuild,
    permissions,
    showBillingTab,
    showAdminTab: hasSystemAdminEntry,
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
    handleMemberNoteChange,
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
    setSubscription,
    setAppSystemAdmin,
    setAppNeedsOnboarding,
    setActiveGuildId,
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

  // Computed values
  const canMutateGuild = subscription?.isMutationAllowed ?? true;
  const canManageLineup = permissions.includes('manage:lineup');
  const canManageSnapshots = permissions.includes('manage:snapshots');
  const canRestoreSnapshots = permissions.includes('restore:snapshots');
  const canManageMembers = permissions.includes('manage:members');
  const canManageSettings = permissions.includes('manage:settings');
  const canSelfService = permissions.includes('view:guild');
  const effectiveCanManageLineup = canManageLineup && canMutateGuild;
  const effectiveCanManageSnapshots = canManageSnapshots && canMutateGuild;
  const effectiveCanRestoreSnapshots = canRestoreSnapshots && canMutateGuild;
  const effectiveCanManageMembers = canManageMembers && canMutateGuild;
  const effectiveCanManageSettings = canManageSettings && canMutateGuild;
  const mutationDisabledReason = canMutateGuild ? undefined : 'Subscription hiện không cho phép thay đổi dữ liệu.';

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
    handleAcknowledgeClassChange,
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
  } = useGuildContext(applyAppState, resetSnapshots, setActiveGuildId);

  useAuthBootstrap({
    loadAppState,
    setAuthLoading,
    setIsAuthenticated,
    setIsAuthorized,
    setBlockedReason,
    setCurrentUser,
    setActiveGuildId,
    setNeedsOnboarding,
    setSystemAdminRole,
    setAccessibleGuilds,
  });

  React.useEffect(() => {
    if (isAuthenticated) {
      void loadAccessibleGuilds();
    }
  }, [isAuthenticated, loadAccessibleGuilds]);

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
    setActiveGuildId,
    setNeedsOnboarding,
    setAppNeedsOnboarding,
    setSubscription,
    setAttendance,
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

  const showGuildSetupOnboarding = isAuthenticated && isAuthorized && currentGuild && currentRole === 'owner' && !currentGuild.onboardingCompletedAt;

  if (!isAuthorized || showGuildSetupOnboarding) {
    const hasAccessibleGuilds = accessibleGuilds.length > 0;
    const showOnboarding = showGuildSetupOnboarding || needsOnboarding || appNeedsOnboarding || !hasAccessibleGuilds;

    if (showOnboarding) {
      return (
        <OnboardingView
          currentGuild={currentGuild}
          accessibleGuilds={accessibleGuilds}
          blockedReason={blockedReason}
          systemAdminRole={systemAdminRole}
          switchingGuild={switchingGuild}
          applyAppState={applyAppState}
          loadAppState={loadAppState}
          loadAccessibleGuilds={loadAccessibleGuilds}
          onGuildSwitch={handleGuildSwitch}
          onOpenAdmin={() => {
            setIsAuthorized(true);
            updateActiveTab('admin');
          }}
          onConnected={state => {
            const authorized = Boolean(state.permissions?.includes('view:guild'));
            setIsAuthorized(authorized);
            setNeedsOnboarding(Boolean(state.needsOnboarding));
            setBlockedReason(authorized ? null : 'Bạn chưa có quyền truy cập server vừa kết nối.');
            updateActiveTab('dashboard');
          }}
          onOpenDashboard={() => {
            setIsAuthorized(true);
            updateActiveTab('dashboard');
          }}
          onOpenSettings={() => {
            setIsAuthorized(true);
            updateActiveTab('dashboard');
          }}
          onOpenAttendance={() => {
            setIsAuthorized(true);
            updateActiveTab('attendance');
          }}
          onLogout={handleLogout}
        />
      );
    }

    return (
      <div className="app-shell min-h-screen text-slate-100 flex items-center justify-center p-6 font-sans">
        <div className="w-full max-w-lg rounded-2xl border border-amber-400/30 bg-slate-900/75 p-8 text-center shadow-2xl shadow-amber-950/20 space-y-4">
          <h1 className="text-xl font-black uppercase tracking-widest text-white">Không có quyền truy cập server</h1>
          <p className="text-sm text-slate-300">{blockedReason || 'Quyền truy cập server đã chọn đã thay đổi hoặc server không còn khả dụng.'}</p>
          <p className="text-xs text-slate-500">Hãy chọn lại server khả dụng hoặc liên hệ quản trị server để kiểm tra role.</p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            {hasSystemAdminEntry && (
              <button
                onClick={() => {
                  setIsAuthorized(true);
                  updateActiveTab('admin');
                }}
                className="inline-flex items-center gap-2 px-5 py-3 bg-violet-500 hover:bg-violet-400 text-white rounded-xl font-black uppercase tracking-widest text-xs transition-colors"
              >
                Mở Admin Console
              </button>
            )}
            {hasAccessibleGuilds && !activeGuildId && (
              <button
                onClick={() => handleGuildSwitch(accessibleGuilds[0].id)}
                disabled={switchingGuild}
                className="inline-flex items-center gap-2 px-5 py-3 bg-amber-500 hover:bg-amber-400 disabled:bg-amber-500/60 text-slate-950 rounded-xl font-black uppercase tracking-widest text-xs transition-colors"
              >
                Chọn server đầu tiên
              </button>
            )}
            <button
              onClick={handleLogout}
              className="inline-flex items-center gap-2 px-5 py-3 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl font-bold text-xs transition-colors"
            >
              Đăng xuất
            </button>
          </div>
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
        activeGuildId={activeGuildId}
        switchingGuild={switchingGuild}
        onGuildSwitch={handleGuildSwitch}
        showAttendanceTab={canManageLineup}
        showBillingTab={showBillingTab}
        showAdminTab={hasSystemAdminEntry}
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
          subscription={subscription}
        />

        <SubscriptionBanner subscription={subscription} onOpenBilling={() => updateActiveTab('billing')} />

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
              canManageMembers={effectiveCanManageMembers}
              canManageSettings={effectiveCanManageSettings}
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
                onMemberNoteChange={handleMemberNoteChange}
                onImportAttendanceToLineup={handleImportAttendanceToLineup}
                lineupMemberSource={lineupMemberSource}
                lineupMemberSourceSessionId={lineupMemberSourceSessionId}
                lineupMemberSourceSession={lineupMemberSourceSession}
                lineupMemberSourceIncludeNotVoted={lineupMemberSourceIncludeNotVoted}
                onLineupMemberSourceChange={setLineupMemberSource}
                onLineupMemberSourceSessionChange={setLineupMemberSourceSession}
                onLineupMemberSourceIncludeNotVotedChange={setLineupMemberSourceIncludeNotVoted}
                getMemberById={getMemberById}
                readOnly={lineupReadOnly || !canMutateGuild}
                snapshotsOnly={false}
                canManageLineup={effectiveCanManageLineup}
                canManageSnapshots={effectiveCanManageSnapshots}
                canRestoreSnapshots={effectiveCanRestoreSnapshots}
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
              mutationDisabled={!canMutateGuild}
              mutationDisabledReason={mutationDisabledReason}
              onSetChannel={handleSetAttendanceChannel}
              onOpenSession={handleOpenAttendanceSession}
              onCloseSession={handleCloseAttendanceSession}
              onRefreshSession={handleRefreshAttendanceSession}
              onDeleteGvgParticipationMonth={handleDeleteGvgParticipationMonth}
            />
          )}

          {activeTab === 'billing' && showBillingTab && <BillingView />}

          {activeTab === 'admin' && hasSystemAdminEntry && <AdminDashboard role={appSystemAdmin?.role ?? systemAdminRole} />}
        </div>
      </div>

    </div>
  );
}