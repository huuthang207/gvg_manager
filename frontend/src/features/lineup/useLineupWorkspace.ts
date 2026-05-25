import React from 'react';
import type { Member, SquadGroup } from '../../types.ts';
import type { AppStateResponse } from '../../services/apiTypes.ts';
import type { AttendanceSession } from '../../shared/types/auth.ts';
import type { AttendanceLineupImportPayload, LineupMemberSource } from '../../shared/types/lineup.ts';
import {
  acquireLineupEditLock,
  getLineupEditLock,
  heartbeatLineupEditLock,
  overrideLineupEditLock,
  releaseLineupEditLock,
  saveSquadLayout,
} from '../../services/discordApi.ts';
import { getErrorMessage } from '../../lib/error.ts';
import { collectAssignedMemberIds, importMembersIntoSquadGroups } from './attendanceLineupImport.ts';
import type { Tab } from '../app/activeTabStorage.ts';

interface UseLineupWorkspaceParams {
  squadGroups: SquadGroup[];
  setSquadGroups: React.Dispatch<React.SetStateAction<SquadGroup[]>>;
  memberPool: Member[];
  setMemberPool: React.Dispatch<React.SetStateAction<Member[]>>;
  currentGuild: AppStateResponse['guild'] | null;
  isAuthenticated: boolean;
  isAuthorized: boolean;
  permissions: string[];
  updateActiveTab: (tab: Tab) => void;
  alert: (options: { message: string; variant?: 'info' | 'success' | 'warning' | 'error' }) => Promise<void>;
  confirm: (options: { message: string; variant?: 'info' | 'success' | 'warning' | 'danger'; confirmLabel?: string }) => Promise<boolean>;
}

export function useLineupWorkspace({
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
}: UseLineupWorkspaceParams) {
  const [lineupMemberSource, setLineupMemberSource] = React.useState<LineupMemberSource>('guild');
  const [lineupMemberSourceSession, setLineupMemberSourceSessionState] = React.useState<AttendanceSession | null>(null);
  const [lineupMemberSourceIncludeNotVoted, setLineupMemberSourceIncludeNotVoted] = React.useState(false);
  const [lineupLock, setLineupLock] = React.useState<AppStateResponse['lineupLock']>(null);
  const [lineupLockActionLoading, setLineupLockActionLoading] = React.useState(false);
  const squadLayoutSaveRef = React.useRef<Promise<void>>(Promise.resolve());

  const canManageLineup = permissions.includes('manage:lineup');
  const lineupReadOnly = !canManageLineup || !lineupLock?.isHeldByMe;
  const lineupMemberSourceSessionId = lineupMemberSourceSession?.id ?? null;

  const assignedMemberIds = React.useMemo(() => collectAssignedMemberIds(squadGroups), [squadGroups]);

  const lineupVisibleMemberPool = React.useMemo(() => {
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

  const refreshLineupLock = React.useCallback(async () => {
    if (!currentGuild || !permissions.includes('view:guild')) {
      setLineupLock(null);
      return;
    }

    try {
      setLineupLock(await getLineupEditLock());
    } catch {
    }
  }, [currentGuild, permissions]);

  const persistSquadGroups = React.useCallback((groups: SquadGroup[], applySavedState = false) => {
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
  }, [alert, setSquadGroups]);

  const flushPendingSquadLayoutSave = React.useCallback(async () => {
    await squadLayoutSaveRef.current;
  }, []);

  const handleSquadGroupsChange: React.Dispatch<React.SetStateAction<SquadGroup[]>> = React.useCallback((update) => {
    setSquadGroups(prev => {
      const next = typeof update === 'function' ? update(prev) : update;

      if (next.length === 0 && prev.length > 0) {
        const assignedIds = collectAssignedMemberIds(prev);
        setMemberPool(members => members.map(member => assignedIds.has(member.id) ? { ...member, assignedSkills: [] } : member));
      }

      void persistSquadGroups(next, prev.length === 0);
      return next;
    });
  }, [persistSquadGroups, setMemberPool, setSquadGroups]);

  const handleImportAttendanceToLineup = React.useCallback((payload: AttendanceLineupImportPayload) => {
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

  const handleMemberNoteChange = React.useCallback((teamId: string, memberId: string, note: string) => {
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
  }, [handleSquadGroupsChange]);

  const runLineupLockAction = React.useCallback(async (action: () => Promise<AppStateResponse['lineupLock']>, fallbackMessage: string) => {
    setLineupLockActionLoading(true);
    try {
      setLineupLock(await action());
    } catch (err) {
      void alert({ message: getErrorMessage(err, fallbackMessage), variant: 'error' });
      void refreshLineupLock();
    } finally {
      setLineupLockActionLoading(false);
    }
  }, [alert, refreshLineupLock]);

  const handleAcquireLineupLock = React.useCallback(() => {
    void runLineupLockAction(acquireLineupEditLock, 'Không thể bắt đầu chỉnh sửa đội hình');
  }, [runLineupLockAction]);

  const handleReleaseLineupLock = React.useCallback(() => {
    void runLineupLockAction(releaseLineupEditLock, 'Không thể kết thúc chỉnh sửa đội hình');
  }, [runLineupLockAction]);

  const handleOverrideLineupLock = React.useCallback(async () => {
    const confirmed = await confirm({
      message: `Đội hình đang được chỉnh bởi ${lineupLock?.holderName || 'người khác'}. Bạn có chắc muốn chiếm quyền chỉnh sửa?`,
      variant: 'warning',
      confirmLabel: 'Chiếm quyền',
    });
    if (!confirmed) return;

    void runLineupLockAction(overrideLineupEditLock, 'Không thể chiếm quyền chỉnh sửa đội hình');
  }, [confirm, lineupLock?.holderName, runLineupLockAction]);

  const handleSquadGroupLeaderChange = React.useCallback((groupId: string, leaderMemberId: string | null) => {
    handleSquadGroupsChange(prev => prev.map(group => {
      if (group.id !== groupId) return group;
      return {
        ...group,
        leaderMemberId,
      };
    }));
  }, [handleSquadGroupsChange]);

  const clearLineupWorkspaceUiState = React.useCallback(() => {
    setLineupMemberSource('guild');
    setLineupMemberSourceSessionState(null);
    setLineupMemberSourceIncludeNotVoted(false);
  }, []);

  const setLineupMemberSourceSession = React.useCallback((session: AttendanceSession | null) => {
    setLineupMemberSourceSessionState(session);
  }, []);

  const releaseHeldLineupLock = React.useCallback(() => {
    if (lineupLock?.isHeldByMe) {
      void releaseLineupEditLock().catch(() => undefined);
    }
  }, [lineupLock?.isHeldByMe]);

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

  return {
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
    handleSquadGroupLeaderChange,
    handleMemberNoteChange,
    handleImportAttendanceToLineup,
    flushPendingSquadLayoutSave,
    clearLineupWorkspaceUiState,
    setLineupMemberSource,
    setLineupMemberSourceSession,
    setLineupMemberSourceIncludeNotVoted,
    releaseHeldLineupLock,
  };
}
