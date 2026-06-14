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
  accent: string;
  getMemberById: (id: string) => Member | null;
  onRemoveSkillFromMember: (memberId: string, skillId: string) => void;
  readOnly?: boolean;
  hideSkills?: boolean;
}

export const TeamCard: React.FC<TeamCardProps> = ({ team, skills, accent, getMemberById, onRemoveSkillFromMember, readOnly = false, hideSkills = false }) => {
  return (
    <div className="flex flex-col gap-2.5 rounded-2xl border border-slate-800/80 bg-slate-900/45 p-3 shadow-sm shadow-slate-950/15 transition-colors hover:border-slate-700/90 hover:bg-slate-900/60">
      <div className="mb-1 flex items-center justify-between gap-2 rounded-xl border border-slate-800/80 bg-slate-950/40 px-3 py-2">
        <div className="flex min-w-0 items-center gap-2">
          <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: accent }} />
        </div>
        <h3 className="truncate px-2 text-center text-sm font-black uppercase tracking-widest text-slate-100">
          {team.name}
        </h3>
        <span className="shrink-0 rounded-full border border-slate-700/70 bg-slate-800/55 px-2 py-0.5 text-[10px] font-black text-slate-400">
          {team.memberIds.filter(Boolean).length}/6
        </span>
      </div>

      <div className="grid grid-cols-1 gap-1.5">
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
          />
        ))}
      </div>

    </div>
  );
};
