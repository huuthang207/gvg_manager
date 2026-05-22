/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { useDraggable, useDroppable } from '@dnd-kit/core';
import { Member, Skill } from '../../types.ts';
import { getClassColor, getClassIcon } from '../../constants.ts';
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
    const color = getClassColor(member.classType);
    const classIcon = getClassIcon(member.classType);

    return (
      <div
        ref={ref}
        className={cn(
          "flex items-center gap-1.5 rounded-md text-[12px] transition-all select-none w-full min-w-0 transition-colors",
          isOverlay 
            ? "opacity-90 scale-105 shadow-2xl rotate-1 bg-slate-800 p-2 border border-slate-600/80"
            : inSlot
              ? "border border-transparent hover:bg-slate-700/25 px-1 py-0.5"
              : "bg-slate-800/55 border border-slate-700/60 hover:bg-slate-800/90 hover:border-slate-600/90 p-1.5",
          className
        )}
        style={inSlot ? { 
          backgroundColor: `${color}24`,
          borderTopColor: `${color}55`,
          borderRightColor: `${color}55`,
          borderBottomColor: `${color}55`,
          borderLeftWidth: '4px',
          borderLeftColor: color,
        } : {}}
      >
        {classIcon ? (
          <img src={classIcon} alt="" className="w-7 h-7 object-contain shrink-0" />
        ) : (
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-slate-600/70 bg-slate-950/40 text-[10px] font-black text-slate-200">
            ?
          </div>
        )}
        
        <div className="flex-1 min-w-0 flex items-center gap-1.5">
          <p className="font-bold truncate text-slate-100">{member.name}</p>
          {member.previousClassType && member.previousClassType !== member.classType && (
            <LucideIcons.AlertTriangle
              size={11}
              className="text-amber-400 shrink-0"
              aria-label={`Đã đổi phái: ${member.previousClassType} → ${member.classType}`}
            />
          )}

          {/* Assigned Skills integrated here */}
          {skills.length > 0 && (
            <div className="flex items-center gap-1 ml-auto shrink-0 rounded-md border border-slate-600/35 bg-slate-950/45 p-0.5">
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
  const dndInstanceId = `${origin || 'readonly'}-${member.id}`;

  const { attributes, listeners, setNodeRef: setDragRef, isDragging } = useDraggable({
    id: `draggable-${dndInstanceId}`,
    data: {
      type: 'member',
      member,
      origin,
    },
    disabled: readOnly,
  });

  const { isOver, setNodeRef: setDropRef } = useDroppable({
    id: `droppable-member-${dndInstanceId}`,
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
