/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { Skill } from '../../types.ts';
import { Search, Zap } from 'lucide-react';
import { cn } from '../../lib/utils.ts';
import { useDraggable } from '@dnd-kit/core';

interface SkillPoolProps {
  skills: Skill[];
}

export const SkillPool: React.FC<SkillPoolProps> = ({
  skills
}) => {
  const [search, setSearch] = useState('');

  const filteredSkills = useMemo(() => {
    return skills.filter(s => s.name.toLowerCase().includes(search.toLowerCase()));
  }, [skills, search]);

  return (
    <div className="flex flex-col h-full min-h-0 bg-slate-950/20 overflow-hidden transition-all">
      <div className="flex flex-col gap-4 border-b border-slate-800/80 bg-slate-950/35 p-4 backdrop-blur-md">
        <div className="relative px-0.5">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" size={14} />
          <input 
            type="text" 
            placeholder="Tìm kỹ năng..." 
            className="w-full rounded-lg border border-slate-700/70 bg-slate-800/60 py-2 pl-10 pr-4 text-[13px] text-slate-100 placeholder:text-slate-500 transition-colors focus:outline-none focus:border-amber-400/70"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-2 grid grid-cols-3 gap-2 custom-scrollbar bg-slate-950/10 content-start">
        {filteredSkills.length === 0 ? (
          <div className="col-span-3 flex flex-col items-center justify-center p-8 opacity-40 text-center">
            <Zap size={32} className="mb-2" />
            <p className="text-[10px] uppercase tracking-wider font-medium">Chưa có kỹ năng</p>
          </div>
        ) : (
          filteredSkills.map(skill => (
            <DraggableSkill
              key={skill.id}
              skill={skill}
            />
          ))
        )}
      </div>
    </div>
  );
};

interface DraggableSkillProps {
  skill: Skill;
}

const DraggableSkill: React.FC<DraggableSkillProps> = ({ skill }) => {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `skill-${skill.id}`,
    data: {
      type: 'skill',
      skill,
    },
  });

  const style = transform ? {
    transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
    zIndex: isDragging ? 100 : undefined,
  } : undefined;

  return (
    <div 
      ref={setNodeRef}
      style={style}
      className={cn(
        "group relative aspect-square rounded-xl border border-slate-700/60 bg-slate-900/75 p-2.5 flex items-center justify-center cursor-grab active:cursor-grabbing hover:border-amber-400/50 hover:bg-slate-800/85 hover:shadow-[0_0_12px_rgba(245,158,11,0.14)] transition-colors",
        isDragging && "opacity-50 ring-2 ring-amber-500"
      )}
      {...listeners}
      {...attributes}
      title={skill.name}
    >
      <img src={skill.logo} alt={skill.name} className="w-full h-full object-contain drop-shadow-[0_6px_10px_rgba(0,0,0,0.35)]" />

      <div className="absolute inset-x-1 bottom-1 rounded-md bg-black/75 py-0.5 px-1 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
        <p className="text-[7px] font-bold text-white uppercase truncate text-center">{skill.name}</p>
      </div>
    </div>
  );
};
