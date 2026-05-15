/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { Member, ClassType, Skill } from '../../types.ts';
import { CLASSES, CLASS_COLORS } from '../../constants.ts';
import { DraggableMember } from './MemberCard.tsx';
import { Search, Filter, Users } from 'lucide-react';
import { cn } from '../../lib/utils.ts';

import { useDroppable } from '@dnd-kit/core';

interface MemberPoolProps {
  members: Member[];
  skills: Skill[];
  assignedMemberIds: Set<string>;
  onDeleteMember: (id: string) => void;
  onRemoveSkillFromMember: (memberId: string, skillId: string) => void;
}

export const MemberPool: React.FC<MemberPoolProps> = ({
  members,
  skills,
  assignedMemberIds,
  onDeleteMember,
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
        <div className="flex items-center justify-between px-1">
          <h2 className="text-xs font-bold uppercase tracking-widest text-slate-100 flex items-center gap-2">
            <Users size={16} className="text-sky-400" />
            Thành Viên 
            <div className="flex items-center gap-1.5 ml-1">
              <span className="text-[10px] bg-sky-500/10 text-sky-400 border border-sky-500/20 px-2 py-0.5 rounded-full">
                {unassignedMembers.length}
              </span>
              {search && (
                <span className="text-[10px] bg-amber-500/10 text-amber-400 border border-amber-500/20 px-2 py-0.5 rounded-full">
                  {filteredMembers.length}
                </span>
              )}
            </div>
          </h2>
        </div>

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

        <div className="flex flex-wrap gap-1.5 px-0.5">
          <button
            onClick={() => setSelectedClass('All')}
            className={cn(
              "px-2 py-1 text-[10px] font-bold uppercase rounded-md border transition-all flex items-center gap-1.5",
              selectedClass === 'All' 
                ? "bg-slate-200 text-slate-950 border-slate-200 shadow-md"
                : "bg-slate-800/60 border-slate-700/60 text-slate-400 hover:border-slate-600 hover:text-slate-200"
            )}
          >
            Tất cả 
            <span className={cn(
              "text-[9px] opacity-70",
              selectedClass === 'All' ? "text-slate-900" : "text-slate-500"
            )}>
              {unassignedMembers.length}
            </span>
          </button>
          {CLASSES.map(cls => (
            <button
              key={cls}
              onClick={() => setSelectedClass(cls)}
              className={cn(
                "px-2 py-1 text-[10px] font-bold uppercase rounded-md border transition-all flex items-center gap-1.5",
                selectedClass === cls ? "text-slate-950 shadow-md" : "bg-slate-800/60 border-slate-700/60 text-slate-400 hover:border-slate-600 hover:text-slate-200"
              )}
              style={selectedClass === cls ? { backgroundColor: CLASS_COLORS[cls], border: 'none' } : {}}
            >
              {cls.split(' ').map(s => s[0]).join('')}
              <span className={cn(
                "text-[9px] opacity-70",
                selectedClass === cls ? "text-slate-900" : "text-slate-500"
              )}>
                {classCounts[cls]}
              </span>
            </button>
          ))}
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
              onDelete={() => onDeleteMember(member.id)}
              onRemoveSkill={(skillId) => onRemoveSkillFromMember(member.id, skillId)}
            />
          ))
        )}
      </div>
    </div>
  );
};
