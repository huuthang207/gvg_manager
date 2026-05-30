/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useCallback, useMemo } from 'react';
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragStartEvent,
  DragEndEvent,
  defaultDropAnimationSideEffects
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy
} from '@dnd-kit/sortable';
import { Member, Skill, SquadGroup } from '../../types.ts';
import { LineupSnapshotActions, LineupSnapshotState } from '../../hooks/useLineupSnapshots.ts';
import { DiscordUser, getAttendanceHistory, getAttendanceSession } from '../../services/discordApi.ts';
import { MemberPool } from './MemberPool.tsx';
import { SkillPool } from './SkillPool.tsx';
import { MainBoard } from './MainBoard.tsx';
import { MemberCard } from './MemberCard.tsx';
import { SquadSetupScreen } from './SquadSetupScreen.tsx';
import { SavedLineupsView } from './SavedLineupsView.tsx';
import { LineupEntryMenu } from './LineupEntryMenu.tsx';
import { LineupSnapshotsModal } from './LineupSnapshotsModal.tsx';
import { ClipboardList, Loader2, Users, X, Zap } from 'lucide-react';
import { useSystemDialog } from '../app/SystemDialogProvider.tsx';
import type { AttendanceSession } from '../../shared/types/auth.ts';
import type { AttendanceLineupImportPayload, LineupMemberSource } from '../../shared/types/lineup.ts';
import { createLineupCollisionDetection } from './skillCollisionDetection.ts';

type EmptyLineupMode = 'source' | 'create';

function formatAttendanceDate(value: string | null) {
  if (!value) return '-';
  return new Date(value).toLocaleString('vi-VN');
}

function getMemberName(member: Member) {
  return member.ingameName || member.discordDisplayName || member.name || member.discordUsername || 'Không rõ tên';
}

interface AttendanceImportModalProps {
  sessions: AttendanceSession[];
  selectedSession: AttendanceSession | null;
  memberPool: Member[];
  loading: boolean;
  detailLoading: boolean;
  error: string;
  includeNotVoted: boolean;
  hasMore: boolean;
  onClose: () => void;
  onSelectSession: (sessionId: string) => void;
  onLoadMore: () => void;
  onIncludeNotVotedChange: (value: boolean) => void;
  onImport: (payload: AttendanceLineupImportPayload) => void;
}

