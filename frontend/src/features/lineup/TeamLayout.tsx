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
import { MemberPool } from './MemberPool.tsx';
import { SkillPool } from './SkillPool.tsx';
import { MainBoard } from './MainBoard.tsx';
import { MemberCard } from './MemberCard.tsx';
import { SquadSetupScreen } from './SquadSetupScreen.tsx';
import { SavedLineupsView } from './SavedLineupsView.tsx';
import { LineupEntryMenu } from './LineupEntryMenu.tsx';
import { LineupSnapshotsModal } from './LineupSnapshotsModal.tsx';
import { Lock, LockOpen, ShieldAlert, Users, Zap } from 'lucide-react';
import { useSystemDialog } from '../app/SystemDialogProvider.tsx';
import type { LineupEditLock } from '../../services/discordApi.ts';

type LineupEntryMode = 'menu' | 'create' | 'current';

interface TeamLayoutProps {
  squadGroups: SquadGroup[];
  memberPool: Member[];
  skills: Skill[];
  assignedMemberIds: Set<string>;
  onSquadGroupsChange: React.Dispatch<React.SetStateAction<SquadGroup[]>>;
  lineupEntryMode: LineupEntryMode;
  onLineupEntryModeChange: (mode: LineupEntryMode) => void;
  onSquadGroupLeaderChange: (groupId: string, leaderMemberId: string | null) => void;
  onMemberPoolChange: (members: Member[]) => void;
  onAssignSkillToMember: (memberId: string, skill: Skill) => void;
  onSkillsChange: (skills: Skill[]) => void;
  onAddSkills: (skillsData: Omit<Skill, 'id'>[]) => void;
  onDeleteSkill: (id: string) => void;
  onClearAllSkills: () => void;
  onRemoveSkillFromMember: (memberId: string, skillId: string) => void;
  onClearAll: () => void;
  getMemberById: (id: string) => Member | null;
  isZoomed: boolean;
  onZoomToggle: () => void;
  readOnly: boolean;
  canManageLineup: boolean;
  lineupLock: LineupEditLock | null;
  lineupLockActionLoading: boolean;
  onAcquireLineupLock: () => void;
  onReleaseLineupLock: () => void;
  onOverrideLineupLock: () => void;
  snapshotsOnly: boolean;
  canManageSnapshots: boolean;
  canRestoreSnapshots: boolean;
  snapshotState: LineupSnapshotState;
  snapshotActions: Pick<LineupSnapshotActions, 'openSnapshots' | 'closeSnapshots' | 'selectSnapshot' | 'saveSnapshot' | 'restoreSnapshot' | 'removeSnapshot' | 'refreshSnapshots'>;
}

