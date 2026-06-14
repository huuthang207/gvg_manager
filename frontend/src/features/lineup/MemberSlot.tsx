/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { useDroppable } from '@dnd-kit/core';
import { Member, Skill } from '../../types.ts';
import { DraggableMember } from './MemberCard.tsx';
import { cn } from '../../lib/utils.ts';

interface MemberSlotProps {
  id: string; // The slot ID: division-team-index
  member: Member | null;
  skills: Skill[];
  isLeader?: boolean;
  onRemoveSkillFromMember: (memberId: string, skillId: string) => void;
  readOnly?: boolean;
  snapshotSkillIds?: string[];
}

export const MemberSlot: React.FC<MemberSlotProps> = ({ id, member, skills, isLeader, onRemoveSkillFromMember, readOnly = false, snapshotSkillIds }) => {
  const { isOver, setNodeRef } = useDroppable({
    id,
    disabled: readOnly,
  });

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "relative flex min-h-[40px] w-full items-center overflow-hidden rounded-lg border text-[12px] transition-all group/slot",
        isOver
          ? "border-sky-400 bg-sky-500/12 ring-1 ring-sky-400/30 shadow-[0_0_18px_rgba(56,189,248,0.12)]"
          : member
            ? "border-transparent bg-transparent"
            : "border-slate-700/60 bg-slate-950/35 border-dashed hover:border-sky-400/55 hover:bg-sky-500/5",
        !member && "justify-center px-2 text-[12px] italic text-slate-500"
      )}
    >
      {member ? (
        <div className="w-full relative">
          <DraggableMember
            member={member}
            skills={(snapshotSkillIds ?? member.assignedSkills ?? []).map(sid => skills.find(s => s.id === sid)).filter(Boolean) as Skill[]}
            origin={readOnly ? undefined : id}
            isLeader={isLeader}
            onRemoveSkill={readOnly ? undefined : (skillId) => onRemoveSkillFromMember(member.id, skillId)}
            readOnly={readOnly}
          />
        </div>
      ) : (
        <div className="h-1.5 w-10 rounded-full bg-slate-700/40" />
      )}
    </div>
  );
};
