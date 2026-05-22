/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Member, Skill, SquadTeam } from '../../types.ts';
import { MemberSlot } from './MemberSlot.tsx';

interface TeamCardProps {
  team: SquadTeam;
  skills: Skill[];
  index: number;
  accent: string;
  getMemberById: (id: string) => Member | null;
  onRemoveSkillFromMember: (memberId: string, skillId: string) => void;
  readOnly?: boolean;
  hideSkills?: boolean;
}

export const TeamCard: React.FC<TeamCardProps> = ({ team, skills, index, getMemberById, onRemoveSkillFromMember, readOnly = false, hideSkills = false }) => {
  return (
    <div className="squad-card p-3 flex flex-col gap-2">
      <div className="flex items-center justify-between pb-1 border-b border-slate-700/60 mb-1">
        <div className="w-8 text-[11px] text-slate-600 font-mono">#{index + 1}</div>
        <h3 className="truncate px-2 text-center text-base font-bold uppercase tracking-widest text-slate-100">
          {team.name}
        </h3>
        <div className="w-8 flex justify-end">
          <span className="text-[12px] text-slate-500 font-mono">
            {team.memberIds.filter(Boolean).length}/6
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-1">
        {team.memberIds.map((memberId, idx) => (
          <MemberSlot
            key={`${team.id}-slot-${idx}`}
            id={`${team.id}-slot-${idx}`}
            member={memberId ? getMemberById(memberId) : null}
            skills={skills}
            isLeader={idx === 0}
            onRemoveSkillFromMember={onRemoveSkillFromMember}
            readOnly={readOnly}
            snapshotSkillIds={hideSkills ? [] : team.slotSkills?.[`main-${idx}`]}
            assignmentNote={memberId ? team.memberNotes?.[memberId] : undefined}
          />
        ))}
      </div>

      <div className="mt-1 border-t border-slate-700/60 pt-2">
        <div className="flex items-center justify-between mb-1 px-1">
          <p className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">Dự bị</p>
          <span className="text-[11px] text-slate-600 font-mono">
            {team.reserveMemberIds.filter(Boolean).length}/3
          </span>
        </div>
        <div className="grid grid-cols-1 gap-1">
          {team.reserveMemberIds.map((memberId, idx) => (
            <MemberSlot
              key={`${team.id}-reserve-${idx}`}
              id={`${team.id}-reserve-${idx}`}
              member={memberId ? getMemberById(memberId) : null}
              skills={skills}
              isReserve
              onRemoveSkillFromMember={onRemoveSkillFromMember}
              readOnly={readOnly}
              snapshotSkillIds={hideSkills ? [] : team.slotSkills?.[`reserve-${idx}`]}
              assignmentNote={memberId ? team.memberNotes?.[memberId] : undefined}
            />
          ))}
        </div>
      </div>
    </div>
  );
};