function AttendanceImportModal({
  sessions,
  selectedSession,
  memberPool,
  loading,
  detailLoading,
  error,
  includeNotVoted,
  hasMore,
  onClose,
  onSelectSession,
  onLoadMore,
  onIncludeNotVotedChange,
  onImport,
}: AttendanceImportModalProps) {
  const votedMemberIds = React.useMemo(() => new Set((selectedSession?.votes || []).map(vote => vote.memberId)), [selectedSession]);
  const notVotedMembers = React.useMemo(() => (
    selectedSession
      ? memberPool
        .filter(member => member.active !== false && !votedMemberIds.has(member.id))
        .sort((a, b) => {
          const classCompare = a.classType.localeCompare(b.classType, 'vi');
          if (classCompare !== 0) return classCompare;
          return getMemberName(a).localeCompare(getMemberName(b), 'vi');
        })
      : []
  ), [memberPool, selectedSession, votedMemberIds]);
  const mainMemberIds = React.useMemo(() => selectedSession?.votes.filter(vote => vote.choice === 'GO').map(vote => vote.memberId) || [], [selectedSession]);
  const standbyMemberIds = React.useMemo(() => selectedSession?.votes.filter(vote => vote.choice === 'MAYBE').map(vote => vote.memberId) || [], [selectedSession]);
  const reserveMemberIds = includeNotVoted ? [...standbyMemberIds, ...notVotedMembers.map(member => member.id)] : standbyMemberIds;
  const canImport = !!selectedSession && !detailLoading && (mainMemberIds.length > 0 || reserveMemberIds.length > 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-3 backdrop-blur-sm lg:p-6" onClick={onClose}>
      <div className="max-h-[92vh] w-full max-w-6xl overflow-hidden rounded-2xl border border-slate-700 bg-slate-950 shadow-2xl" onClick={event => event.stopPropagation()}>
        <div className="flex items-center justify-between gap-3 border-b border-slate-800 px-5 py-4">
          <div>
            <h2 className="text-xl font-black text-white">Nhập từ điểm danh</h2>
            <p className="text-sm text-slate-500">Chọn phiên điểm danh để thêm thành viên vào slot trống của đội hình hiện tại.</p>
          </div>
          <button onClick={onClose} className="app-button-secondary rounded-xl p-2">
            <X size={18} />
          </button>
        </div>

        <div className="grid max-h-[calc(92vh-76px)] grid-cols-1 overflow-hidden lg:grid-cols-[380px_1fr]">
          <aside className="min-h-0 border-b border-slate-800 bg-slate-950/50 lg:border-b-0 lg:border-r">
            <div className="flex items-center justify-between gap-2 border-b border-slate-800 p-3">
              <div className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-wider text-slate-400">
                <ClipboardList size={14} />
                Phiên điểm danh
              </div>
              {loading ? <Loader2 size={15} className="animate-spin text-sky-300" /> : null}
            </div>
            <div className="max-h-[54vh] space-y-2 overflow-y-auto p-3 custom-scrollbar lg:max-h-[calc(92vh-145px)]">
              {error ? <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-200">{error}</div> : null}
              {sessions.map(session => (
                <button
                  key={session.id}
                  onClick={() => onSelectSession(session.id)}
                  className={`w-full rounded-xl border p-3 text-left transition-colors ${selectedSession?.id === session.id ? 'border-sky-400/60 bg-sky-500/12' : 'border-slate-800 bg-slate-900/35 hover:border-slate-600 hover:bg-slate-900/70'}`}
                >
                  <div className="truncate text-sm font-black text-slate-100">{session.headerText || 'Điểm danh Bang Chiến'}</div>
                  <div className="mt-1 text-xs text-slate-500">{formatAttendanceDate(session.openedAt)} - {formatAttendanceDate(session.closedAt)}</div>
                  <div className="mt-2 flex flex-wrap gap-1.5 text-[10px] font-black">
                    <span className="rounded-full border border-emerald-500/25 bg-emerald-500/10 px-2 py-0.5 text-emerald-200">Tham gia {session.summary.go}</span>
                    <span className="rounded-full border border-amber-500/25 bg-amber-500/10 px-2 py-0.5 text-amber-200">Dự bị {session.summary.maybe}</span>
                    <span className="rounded-full border border-red-500/25 bg-red-500/10 px-2 py-0.5 text-red-200">Không {session.summary.nogo}</span>
                  </div>
                </button>
              ))}
              {!sessions.length && !loading ? <div className="rounded-xl border border-dashed border-slate-700 px-3 py-8 text-center text-sm text-slate-500">Chưa có phiên điểm danh.</div> : null}
              {hasMore ? (
                <button onClick={onLoadMore} disabled={loading} className="app-button-secondary w-full rounded-xl px-3 py-2 text-xs font-black">
                  {loading ? 'Đang tải...' : 'Tải thêm'}
                </button>
              ) : null}
            </div>
          </aside>

          <section className="min-h-0 overflow-y-auto p-5 custom-scrollbar">
            {detailLoading ? (
              <div className="flex min-h-[320px] items-center justify-center rounded-2xl border border-slate-800 bg-slate-900/35 text-sm font-bold text-slate-400">
                <Loader2 size={18} className="mr-2 animate-spin text-sky-300" />
                Đang tải chi tiết phiên...
              </div>
            ) : selectedSession ? (
              <div className="space-y-4">
                <div className="rounded-2xl border border-slate-800 bg-slate-900/35 p-4">
                  <h3 className="text-lg font-black text-white">{selectedSession.headerText || 'Điểm danh Bang Chiến'}</h3>
                  <p className="mt-1 text-sm text-slate-500">{formatAttendanceDate(selectedSession.openedAt)} - {formatAttendanceDate(selectedSession.closedAt)}</p>
                  <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-3">
                    <div className="rounded-xl border border-emerald-500/25 bg-emerald-500/10 p-3"><div className="text-xs font-black text-emerald-200">Vào chính</div><div className="text-2xl font-black text-white">{mainMemberIds.length}</div></div>
                    <div className="rounded-xl border border-amber-500/25 bg-amber-500/10 p-3"><div className="text-xs font-black text-amber-200">Dự bị</div><div className="text-2xl font-black text-white">{standbyMemberIds.length}</div></div>
                    <div className="rounded-xl border border-slate-700 bg-slate-900/60 p-3"><div className="text-xs font-black text-slate-300">Chưa điểm danh</div><div className="text-2xl font-black text-white">{notVotedMembers.length}</div></div>
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-800 bg-slate-900/35 p-4">
                  <label className="inline-flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-950/45 px-3 py-2 text-sm font-bold text-slate-300">
                    <input
                      type="checkbox"
                      checked={includeNotVoted}
                      onChange={event => onIncludeNotVotedChange(event.target.checked)}
                      className="h-4 w-4 accent-sky-500"
                    />
                    Thêm người chưa điểm danh vào dự bị ({notVotedMembers.length})
                  </label>
                  <p className="mt-2 text-xs text-slate-500">Người chọn “Không tham gia” sẽ không được nhập vào đội hình.</p>
                </div>

                <div className="flex justify-end gap-2">
                  <button onClick={onClose} className="app-button-secondary rounded-xl px-4 py-2 text-sm font-bold">Hủy</button>
                  <button
                    onClick={() => onImport({ mainMemberIds, reserveMemberIds })}
                    disabled={!canImport}
                    className="app-button-primary rounded-xl px-4 py-2 text-sm font-black disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Nhập {mainMemberIds.length} chính / {reserveMemberIds.length} dự bị
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex min-h-[320px] items-center justify-center rounded-2xl border border-dashed border-slate-700 bg-slate-900/25 text-center text-sm text-slate-500">
                Chọn một phiên điểm danh để xem danh sách nhập.
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}

interface TeamLayoutProps {
  squadGroups: SquadGroup[];
  memberPool: Member[];
  fullMemberPool: Member[];
  skills: Skill[];
  currentUser: DiscordUser | null;
  assignedMemberIds: Set<string>;
  onSquadGroupsChange: React.Dispatch<React.SetStateAction<SquadGroup[]>>;
  onResetSquadGroups: (update: React.SetStateAction<SquadGroup[]>, clearSkillMemberIds: string[]) => void;
  onSquadGroupLeaderChange: (groupId: string, leaderMemberId: string | null) => void;
  onAssignSkillToMember: (memberId: string, skill: Skill) => void;
  onRemoveSkillFromMember: (memberId: string, skillId: string) => void;
  onMemberNoteChange: (teamId: string, memberId: string, note: string) => void;
  getMemberById: (id: string) => Member | null;
  readOnly: boolean;
  snapshotsOnly: boolean;
  canManageLineup: boolean;
  canManageSnapshots: boolean;
  canRestoreSnapshots: boolean;
  onImportAttendanceToLineup: (payload: AttendanceLineupImportPayload) => void;
  lineupMemberSource: LineupMemberSource;
  lineupMemberSourceSessionId: string | null;
  lineupMemberSourceSession: AttendanceSession | null;
  lineupMemberSourceIncludeNotVoted: boolean;
  onLineupMemberSourceChange: (source: LineupMemberSource) => void;
  onLineupMemberSourceSessionChange: (session: AttendanceSession | null) => void;
  onLineupMemberSourceIncludeNotVotedChange: (include: boolean) => void;
  snapshotState: LineupSnapshotState;
  snapshotActions: Pick<LineupSnapshotActions, 'openSnapshots' | 'closeSnapshots' | 'selectSnapshot' | 'saveSnapshot' | 'restoreSnapshot' | 'removeSnapshot' | 'refreshSnapshots'>;
}

export const TeamLayout: React.FC<TeamLayoutProps> = ({
  squadGroups,
  memberPool,
  fullMemberPool,
  skills,
  currentUser,
  assignedMemberIds,
  onSquadGroupsChange,
  onResetSquadGroups,
  onSquadGroupLeaderChange,
  onAssignSkillToMember,
  onRemoveSkillFromMember,
  onMemberNoteChange,
  getMemberById,
  readOnly,
  snapshotsOnly,
  canManageLineup,
  canManageSnapshots,
  canRestoreSnapshots,
  onImportAttendanceToLineup,
  lineupMemberSource,
  lineupMemberSourceSessionId,
  lineupMemberSourceSession,
  lineupMemberSourceIncludeNotVoted,
  onLineupMemberSourceChange,
  onLineupMemberSourceSessionChange,
  onLineupMemberSourceIncludeNotVotedChange,
  snapshotState,
  snapshotActions,
}) => {
  const { confirm } = useSystemDialog();
  const [activeId, setActiveId] = React.useState<string | null>(null);
  const [activeData, setActiveData] = React.useState<any>(null);
  const [sidePanelTab, setSidePanelTab] = React.useState<'members' | 'skills'>('members');
  const [emptyLineupMode, setEmptyLineupMode] = React.useState<EmptyLineupMode>('source');
  const [lineupResetActionPending, setLineupResetActionPending] = React.useState(false);
  const [attendanceImportOpen, setAttendanceImportOpen] = React.useState(false);
  const [attendanceSessions, setAttendanceSessions] = React.useState<AttendanceSession[]>([]);
  const [attendanceImportLoading, setAttendanceImportLoading] = React.useState(false);
  const [attendanceImportDetailLoading, setAttendanceImportDetailLoading] = React.useState(false);
  const [attendanceImportError, setAttendanceImportError] = React.useState('');
  const [selectedAttendanceSession, setSelectedAttendanceSession] = React.useState<AttendanceSession | null>(null);
  const [includeNotVoted, setIncludeNotVoted] = React.useState(false);
  const [attendanceHistoryHasMore, setAttendanceHistoryHasMore] = React.useState(false);
  const [attendanceHistoryNextOffset, setAttendanceHistoryNextOffset] = React.useState(0);
  const menuSnapshotsFetchedRef = React.useRef(false);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 4,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragStart = (event: DragStartEvent) => {
    if (readOnly) return;
    const { active } = event;
    setActiveId(active.id as string);
    setActiveData(active.data.current);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    if (readOnly) return;
    const { active, over } = event;
    setActiveId(null);
    setActiveData(null);

    if (!over) return;

    const sourceData = active.data.current;
    const overData = over.data.current;
    const dropId = over.id as string;

    if (!sourceData) return;

    const parseSlotId = (slotId: string) => {
      const isReserve = slotId.includes('-reserve-');
      const parts = slotId.split(isReserve ? '-reserve-' : '-slot-');
      if (parts.length !== 2) return null;

      return {
        isReserve,
        teamId: parts[0],
        slotIndex: parseInt(parts[1]),
      };
    };

    const getTeamForSlot = (groups: SquadGroup[], slotId: string) => {
      const slot = parseSlotId(slotId);
      if (!slot) return null;

      const team = groups.flatMap(group => group.teams).find(item => item.id === slot.teamId);
      if (!team) return null;

      return { slot, team };
    };

    const isValidSlotId = (groups: SquadGroup[], slotId: string) => Boolean(getTeamForSlot(groups, slotId));

    const getMemberIdInSlotFromGroups = (groups: SquadGroup[], slotId: string) => {
      const slotData = getTeamForSlot(groups, slotId);
      if (!slotData) return null;

      const { slot, team } = slotData;
      return slot.isReserve ? team.reserveMemberIds[slot.slotIndex] : team.memberIds[slot.slotIndex];
    };

    const getSlotIdForMemberFromGroups = (groups: SquadGroup[], memberId: string) => {
      let slotId: string | null = null;
      groups.forEach(group => {
        group.teams.forEach(team => {
          const sIdx = team.memberIds.indexOf(memberId);
          if (sIdx !== -1) slotId = `${team.id}-slot-${sIdx}`;

          const rIdx = team.reserveMemberIds.indexOf(memberId);
          if (rIdx !== -1) slotId = `${team.id}-reserve-${rIdx}`;
        });
      });
      return slotId;
    };

    const getSlotIdForMember = (memberId: string) => getSlotIdForMemberFromGroups(squadGroups, memberId);

    // Handle Skill dropping
    if (sourceData.type === 'skill') {
      const skill = sourceData.skill as Skill;

      if (overData?.type === 'skill-pool' || dropId === 'skill-pool') {
        return;
      }

      if (overData?.type === 'member-target') {
        onAssignSkillToMember(overData.member.id, skill);
        return;
      }

      if (isValidSlotId(squadGroups, dropId)) {
        const memberIdInSlot = getMemberIdInSlotFromGroups(squadGroups, dropId);
        if (memberIdInSlot) {
          onAssignSkillToMember(memberIdInSlot, skill);
        }
      }
      return;
    }

    const { member, origin } = sourceData;

    // Helper to update state
    const updateMemberInSlot = (groups: SquadGroup[], slotId: string, memberId: string | null) => {
      const slot = parseSlotId(slotId);
      if (!slot) return groups;

      const { isReserve, teamId, slotIndex } = slot;

      return groups.map(group => ({
        ...group,
        teams: group.teams.map(team => {
          if (team.id !== teamId) return team;

          if (isReserve) {
            const reserveMemberIds = [...team.reserveMemberIds];
            reserveMemberIds[slotIndex] = memberId || '';
            return { ...team, reserveMemberIds };
          }

          const memberIds = [...team.memberIds];
          memberIds[slotIndex] = memberId || '';
          return { ...team, memberIds };
        })
      }));
    };

    const removeMemberNotes = (groups: SquadGroup[], memberId: string) => {
      return groups.map(group => ({
        ...group,
        teams: group.teams.map(team => {
          if (!team.memberNotes?.[memberId]) return team;
          const memberNotes = { ...team.memberNotes };
          delete memberNotes[memberId];
          return { ...team, memberNotes };
        }),
      }));
    };

    const moveMemberNoteToTeam = (groups: SquadGroup[], memberId: string, targetTeamId: string) => {
      let note = '';
      groups.forEach(group => {
        group.teams.forEach(team => {
          if (team.memberNotes?.[memberId]) note = team.memberNotes[memberId];
        });
      });
      if (!note) return groups;

      return groups.map(group => ({
        ...group,
        teams: group.teams.map(team => {
          const memberNotes = { ...(team.memberNotes ?? {}) };
          delete memberNotes[memberId];
          if (team.id === targetTeamId) memberNotes[memberId] = note;
          return { ...team, memberNotes };
        }),
      }));
    };

    const clearMemberFromSlots = (groups: SquadGroup[], memberId: string) => {
      return removeMemberNotes(groups, memberId).map(group => ({
        ...group,
        teams: group.teams.map(team => ({
          ...team,
          memberIds: team.memberIds.map(id => id === memberId ? '' : id),
          reserveMemberIds: team.reserveMemberIds.map(id => id === memberId ? '' : id),
        })),
      }));
    };

    const clearMemberSkills = (memberId: string) => {
      const assignedSkills = getMemberById(memberId)?.assignedSkills ?? [];
      assignedSkills.forEach(skillId => onRemoveSkillFromMember(memberId, skillId));
    };

    const resolveTargetSlotId = (groups: SquadGroup[]) => {
      if (isValidSlotId(groups, dropId)) return dropId;
      if (overData?.type === 'member-target' && assignedMemberIds.has(overData.member.id)) {
        return getSlotIdForMemberFromGroups(groups, overData.member.id);
      }
      return null;
    };

    // Cases
    if (origin === 'pool') {
      onSquadGroupsChange(prev => {
        const targetSlotId = resolveTargetSlotId(prev);
        if (!targetSlotId) return prev;
        const targetSlot = parseSlotId(targetSlotId);
        if (!targetSlot) return prev;
        const targetMemberId = getMemberIdInSlotFromGroups(prev, targetSlotId);
        if (targetMemberId && targetMemberId !== member.id) {
          clearMemberSkills(targetMemberId);
        }
        const clearedGroups = targetMemberId
          ? clearMemberFromSlots(clearMemberFromSlots(prev, member.id), targetMemberId)
          : clearMemberFromSlots(prev, member.id);
        return updateMemberInSlot(clearedGroups, targetSlotId, member.id);
      });
    } else if (typeof origin === 'string' && isValidSlotId(squadGroups, origin)) {
      const isOverPool = dropId === 'pool' || (overData?.type === 'member-target' && !assignedMemberIds.has(overData.member.id));
      if (isOverPool) {
        (member.assignedSkills || []).forEach((skillId: string) => onRemoveSkillFromMember(member.id, skillId));
        onSquadGroupsChange(prev => removeMemberNotes(updateMemberInSlot(prev, origin, null), member.id));
        return;
      }

      onSquadGroupsChange(prev => {
        const targetSlotId = resolveTargetSlotId(prev);
        if (!targetSlotId || targetSlotId === origin) return prev;

        const targetMemberId = getMemberIdInSlotFromGroups(prev, targetSlotId);
        const originMemberId = getMemberIdInSlotFromGroups(prev, origin);
        const targetSlot = parseSlotId(targetSlotId);
        const originSlot = parseSlotId(origin);
        if (originMemberId !== member.id || !targetSlot || !originSlot) return prev;

        let next = updateMemberInSlot(updateMemberInSlot(prev, origin, targetMemberId), targetSlotId, member.id);
        next = moveMemberNoteToTeam(next, member.id, targetSlot.teamId);
        if (targetMemberId) {
          next = moveMemberNoteToTeam(next, targetMemberId, originSlot.teamId);
        }
        return next;
      });
    }
  };

  const getAssignedLineupMemberIdsWithSkills = useCallback(() => {
    const assignedIds = new Set<string>();
    squadGroups.forEach(group => {
      group.teams.forEach(team => {
        team.memberIds.forEach(id => id && assignedIds.add(id));
        team.reserveMemberIds.forEach(id => id && assignedIds.add(id));
      });
    });

    return fullMemberPool
      .filter(member => assignedIds.has(member.id) && (member.assignedSkills || []).length > 0)
      .map(member => member.id);
  }, [fullMemberPool, squadGroups]);

  const startNewLineup = useCallback(async () => {
    if (lineupResetActionPending) return;

    setLineupResetActionPending(true);
    try {
      const confirmed = await confirm({
        message: 'Tạo mới đội hình sẽ xóa toàn bộ vị trí đã xếp hiện tại. Bạn có chắc không?',
        variant: 'warning',
        confirmLabel: 'Tạo mới',
      });
      if (!confirmed) return;

      onResetSquadGroups([], getAssignedLineupMemberIdsWithSkills());
      setEmptyLineupMode('source');
    } finally {
      setLineupResetActionPending(false);
    }
  }, [confirm, getAssignedLineupMemberIdsWithSkills, lineupResetActionPending, onResetSquadGroups]);

  const handleRearrangeMembers = useCallback(async () => {
    if (lineupResetActionPending) return;

    setLineupResetActionPending(true);
    try {
      const confirmed = await confirm({
        message: 'Sắp xếp lại sẽ gỡ toàn bộ thành viên khỏi các vị trí hiện tại nhưng giữ nguyên đoàn/đội. Bạn có chắc không?',
        variant: 'warning',
        confirmLabel: 'Sắp xếp lại',
      });
      if (!confirmed) return;

      onResetSquadGroups(prev => prev.map(group => ({
        ...group,
        teams: group.teams.map(team => ({
          ...team,
          memberIds: team.memberIds.map(() => ''),
          reserveMemberIds: team.reserveMemberIds.map(() => ''),
          slotSkills: {},
          memberNotes: {},
        })),
      })), getAssignedLineupMemberIdsWithSkills());
    } finally {
      setLineupResetActionPending(false);
    }
  }, [confirm, getAssignedLineupMemberIdsWithSkills, lineupResetActionPending, onResetSquadGroups]);

  const handleCreateNewLineup = useCallback(() => {
    setEmptyLineupMode('create');
  }, []);

  const handleUseSavedLineup = useCallback(() => {
    void snapshotActions.openSnapshots();
  }, [snapshotActions.openSnapshots]);

  const handleCreateSquadGroups = useCallback((groups: SquadGroup[]) => {
    onSquadGroupsChange(groups);
    setEmptyLineupMode('source');
  }, [onSquadGroupsChange]);

  const loadAttendanceSessions = useCallback((offset = 0) => {
    setAttendanceImportLoading(true);
    setAttendanceImportError('');
    getAttendanceHistory(20, offset)
      .then(result => {
        setAttendanceSessions(prev => offset === 0
          ? result.sessions
          : [...prev, ...result.sessions.filter(session => !prev.some(item => item.id === session.id))]);
        setAttendanceHistoryHasMore(!!result.hasMore);
        setAttendanceHistoryNextOffset(result.nextOffset ?? offset + result.sessions.length);
      })
      .catch(() => setAttendanceImportError('Không thể tải danh sách phiên điểm danh.'))
      .finally(() => setAttendanceImportLoading(false));
  }, []);

  const openAttendanceImport = useCallback(() => {
    setAttendanceImportOpen(true);
    setSelectedAttendanceSession(null);
    setIncludeNotVoted(false);
    loadAttendanceSessions(0);
  }, [loadAttendanceSessions]);

  const selectAttendanceSession = useCallback((sessionId: string) => {
    const preview = attendanceSessions.find(session => session.id === sessionId) || null;
    setSelectedAttendanceSession(preview);
    setIncludeNotVoted(false);
    setAttendanceImportDetailLoading(true);
    setAttendanceImportError('');
    getAttendanceSession(sessionId)
      .then(result => setSelectedAttendanceSession(result.session))
      .catch(() => setAttendanceImportError('Không thể tải chi tiết phiên điểm danh.'))
      .finally(() => setAttendanceImportDetailLoading(false));
  }, [attendanceSessions]);

  const handleAttendanceImport = useCallback((payload: AttendanceLineupImportPayload) => {
    if (selectedAttendanceSession) {
      onLineupMemberSourceChange('attendance');
      onLineupMemberSourceSessionChange(selectedAttendanceSession);
    }
    onImportAttendanceToLineup(payload);
    setAttendanceImportOpen(false);
  }, [onImportAttendanceToLineup, onLineupMemberSourceChange, onLineupMemberSourceSessionChange, selectedAttendanceSession]);

  const handleSourceChange = useCallback((source: LineupMemberSource) => {
    onLineupMemberSourceChange(source);
    if (source === 'attendance' && attendanceSessions.length === 0 && !attendanceImportLoading) {
      loadAttendanceSessions(0);
    }
  }, [attendanceImportLoading, attendanceSessions.length, loadAttendanceSessions, onLineupMemberSourceChange]);

  const handleSourceSessionChange = useCallback((sessionId: string) => {
    if (!sessionId) {
      onLineupMemberSourceSessionChange(null);
      return;
    }

    const preview = attendanceSessions.find(session => session.id === sessionId) || null;
    onLineupMemberSourceSessionChange(preview);
    setAttendanceImportLoading(true);
    setAttendanceImportError('');
    getAttendanceSession(sessionId)
      .then(result => onLineupMemberSourceSessionChange(result.session))
      .catch(() => setAttendanceImportError('Không thể tải chi tiết phiên điểm danh.'))
      .finally(() => setAttendanceImportLoading(false));
  }, [attendanceSessions, onLineupMemberSourceSessionChange]);

  React.useEffect(() => {
    if (squadGroups.length > 0 && emptyLineupMode !== 'source') {
      setEmptyLineupMode('source');
    }
  }, [emptyLineupMode, squadGroups.length]);

  React.useEffect(() => {
    if (snapshotsOnly || squadGroups.length > 0 || readOnly || emptyLineupMode !== 'source') {
      menuSnapshotsFetchedRef.current = false;
      return;
    }

    if (!menuSnapshotsFetchedRef.current && !snapshotState.snapshotsLoading) {
      menuSnapshotsFetchedRef.current = true;
      void snapshotActions.refreshSnapshots();
    }
  }, [emptyLineupMode, readOnly, snapshotsOnly, snapshotActions.refreshSnapshots, snapshotState.snapshotsLoading, squadGroups.length]);

  React.useEffect(() => {
    if (snapshotsOnly && !snapshotState.snapshotsOpen && !snapshotState.snapshotsLoading) {
      void snapshotActions.openSnapshots();
    }
  }, [snapshotsOnly, snapshotState.snapshotsOpen, snapshotState.snapshotsLoading, snapshotActions.openSnapshots]);

  if (snapshotsOnly) {
    return (
      <main className="h-full min-h-0 flex-1 overflow-hidden bg-slate-950/20 p-4">
        <SavedLineupsView
          snapshots={snapshotState.snapshots}
          selectedSnapshotId={snapshotState.selectedSnapshotId}
          pendingSnapshotId={snapshotState.pendingSnapshotId}
          selectedSnapshot={snapshotState.selectedSnapshot}
          loading={snapshotState.snapshotsLoading}
          detailLoading={snapshotState.snapshotDetailLoading}
          actionLoading={snapshotState.snapshotActionLoading}
          canRestoreSnapshot={false}
          canDeleteSnapshot={false}
          recentSnapshotAction={snapshotState.recentSnapshotAction}
          skills={skills}
          getMemberById={getMemberById}
          onSelectSnapshot={snapshotId => { void snapshotActions.selectSnapshot(snapshotId); }}
          variant="page"
          onRestoreSnapshot={() => undefined}
          onDeleteSnapshot={() => undefined}
        />
      </main>
    );
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={createLineupCollisionDetection()}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <main className="flex h-full min-h-0 flex-1 flex-col overflow-hidden">
        {squadGroups.length > 0 ? (
          <div className="flex min-h-0 flex-1 overflow-hidden bg-slate-950/10">
        {!readOnly && (
          <aside className="flex h-full min-h-0 w-80 shrink-0 flex-col overflow-hidden border-r border-slate-800/80 bg-slate-950/35 backdrop-blur-sm">
            <div className="border-b border-slate-800/80 p-4">
              <div className="grid grid-cols-2 gap-1 rounded-xl border border-slate-800 bg-slate-950/65 p-1 shadow-inner shadow-black/10">
                <button
                  onClick={() => setSidePanelTab('members')}
                  className={`flex items-center justify-center gap-2 rounded-lg px-3 py-2 text-[11px] font-black uppercase tracking-wider transition-colors ${sidePanelTab === 'members' ? 'bg-sky-500/85 text-white shadow-lg shadow-sky-950/25' : 'text-slate-400 hover:bg-slate-800/75 hover:text-slate-100'}`}
                >
                  <Users size={14} />
                  Thành viên
                </button>
                <button
                  onClick={() => setSidePanelTab('skills')}
                  className={`flex items-center justify-center gap-2 rounded-lg px-3 py-2 text-[11px] font-black uppercase tracking-wider transition-colors ${sidePanelTab === 'skills' ? 'bg-amber-500/85 text-white shadow-lg shadow-amber-950/25' : 'text-slate-400 hover:bg-slate-800/75 hover:text-slate-100'}`}
                >
                  <Zap size={14} />
                  Kỹ năng
                </button>
              </div>
            </div>

            <div className="flex-1 min-h-0 overflow-hidden">
              {sidePanelTab === 'members' ? (
                <MemberPool
                  members={memberPool}
                  skills={skills}
                  assignedMemberIds={assignedMemberIds}
                  onRemoveSkillFromMember={onRemoveSkillFromMember}
                  lineupMemberSource={lineupMemberSource}
                  lineupMemberSourceSessionId={lineupMemberSourceSessionId}
                  lineupMemberSourceSession={lineupMemberSourceSession}
                  lineupMemberSourceIncludeNotVoted={lineupMemberSourceIncludeNotVoted}
                  attendanceSessions={attendanceSessions}
                  attendanceImportLoading={attendanceImportLoading}
                  attendanceImportError={attendanceImportError}
                  onSourceChange={handleSourceChange}
                  onSourceSessionChange={handleSourceSessionChange}
                  onIncludeNotVotedChange={onLineupMemberSourceIncludeNotVotedChange}
                />
              ) : (
                <SkillPool skills={skills} />
              )}
            </div>
          </aside>
        )}
        <MainBoard
          squadGroups={squadGroups}
          memberPool={fullMemberPool}
          skills={skills}
          currentUser={currentUser}
          getMemberById={getMemberById}
          onRemoveSkillFromMember={onRemoveSkillFromMember}
          onStartNewLineup={startNewLineup}
          onRearrangeMembers={handleRearrangeMembers}
          onOpenAttendanceImport={openAttendanceImport}
          lineupResetActionPending={lineupResetActionPending}
          onSquadGroupLeaderChange={onSquadGroupLeaderChange}
          onMemberNoteChange={onMemberNoteChange}
          readOnly={readOnly}
          canManageLineup={canManageLineup}
          canManageSnapshots={canManageSnapshots}
          snapshotState={snapshotState}
          snapshotActions={snapshotActions}
        />
          </div>
        ) : readOnly ? (
          <main className="flex h-full min-h-0 flex-1 items-center justify-center bg-slate-950/15 p-6">
            <div className="rounded-2xl border border-dashed border-slate-700 bg-slate-900/45 px-6 py-8 text-center shadow-xl shadow-slate-950/20">
              <p className="text-sm font-bold text-slate-200">Chưa có đội hình hiện tại</p>
              <p className="mt-2 text-xs text-slate-400">Bạn có thể xem lại các đội hình đã lưu trước đó.</p>
              <button
                onClick={() => { void snapshotActions.openSnapshots(); }}
                disabled={!canRestoreSnapshots || snapshotState.snapshotsLoading}
                className="mt-5 rounded-lg border border-emerald-400/30 bg-emerald-500/12 px-4 py-2 text-xs font-bold uppercase tracking-wider text-emerald-200 transition-colors hover:border-emerald-300/50 hover:bg-emerald-500/18 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {snapshotState.snapshotsLoading ? 'Đang tải...' : 'Xem đội hình đã lưu'}
              </button>
            </div>
          </main>
        ) : emptyLineupMode === 'source' ? (
          <LineupEntryMenu
            hasCurrentLineup={false}
            canCreateLineup
            canRestoreSnapshots={canRestoreSnapshots}
            snapshotCount={snapshotState.snapshots.length}
            snapshotsLoading={snapshotState.snapshotsLoading}
            onCreateNew={handleCreateNewLineup}
            onUseSaved={handleUseSavedLineup}
          />
        ) : (
          <SquadSetupScreen onCreate={handleCreateSquadGroups} />
        )}
      </main>

      {attendanceImportOpen ? (
        <AttendanceImportModal
          sessions={attendanceSessions}
          selectedSession={selectedAttendanceSession}
          memberPool={fullMemberPool}
          loading={attendanceImportLoading}
          detailLoading={attendanceImportDetailLoading}
          error={attendanceImportError}
          includeNotVoted={includeNotVoted}
          hasMore={attendanceHistoryHasMore}
          onClose={() => setAttendanceImportOpen(false)}
          onSelectSession={selectAttendanceSession}
          onLoadMore={() => loadAttendanceSessions(attendanceHistoryNextOffset)}
          onIncludeNotVotedChange={setIncludeNotVoted}
          onImport={handleAttendanceImport}
        />
      ) : null}

      {snapshotState.snapshotsOpen && (
        <LineupSnapshotsModal
          snapshots={snapshotState.snapshots}
          selectedSnapshotId={snapshotState.selectedSnapshotId}
          selectedSnapshot={snapshotState.selectedSnapshot}
          loading={snapshotState.snapshotsLoading}
          detailLoading={snapshotState.snapshotDetailLoading}
          actionLoading={snapshotState.snapshotActionLoading}
          canRestoreSnapshot={canRestoreSnapshots && !readOnly}
          canDeleteSnapshot={canManageSnapshots && !readOnly}
          recentSnapshotAction={snapshotState.recentSnapshotAction}
          skills={skills}
          getMemberById={getMemberById}
          onClose={snapshotActions.closeSnapshots}
          onSelectSnapshot={snapshotId => { void snapshotActions.selectSnapshot(snapshotId); }}
          onRestoreSnapshot={snapshotId => {
            void snapshotActions.restoreSnapshot(snapshotId).then(state => {
              if (state?.squadGroups?.length) {
                setEmptyLineupMode('source');
              }
            });
          }}
          onDeleteSnapshot={snapshotId => { void snapshotActions.removeSnapshot(snapshotId); }}
        />
      )}

      <DragOverlay dropAnimation={{
        sideEffects: defaultDropAnimationSideEffects({
          styles: {
            active: {
              opacity: '0.4',
            },
          },
        }),
      }}>
        {activeData?.type === 'member' ? (
          <div className="w-72 pointer-events-none">
            <MemberCard
              member={activeData.member}
              skills={(activeData.member.assignedSkills || []).map((id: string) => skills.find(s => s.id === id)).filter(Boolean) as Skill[]}
              isOverlay
            />
          </div>
        ) : (activeData?.type === 'skill' && activeData.skill) ? (
          <div className="aspect-square w-full max-w-[88px] p-2.5 flex items-center justify-center">
            <div className="w-12 h-12 rounded-lg overflow-hidden bg-slate-800 border border-amber-500 shadow-2xl shadow-amber-950/30">
              {activeData.skill.logo && (
                <img src={activeData.skill.logo} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
              )}
            </div>
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
};
