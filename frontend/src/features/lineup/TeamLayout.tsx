/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useCallback, useMemo } from 'react';
import {
  DndContext,
  DragOverlay,
  closestCenter,
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
import { DiscordUser } from '../../services/discordApi.ts';
import { MemberPool } from './MemberPool.tsx';
import { SkillPool } from './SkillPool.tsx';
import { MainBoard } from './MainBoard.tsx';
import { MemberCard } from './MemberCard.tsx';
import { SquadSetupScreen } from './SquadSetupScreen.tsx';
import { SavedLineupsView } from './SavedLineupsView.tsx';
import { LineupEntryMenu } from './LineupEntryMenu.tsx';
import { LineupSnapshotsModal } from './LineupSnapshotsModal.tsx';
import { Users, Zap } from 'lucide-react';
import { useSystemDialog } from '../app/SystemDialogProvider.tsx';

type EmptyLineupMode = 'source' | 'create';

interface TeamLayoutProps {
  squadGroups: SquadGroup[];
  memberPool: Member[];
  skills: Skill[];
  currentUser: DiscordUser | null;
  assignedMemberIds: Set<string>;
  onSquadGroupsChange: React.Dispatch<React.SetStateAction<SquadGroup[]>>;
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
  snapshotState: LineupSnapshotState;
  snapshotActions: Pick<LineupSnapshotActions, 'openSnapshots' | 'closeSnapshots' | 'selectSnapshot' | 'saveSnapshot' | 'restoreSnapshot' | 'removeSnapshot' | 'refreshSnapshots'>;
}

export const TeamLayout: React.FC<TeamLayoutProps> = ({
  squadGroups,
  memberPool,
  skills,
  currentUser,
  assignedMemberIds,
  onSquadGroupsChange,
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
  snapshotState,
  snapshotActions,
}) => {
  const { confirm } = useSystemDialog();
  const [activeId, setActiveId] = React.useState<string | null>(null);
  const [activeData, setActiveData] = React.useState<any>(null);
  const [sidePanelTab, setSidePanelTab] = React.useState<'members' | 'skills'>('members');
  const [emptyLineupMode, setEmptyLineupMode] = React.useState<EmptyLineupMode>('source');
  const [lineupResetActionPending, setLineupResetActionPending] = React.useState(false);
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

  const clearAssignedLineupSkills = useCallback(() => {
    const assignedIds = new Set<string>();
    squadGroups.forEach(group => {
      group.teams.forEach(team => {
        team.memberIds.forEach(id => id && assignedIds.add(id));
        team.reserveMemberIds.forEach(id => id && assignedIds.add(id));
      });
    });

    memberPool.forEach(member => {
      if (!assignedIds.has(member.id)) return;
      (member.assignedSkills || []).forEach(skillId => onRemoveSkillFromMember(member.id, skillId));
    });
  }, [memberPool, onRemoveSkillFromMember, squadGroups]);

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

      clearAssignedLineupSkills();
      onSquadGroupsChange([]);
      setEmptyLineupMode('source');
    } finally {
      setLineupResetActionPending(false);
    }
  }, [clearAssignedLineupSkills, confirm, lineupResetActionPending, onSquadGroupsChange]);

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

      clearAssignedLineupSkills();
      onSquadGroupsChange(prev => prev.map(group => ({
        ...group,
        teams: group.teams.map(team => ({
          ...team,
          memberIds: team.memberIds.map(() => ''),
          reserveMemberIds: team.reserveMemberIds.map(() => ''),
          slotSkills: {},
          memberNotes: {},
        })),
      })));
    } finally {
      setLineupResetActionPending(false);
    }
  }, [clearAssignedLineupSkills, confirm, lineupResetActionPending, onSquadGroupsChange]);

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
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <main className="flex h-full min-h-0 flex-1 flex-col overflow-hidden">
        {squadGroups.length > 0 ? (
          <div className="flex min-h-0 flex-1 overflow-hidden">
        {!readOnly && (
          <aside className="w-80 h-full min-h-0 shrink-0 border-r border-slate-800/80 bg-slate-950/35 flex flex-col overflow-hidden backdrop-blur-sm">
            <div className="grid grid-cols-2 gap-1 border-b border-slate-800/80 bg-slate-950/35 p-2 backdrop-blur-md">
              <button
                onClick={() => setSidePanelTab('members')}
                className={`flex items-center justify-center gap-2 rounded-lg px-3 py-2 text-[11px] font-bold uppercase tracking-wider transition-colors ${sidePanelTab === 'members' ? 'bg-sky-500/85 text-white shadow-lg shadow-sky-950/25' : 'text-slate-400 hover:bg-slate-800/75 hover:text-slate-100'}`}
              >
                <Users size={14} />
                Thành viên
              </button>
              <button
                onClick={() => setSidePanelTab('skills')}
                className={`flex items-center justify-center gap-2 rounded-lg px-3 py-2 text-[11px] font-bold uppercase tracking-wider transition-colors ${sidePanelTab === 'skills' ? 'bg-amber-500/85 text-white shadow-lg shadow-amber-950/25' : 'text-slate-400 hover:bg-slate-800/75 hover:text-slate-100'}`}
              >
                <Zap size={14} />
                Kỹ năng
              </button>
            </div>

            <div className="flex-1 min-h-0 overflow-hidden">
              {sidePanelTab === 'members' ? (
                <MemberPool
                  members={memberPool}
                  skills={skills}
                  assignedMemberIds={assignedMemberIds}
                  onRemoveSkillFromMember={onRemoveSkillFromMember}
                />
              ) : (
                <SkillPool skills={skills} />
              )}
            </div>
          </aside>
        )}
        <MainBoard
          squadGroups={squadGroups}
          memberPool={memberPool}
          skills={skills}
          currentUser={currentUser}
          getMemberById={getMemberById}
          onRemoveSkillFromMember={onRemoveSkillFromMember}
          onStartNewLineup={startNewLineup}
          onRearrangeMembers={handleRearrangeMembers}
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
          <div className="w-12 h-12 bg-slate-800 border border-amber-500 rounded-lg overflow-hidden shadow-2xl">
            {activeData.skill.logo && (
              <img src={activeData.skill.logo} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
            )}
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
};
