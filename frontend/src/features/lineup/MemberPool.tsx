/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { Member, ClassType, Skill } from '../../types.ts';
import { CLASSES, CLASS_COLORS, CLASS_ICONS } from '../../constants.ts';
import { DraggableMember } from './MemberCard.tsx';
import { Search, Filter } from 'lucide-react';
import { cn } from '../../lib/utils.ts';

import { useDroppable } from '@dnd-kit/core';

interface MemberPoolProps {
  members: Member[];
  skills: Skill[];
  assignedMemberIds: Set<string>;
  onRemoveSkillFromMember: (memberId: string, skillId: string) => void;
}

export const MemberPool: React.FC<MemberPoolProps> = ({
  members,
  skills,
  assignedMemberIds,
  onRemoveSkillFromMember,
}) => {
  const [search, setSearch] = useState('');
  const [selectedClass, setSelectedClass] = useState<ClassType | 'All'>('All');

  const { setNodeRef, isOver } = useDroppable({
    id: 'pool',
  });

  // Calculate unassigned members for counts
  const unassignedMembers = useMemo(() => {
    return members.filter(m => !assignedMemberIds.has(m.id));
  }, [members, assignedMemberIds]);

  const classCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    CLASSES.forEach(cls => counts[cls] = 0);
    unassignedMembers.forEach(m => {
      if (counts[m.classType] !== undefined) {
        counts[m.classType]++;
      }
    });
    return counts;
  }, [unassignedMembers]);

  const filteredMembers = useMemo(() => {
    return unassignedMembers.filter(m => {
      const matchesSearch = m.name.toLowerCase().includes(search.toLowerCase());
      const matchesClass = selectedClass === 'All' || m.classType === selectedClass;
      return matchesSearch && matchesClass;
    });
  }, [unassignedMembers, search, selectedClass]);

  return (
    <div
      className={cn(
        "relative flex flex-col h-full min-h-0 bg-slate-950/20 overflow-hidden transition-colors",
        isOver && "bg-sky-500/5 shadow-[inset_0_0_20px_rgba(14,165,233,0.1)]"
      )}
    >
      <div ref={setNodeRef} className="pointer-events-none absolute inset-0" />
      <div className="flex flex-col gap-4 border-b border-slate-800/80 bg-slate-950/35 p-4 backdrop-blur-md">
        <div className="relative px-0.5">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" size={14} />
          <input 
            type="text" 
            placeholder="Tìm kiếm thành viên..." 
            className="w-full rounded-lg border border-slate-700/70 bg-slate-800/60 py-2 pl-10 pr-4 text-[13px] text-slate-100 placeholder:text-slate-500 transition-colors focus:outline-none focus:border-sky-400/70"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="rounded-xl border border-slate-800/80 bg-slate-950/45 p-1.5 shadow-inner shadow-black/10">
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              onClick={() => setSelectedClass('All')}
              className={cn(
                "flex shrink-0 items-center gap-1 rounded-lg border px-1.5 py-1 text-[10px] font-bold transition-all",
                selectedClass === 'All'
                  ? "border-sky-300/70 bg-sky-400/15 text-sky-100 shadow-lg shadow-sky-950/25 ring-1 ring-sky-300/25"
                  : "border-slate-700/60 bg-slate-800/45 text-slate-400 hover:border-sky-400/35 hover:bg-slate-800/75 hover:text-slate-100"
              )}
              title="Tất cả"
            >
              <span className="flex h-6 w-6 items-center justify-center rounded-md bg-slate-700/70 text-[9px] text-slate-200">
                All
              </span>
              <span>{unassignedMembers.length}</span>
            </button>
            {CLASSES.map(cls => {
              const selected = selectedClass === cls;
              return (
                <button
                  key={cls}
                  onClick={() => setSelectedClass(cls)}
                  className={cn(
                    "flex shrink-0 items-center gap-1 rounded-lg border px-1.5 py-1 text-[10px] font-bold transition-all",
                    selected
                      ? "border-transparent bg-slate-900 text-white shadow-lg shadow-black/20 ring-1"
                      : "border-slate-700/60 bg-slate-800/45 text-slate-400 hover:border-slate-500/80 hover:bg-slate-800/75 hover:text-slate-100"
                  )}
                  style={selected ? { boxShadow: `0 0 0 1px ${CLASS_COLORS[cls]}66, 0 10px 24px rgba(2, 6, 23, 0.25)` } : {}}
                  title={cls}
                >
                  <span
                    className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md border bg-slate-950/40 p-0.5"
                    style={{ borderColor: `${CLASS_COLORS[cls]}66`, backgroundColor: `${CLASS_COLORS[cls]}18` }}
                  >
                    <img src={CLASS_ICONS[cls]} alt="" className="h-full w-full object-contain" />
                  </span>
                  <span style={selected ? { color: CLASS_COLORS[cls] } : {}}>{classCounts[cls]}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-2 flex flex-col gap-1 custom-scrollbar bg-slate-950/10">
        {filteredMembers.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-8 opacity-40 text-center">
            <Filter size={40} className="mb-2" />
            <p className="text-sm">Không tìm thấy thành viên phù hợp</p>
          </div>
        ) : (
          filteredMembers.map(member => (
            <DraggableMember
              key={member.id}
              member={member}
              skills={(member.assignedSkills || []).map(id => skills.find(s => s.id === id)).filter(Boolean) as Skill[]}
              origin="pool"
              onRemoveSkill={(skillId) => onRemoveSkillFromMember(member.id, skillId)}
            />
          ))
        )}
      </div>
    </div>
  );
};
