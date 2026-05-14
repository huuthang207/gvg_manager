/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { useDraggable, useDroppable } from '@dnd-kit/core';
import { Member, Skill } from '../../types.ts';
import { CLASS_COLORS, CLASS_ICONS } from '../../constants.ts';
import * as LucideIcons from 'lucide-react';
import { cn } from '../../lib/utils.ts';

interface MemberCardProps {
  member: Member;
  skills: Skill[];
  isOverlay?: boolean;
  inSlot?: boolean;
  isLeader?: boolean;
  className?: string;
  onEdit?: () => void;
  onDelete?: () => void;
  onRemoveSkill?: (skillId: string) => void;
}

export const MemberCard = React.forwardRef<HTMLDivElement, MemberCardProps>(
  ({ member, skills, isOverlay, inSlot, isLeader, className, onEdit, onDelete, onRemoveSkill }, ref) => {
    const color = CLASS_COLORS[member.classType];
    
    return (
      <div
        ref={ref}
        className={cn(
          "flex items-center gap-1.5 rounded-md text-[12px] transition-all select-none w-full min-w-0 transition-colors",
          isOverlay 
            ? "opacity-90 scale-105 shadow-2xl rotate-1 bg-[#1E293B] p-2 border border-slate-600" 
            : inSlot
              ? "border border-transparent hover:bg-slate-700/30 px-1 py-0.5"
              : "bg-slate-800/40 border border-slate-700/50 hover:bg-slate-800 hover:border-slate-600 p-1.5",
          isLeader && "ring-1 ring-indigo-500/50 shadow-[0_0_15px_rgba(99,102,241,0.15)] bg-gradient-to-r from-indigo-500/10 via-transparent to-transparent",
          className
        )}
        style={inSlot ? { 
          backgroundColor: `${color}20`, 
          borderTopColor: `${color}50`,
          borderRightColor: `${color}50`,
          borderBottomColor: `${color}50`,
          borderLeftWidth: isLeader ? '6px' : '4px',
          borderLeftColor: isLeader ? '#818cf8' : color, 
          boxShadow: isLeader ? 'inset 2px 0 10px rgba(99, 102, 241, 0.1)' : 'none'
        } : {}}
      >
        <img src={CLASS_ICONS[member.classType]} alt="" className="w-7 h-7 object-contain shrink-0" />
        
        <div className="flex-1 min-w-0 flex items-center gap-1.5">
          <p className="font-bold truncate text-slate-100">{member.name}</p>
          {isLeader && <LucideIcons.Crown size={11} className="text-indigo-400 shrink-0 drop-shadow-[0_0_3px_rgba(129,140,248,0.5)]" />}
          {member.previousClassType && member.previousClassType !== member.classType && (
            <LucideIcons.AlertTriangle
              size={11}
              className="text-amber-400 shrink-0"
              aria-label={`Đã đổi phái: ${member.previousClassType} → ${member.classType}`}
            />
          )}

          {/* Assigned Skills integrated here */}
          {skills.length > 0 && (
            <div className="flex items-center gap-1 ml-auto shrink-0 bg-black/30 p-0.5 rounded-md border border-white/5">
              {skills.map(skill => (
                <div 
                  key={skill.id} 
                  className="group/skill relative w-8 h-8 rounded overflow-hidden border border-slate-700 shadow-sm transition-all hover:scale-110 hover:z-10 cursor-default bg-slate-900"
                  title={skill.name}
                >
                  <img src={skill.logo} alt={skill.name} className="w-full h-full object-cover" />
                  {onRemoveSkill && (
                    <button
                      onPointerDown={e => e.stopPropagation()}
                      onClick={(e) => {
                        e.stopPropagation();
                        onRemoveSkill(skill.id);
                      }}
                      className="absolute inset-0 bg-red-500/90 items-center justify-center hidden group-hover/skill:flex backdrop-blur-[1px] transition-all"
                    >
                      <LucideIcons.X size={14} className="text-white font-bold" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {(onEdit || onDelete) && (
          <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
            {onEdit && (
              <button 
                onPointerDown={e => e.stopPropagation()}
                onClick={(e) => {
                  e.stopPropagation();
                  onEdit();
                }}
                className="p-1 text-slate-500 hover:text-sky-400 transition-colors"
                title="Sửa"
              >
                <LucideIcons.Edit2 size={11} />
              </button>
            )}
            {onDelete && (
              <button 
                onPointerDown={e => e.stopPropagation()}
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete();
                }}
                className="p-1 text-slate-500 hover:text-red-400 transition-colors"
                title="Xóa"
              >
                <LucideIcons.Trash2 size={11} />
              </button>
            )}
          </div>
        )}
      </div>
    );
  }
);

interface DraggableMemberProps {
  member: Member;
  skills?: Skill[];
  origin?: 'pool' | string; // 'pool' or slotId
  isLeader?: boolean;
  onEdit?: () => void;
  onDelete?: () => void;
  onRemoveSkill?: (skillId: string) => void;
  readOnly?: boolean;
}

export const DraggableMember: React.FC<DraggableMemberProps> = ({ member, skills = [], origin, isLeader, onEdit, onDelete, onRemoveSkill, readOnly = false }) => {
  const { attributes, listeners, setNodeRef: setDragRef, isDragging } = useDraggable({
    id: `draggable-${member.id}`,
    data: {
      type: 'member',
      member,
      origin,
    },
    disabled: readOnly,
  });

  const { isOver, setNodeRef: setDropRef } = useDroppable({
    id: `droppable-member-${member.id}`,
    data: {
      type: 'member-target',
      member,
    },
    disabled: readOnly,
  });

  // Use a combined ref for dnd-kit (draggable + droppable)
  const setCombinedRef = (node: HTMLDivElement | null) => {
    setDragRef(node);
    setDropRef(node);
  };

  return (
    <div
      ref={setCombinedRef}
      {...listeners}
      {...attributes}
      className={cn(
        "w-full min-w-0 group transition-colors duration-150",
        isDragging ? "opacity-25" : "opacity-100",
        isOver && "ring-2 ring-amber-500/50 brightness-110"
      )}
    >
      <MemberCard 
        member={member} 
        skills={skills}
        onEdit={onEdit} 
        onDelete={onDelete} 
        inSlot={origin !== 'pool'} 
        isLeader={isLeader}
        onRemoveSkill={onRemoveSkill}
      />
    </div>
  );
};
