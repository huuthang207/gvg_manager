/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { useDroppable } from '@dnd-kit/core';
import { Member, Skill } from '../../types.ts';
import { DraggableMember } from './MemberCard.tsx';
import { cn } from '../../lib/utils.ts';
import { Users } from 'lucide-react';

interface MemberSlotProps {
  id: string; // The slot ID: division-team-index
  member: Member | null;
  skills: Skill[];
  isReserve?: boolean;
  isLeader?: boolean;
  onRemoveSkillFromMember: (memberId: string, skillId: string) => void;
  readOnly?: boolean;
  snapshotSkillIds?: string[];
}

export const MemberSlot: React.FC<MemberSlotProps> = ({ id, member, skills, isReserve, isLeader, onRemoveSkillFromMember, readOnly = false, snapshotSkillIds }) => {
  const { isOver, setNodeRef } = useDroppable({
    id,
    disabled: readOnly,
  });

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "relative w-full rounded-md border transition-all flex items-center text-[12px] overflow-hidden group/slot",
        isReserve ? "min-h-[30px] py-1" : "min-h-[36px]",
        isOver
          ? "border-sky-400 bg-sky-500/12 ring-1 ring-sky-400/30"
          : member
            ? "border-transparent bg-transparent"
            : isReserve
              ? "border-slate-700/60 bg-slate-900/24 border-dashed hover:border-slate-600"
              : "border-slate-700/60 bg-slate-950/35 border-dashed hover:border-sky-400/55",
        !member && "px-1.5 text-slate-500 italic justify-center text-[12px]"
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
        <div className="flex items-center gap-1.5 opacity-40">
          {isLeader && (
            <div className="flex items-center gap-1 text-indigo-400 drop-shadow-[0_0_2px_rgba(99,102,241,0.3)]">
              <Users size={12} strokeWidth={3} />
              <span className="font-black text-[10px] tracking-tighter">ĐỘI TRƯỞNG</span>
            </div>
          )}
          {!isLeader && <span>Trống</span>}
        </div>
      )}
    </div>
  );
};
