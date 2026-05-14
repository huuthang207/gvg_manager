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
import { Users, Zap } from 'lucide-react';

interface TeamLayoutProps {
  squadGroups: SquadGroup[];
  memberPool: Member[];
  skills: Skill[];
  assignedMemberIds: Set<string>;
  onSquadGroupsChange: React.Dispatch<React.SetStateAction<SquadGroup[]>>;
  onSquadGroupLeaderChange: (groupId: string, leaderMemberId: string | null) => void;
  onMemberPoolChange: (members: Member[]) => void;
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
  snapshotsOnly: boolean;
  canManageSnapshots: boolean;
  canRestoreSnapshots: boolean;
  snapshotState: LineupSnapshotState;
  snapshotActions: Pick<LineupSnapshotActions, 'openSnapshots' | 'closeSnapshots' | 'selectSnapshot' | 'saveSnapshot' | 'restoreSnapshot' | 'removeSnapshot'>;
}

export const TeamLayout: React.FC<TeamLayoutProps> = ({
  squadGroups,
  memberPool,
  skills,
  assignedMemberIds,
  onSquadGroupsChange,
  onSquadGroupLeaderChange,
  onMemberPoolChange,
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
  snapshotsOnly,
  canManageSnapshots,
  canRestoreSnapshots,
  snapshotState,
  snapshotActions,
}) => {
  const [activeId, setActiveId] = React.useState<string | null>(null);
  const [activeData, setActiveData] = React.useState<any>(null);
  const [sidePanelTab, setSidePanelTab] = React.useState<'members' | 'skills'>('members');

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

    // Helper to find member currently in a slot
    const getMemberIdInSlot = (slotId: string) => {
      const isReserve = slotId.includes('-reserve-');
      const parts = slotId.split(isReserve ? '-reserve-' : '-slot-');
      if (parts.length !== 2) return null;
      const teamId = parts[0];
      const slotIndex = parseInt(parts[1]);

      let foundId: string | null = null;
      const team = squadGroups.flatMap(group => group.teams).find(item => item.id === teamId);
      if (team) {
        foundId = isReserve ? team.reserveMemberIds[slotIndex] : team.memberIds[slotIndex];
      }
      return foundId;
    };

    // Handle Skill dropping
    if (sourceData.type === 'skill') {
      const skill = sourceData.skill as Skill;

      if (dropId.includes('-slot-') || dropId.includes('-reserve-')) {
        const memberIdInSlot = getMemberIdInSlot(dropId);
        if (memberIdInSlot) {
          assignSkillToMember(memberIdInSlot, skill.id);
        }
      } else if (overData?.type === 'member-target') {
        assignSkillToMember(overData.member.id, skill.id);
      }
      return;
    }

    const { member, origin } = sourceData;

    // Helper to update state
    const updateMemberInSlot = (groups: SquadGroup[], slotId: string, memberId: string | null) => {
      const isReserve = slotId.includes('-reserve-');
      const parts = slotId.split(isReserve ? '-reserve-' : '-slot-');
      if (parts.length !== 2) return groups;

      const teamId = parts[0];
      const slotIndex = parseInt(parts[1]);

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
      if (dropId.includes('-slot-') || dropId.includes('-reserve-')) {
        onSquadGroupsChange(prev => updateMemberInSlot(prev, dropId, member.id));
      }
    } else if (typeof origin === 'string' && (origin.includes('-slot-') || origin.includes('-reserve-'))) {
      const isOverPool = dropId === 'pool' || (overData?.type === 'member-target' && !assignedMemberIds.has(overData.member.id));

      if (isOverPool) {
        onSquadGroupsChange(prev => updateMemberInSlot(prev, origin, null));
        onMemberPoolChange(prev => prev.map(m =>
          m.id === member.id ? { ...m, assignedSkills: [] } : m
        ));
      } else {
        let targetSlotId: string | null = null;

        if (dropId.includes('-slot-') || dropId.includes('-reserve-')) {
          targetSlotId = dropId;
        } else if (overData?.type === 'member-target') {
          const targetId = overData.member.id;
          squadGroups.forEach(group => {
            group.teams.forEach(team => {
              const sIdx = team.memberIds.indexOf(targetId);
              if (sIdx !== -1) targetSlotId = `${team.id}-slot-${sIdx}`;

              const rIdx = team.reserveMemberIds.indexOf(targetId);
              if (rIdx !== -1) targetSlotId = `${team.id}-reserve-${rIdx}`;
            });
          });
        }

        if (targetSlotId) {
          if (targetSlotId === origin) return;
          const targetMemberId = getMemberIdInSlot(targetSlotId);
          onSquadGroupsChange(prev => updateMemberInSlot(updateMemberInSlot(prev, origin, targetMemberId), targetSlotId, member.id));
        }
      }
    }
  };

  const resetSquadSetup = useCallback(() => {
    if (!confirm('Tạo lại đội hình sẽ xóa toàn bộ vị trí đã xếp hiện tại. Bạn có chắc không?')) return;
    onSquadGroupsChange([]);
  }, [onSquadGroupsChange]);

  const assignSkillToMember = useCallback((memberId: string, skillId: string) => {
    onMemberPoolChange(prev => prev.map(m => {
      if (m.id === memberId) {
        const assignedSkills = m.assignedSkills || [];
        if (assignedSkills.includes(skillId)) return m;
        return { ...m, assignedSkills: [...assignedSkills, skillId] };
      }
      return m;
    }));
  }, [onMemberPoolChange]);

  React.useEffect(() => {
    if (snapshotsOnly && !snapshotState.snapshotsOpen && !snapshotState.snapshotsLoading) {
      void snapshotActions.openSnapshots();
    }
  }, [snapshotsOnly, snapshotState.snapshotsOpen, snapshotState.snapshotsLoading, snapshotActions.openSnapshots]);

  if (snapshotsOnly) {
    return (
      <main className="h-full min-h-0 flex-1 overflow-hidden bg-[#0F172A] p-4">
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
      <main className="flex h-full min-h-0 flex-1 overflow-hidden">
        {squadGroups.length === 0 ? (
          <SquadSetupScreen onCreate={onSquadGroupsChange} />
        ) : (
          <>
        {!isZoomed && !readOnly && (
          <aside className="w-80 h-full min-h-0 shrink-0 border-r border-slate-800 bg-[#0F172A] flex flex-col overflow-hidden">
            <div className="grid grid-cols-2 gap-1 p-2 border-b border-slate-800 bg-[#0F172A]/80 backdrop-blur-md">
              <button
                onClick={() => setSidePanelTab('members')}
                className={`flex items-center justify-center gap-2 rounded-lg px-3 py-2 text-[11px] font-bold uppercase tracking-wider transition-colors ${sidePanelTab === 'members' ? 'bg-sky-500 text-white shadow-lg shadow-sky-500/20' : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'}`}
              >
                <Users size={14} />
                Thành viên
              </button>
              <button
                onClick={() => setSidePanelTab('skills')}
                className={`flex items-center justify-center gap-2 rounded-lg px-3 py-2 text-[11px] font-bold uppercase tracking-wider transition-colors ${sidePanelTab === 'skills' ? 'bg-amber-500 text-white shadow-lg shadow-amber-500/20' : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'}`}
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
                  onDeleteMember={(id) => {
                    if (confirm('Xóa thành viên này?')) {
                      onMemberPoolChange(prev => prev.filter(m => m.id !== id));
                    }
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
          </>
        )}
      </main>

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