export const TeamLayout: React.FC<TeamLayoutProps> = ({
  squadGroups,
  memberPool,
  skills,
  assignedMemberIds,
  onSquadGroupsChange,
  lineupEntryMode,
  onLineupEntryModeChange,
  onSquadGroupLeaderChange,
  onMemberPoolChange,
  onAssignSkillToMember,
  onSkillsChange,
  onAddSkills,
  onDeleteSkill,
  onClearAllSkills,
  onRemoveSkillFromMember,
  onClearAll,
  getMemberById,
  isZoomed,
  onZoomToggle,
  readOnly,
  canManageLineup,
  lineupLock,
  lineupLockActionLoading,
  onAcquireLineupLock,
  onReleaseLineupLock,
  onOverrideLineupLock,
  snapshotsOnly,
  canManageSnapshots,
  canRestoreSnapshots,
  snapshotState,
  snapshotActions,
}) => {
  const { confirm } = useSystemDialog();
  const [activeId, setActiveId] = React.useState<string | null>(null);
  const [activeData, setActiveData] = React.useState<any>(null);
  const [sidePanelTab, setSidePanelTab] = React.useState<'members' | 'skills'>('members');
  const restoreRequestedRef = React.useRef(false);
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

    const getSlotIdForMember = (memberId: string) => {
      let slotId: string | null = null;
      squadGroups.forEach(group => {
        group.teams.forEach(team => {
          const sIdx = team.memberIds.indexOf(memberId);
          if (sIdx !== -1) slotId = `${team.id}-slot-${sIdx}`;

          const rIdx = team.reserveMemberIds.indexOf(memberId);
          if (rIdx !== -1) slotId = `${team.id}-reserve-${rIdx}`;
        });
      });
      return slotId;
    };

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

    // Cases
    if (origin === 'pool') {
      if (isValidSlotId(squadGroups, dropId)) {
        onSquadGroupsChange(prev => updateMemberInSlot(prev, dropId, member.id));
      }
    } else if (typeof origin === 'string' && isValidSlotId(squadGroups, origin)) {
      const isOverPool = dropId === 'pool' || (overData?.type === 'member-target' && !assignedMemberIds.has(overData.member.id));
      if (isOverPool) {
        (member.assignedSkills || []).forEach((skillId: string) => onRemoveSkillFromMember(member.id, skillId));
        onSquadGroupsChange(prev => updateMemberInSlot(prev, origin, null));
        return;
      }

      let targetSlotId: string | null = null;

      if (isValidSlotId(squadGroups, dropId)) {
        targetSlotId = dropId;
      } else if (overData?.type === 'member-target' && assignedMemberIds.has(overData.member.id)) {
        targetSlotId = getSlotIdForMember(overData.member.id);
      }

      if (!targetSlotId || targetSlotId === origin) return;

      onSquadGroupsChange(prev => {
        const targetMemberId = getMemberIdInSlotFromGroups(prev, targetSlotId);
        return updateMemberInSlot(updateMemberInSlot(prev, origin, targetMemberId), targetSlotId, member.id);
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

  const resetSquadSetup = useCallback(async () => {
    const confirmed = await confirm({
      message: 'Tạo lại đội hình sẽ xóa toàn bộ vị trí đã xếp hiện tại. Bạn có chắc không?',
      variant: 'warning',
      confirmLabel: 'Tạo lại',
    });
    if (!confirmed) return;

    clearAssignedLineupSkills();
    onLineupEntryModeChange('menu');
    onSquadGroupsChange([]);
  }, [clearAssignedLineupSkills, confirm, onLineupEntryModeChange, onSquadGroupsChange]);

  const handleCreateNewLineup = useCallback(async () => {
    if (squadGroups.length > 0) {
      const confirmed = await confirm({
        message: 'Tạo đội hình mới sẽ xóa toàn bộ vị trí đã xếp hiện tại. Bạn có chắc không?',
        variant: 'warning',
        confirmLabel: 'Tạo mới',
      });
      if (!confirmed) return;
    }

    clearAssignedLineupSkills();
    onSquadGroupsChange([]);
    onLineupEntryModeChange('create');
  }, [clearAssignedLineupSkills, confirm, onLineupEntryModeChange, onSquadGroupsChange, squadGroups.length]);

  const handleUseSavedLineup = useCallback(() => {
    restoreRequestedRef.current = true;
    void snapshotActions.openSnapshots();
  }, [snapshotActions.openSnapshots]);

  const handleCreateSquadGroups = useCallback((groups: SquadGroup[]) => {
    onSquadGroupsChange(groups);
    onLineupEntryModeChange('current');
  }, [onLineupEntryModeChange, onSquadGroupsChange]);

  const lockBanner = canManageLineup ? (
    <div className="shrink-0 border-b border-slate-800/80 bg-slate-950/55 px-4 py-3 backdrop-blur-md">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-800 bg-slate-900/60 px-4 py-3 shadow-lg shadow-slate-950/20">
        <div className="flex items-center gap-3">
          <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${lineupLock?.isHeldByMe ? 'bg-emerald-500/15 text-emerald-300' : lineupLock ? 'bg-amber-500/15 text-amber-300' : 'bg-sky-500/15 text-sky-300'}`}>
            {lineupLock?.isHeldByMe ? <LockOpen size={18} /> : lineupLock ? <Lock size={18} /> : <ShieldAlert size={18} />}
          </div>
          <div>
            <p className="text-xs font-black uppercase tracking-wider text-slate-100">
              {lineupLock?.isHeldByMe ? 'Bạn đang chỉnh sửa đội hình' : lineupLock ? `Đang được chỉnh bởi ${lineupLock.holderName}` : 'Đội hình đang ở chế độ xem'}
            </p>
            <p className="mt-1 text-[11px] text-slate-400">
              {lineupLock?.isHeldByMe ? 'Người khác vẫn có thể xem cập nhật realtime nhưng không thể thay đổi.' : 'Bấm bắt đầu chỉnh sửa để khóa quyền thay đổi đội hình cho phiên của bạn.'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {lineupLock?.isHeldByMe ? (
            <button
              onClick={onReleaseLineupLock}
              disabled={lineupLockActionLoading}
              className="rounded-lg border border-emerald-400/30 bg-emerald-500/12 px-4 py-2 text-xs font-bold uppercase tracking-wider text-emerald-200 transition-colors hover:border-emerald-300/50 hover:bg-emerald-500/18 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Kết thúc chỉnh sửa
            </button>
          ) : (
            <>
              <button
                onClick={onAcquireLineupLock}
                disabled={lineupLockActionLoading || !!lineupLock}
                className="rounded-lg border border-sky-400/30 bg-sky-500/12 px-4 py-2 text-xs font-bold uppercase tracking-wider text-sky-200 transition-colors hover:border-sky-300/50 hover:bg-sky-500/18 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Bắt đầu chỉnh sửa
              </button>
              {lineupLock?.canOverride && (
                <button
                  onClick={onOverrideLineupLock}
                  disabled={lineupLockActionLoading}
                  className="rounded-lg border border-amber-400/30 bg-amber-500/12 px-4 py-2 text-xs font-bold uppercase tracking-wider text-amber-200 transition-colors hover:border-amber-300/50 hover:bg-amber-500/18 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Chiếm quyền
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  ) : null;

  React.useEffect(() => {
    if (restoreRequestedRef.current && squadGroups.length > 0 && !snapshotState.snapshotActionLoading) {
      restoreRequestedRef.current = false;
      onLineupEntryModeChange('current');
    }
  }, [onLineupEntryModeChange, snapshotState.snapshotActionLoading, squadGroups.length]);

  React.useEffect(() => {
    if (lineupEntryMode !== 'menu' || snapshotsOnly) {
      menuSnapshotsFetchedRef.current = false;
      return;
    }

    if (!menuSnapshotsFetchedRef.current && !snapshotState.snapshotsLoading) {
      menuSnapshotsFetchedRef.current = true;
      void snapshotActions.refreshSnapshots();
    }
  }, [lineupEntryMode, snapshotsOnly, snapshotActions.refreshSnapshots, snapshotState.snapshotsLoading]);

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
          selectedSnapshot={snapshotState.selectedSnapshot}
          loading={snapshotState.snapshotsLoading}
          detailLoading={snapshotState.snapshotDetailLoading}
          actionLoading={snapshotState.snapshotActionLoading}
          canRestoreSnapshot={false}
          canDeleteSnapshot={false}
          recentSnapshotAction={snapshotState.recentSnapshotAction}
          isZoomed={isZoomed}
          onZoomToggle={onZoomToggle}
          skills={skills}
          getMemberById={getMemberById}
          onSelectSnapshot={snapshotId => { void snapshotActions.selectSnapshot(snapshotId); }}
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
        {lockBanner}
        {lineupEntryMode === 'menu' && !readOnly ? (
          <LineupEntryMenu
            hasCurrentLineup={squadGroups.length > 0}
            canCreateLineup={!readOnly}
            canRestoreSnapshots={canRestoreSnapshots}
            snapshotCount={snapshotState.snapshots.length}
            snapshotsLoading={snapshotState.snapshotsLoading}
            onCreateNew={handleCreateNewLineup}
            onUseSaved={handleUseSavedLineup}
          />
        ) : squadGroups.length === 0 && !readOnly ? (
          <SquadSetupScreen onCreate={handleCreateSquadGroups} />
        ) : squadGroups.length === 0 ? (
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
        ) : (
          <div className="flex min-h-0 flex-1 overflow-hidden">
        {!isZoomed && !readOnly && (
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
                  onDeleteMember={async (id) => {
                    const confirmed = await confirm({
                      message: 'Xóa thành viên này?',
                      variant: 'danger',
                      confirmLabel: 'Xóa',
                    });
                    if (!confirmed) return;
                    onMemberPoolChange(prev => prev.filter(m => m.id !== id));
                  }}
                  onRemoveSkillFromMember={onRemoveSkillFromMember}
                />
              ) : (
                <SkillPool
                  skills={skills}
                  onAddSkills={onAddSkills}
                  onDeleteSkill={onDeleteSkill}
                  onClearAllSkills={onClearAllSkills}
                />
              )}
            </div>
          </aside>
        )}
        <MainBoard
          squadGroups={squadGroups}
          skills={skills}
          getMemberById={getMemberById}
          onRemoveSkillFromMember={onRemoveSkillFromMember}
          onResetSquadSetup={resetSquadSetup}
          onSquadGroupLeaderChange={onSquadGroupLeaderChange}
          readOnly={readOnly}
          canManageSnapshots={canManageSnapshots}
          canRestoreSnapshots={canRestoreSnapshots}
          snapshotState={snapshotState}
          snapshotActions={snapshotActions}
        />
          </div>
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
          canRestoreSnapshot={canRestoreSnapshots}
          canDeleteSnapshot={canManageSnapshots}
          recentSnapshotAction={snapshotState.recentSnapshotAction}
          skills={skills}
          getMemberById={getMemberById}
          onClose={snapshotActions.closeSnapshots}
          onSelectSnapshot={snapshotId => { void snapshotActions.selectSnapshot(snapshotId); }}
          onRestoreSnapshot={snapshotId => { void snapshotActions.restoreSnapshot(snapshotId); }}
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
