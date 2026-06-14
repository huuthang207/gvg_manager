/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { Member, ClassType, Skill } from '../../types.ts';
import type { AttendanceSession } from '../../shared/types/auth.ts';
import type { LineupMemberSource } from '../../shared/types/lineup.ts';
import { CLASSES, CLASS_COLORS, CLASS_ICONS } from '../../constants.ts';
import { DraggableMember } from './MemberCard.tsx';
import { Filter, Search, Users } from 'lucide-react';
import { cn } from '../../lib/utils.ts';

import { useDroppable } from '@dnd-kit/core';

interface ClassFilterOptionProps {
  label: string;
  count: number;
  active: boolean;
  onClick: () => void;
  color?: string;
  icon?: string;
}

const ClassFilterOption: React.FC<ClassFilterOptionProps> = ({ label, count, active, onClick, color, icon }) => (
  <button
    type="button"
    onClick={onClick}
    className={cn(
      'flex w-full items-center justify-between gap-2 rounded-lg px-2.5 py-1.5 text-left text-[11px] font-bold transition-colors',
      active ? 'bg-sky-500/20 text-sky-100' : 'text-slate-300 hover:bg-slate-800/80 hover:text-white',
    )}
  >
    <span className="flex min-w-0 items-center gap-2">
      {icon ? (
        <span
          className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md border bg-slate-950/40 p-0.5"
          style={{ borderColor: `${color}66`, backgroundColor: `${color}18` }}
        >
          <img src={icon} alt="" className="h-full w-full object-contain" />
        </span>
      ) : (
        <span className="flex h-6 min-w-7 shrink-0 items-center justify-center rounded-md bg-slate-700/70 px-1.5 text-[9px] text-slate-200">All</span>
      )}
      <span className="truncate">{label}</span>
    </span>
    <span className="rounded-full border border-slate-700/70 bg-slate-900/80 px-2 py-0.5 text-[10px] text-slate-400">{count}</span>
  </button>
);

interface MemberPoolProps {
  members: Member[];
  skills: Skill[];
  assignedMemberIds: Set<string>;
  onRemoveSkillFromMember: (memberId: string, skillId: string) => void;
  lineupMemberSource: LineupMemberSource;
  lineupMemberSourceSessionId: string | null;
  lineupMemberSourceSession: AttendanceSession | null;
  attendanceSessions: AttendanceSession[];
  attendanceImportLoading: boolean;
  attendanceImportError: string;
  onSourceChange: (source: LineupMemberSource) => void;
  onSourceSessionChange: (sessionId: string) => void;
}

export const MemberPool: React.FC<MemberPoolProps> = ({
  members,
  skills,
  assignedMemberIds,
  onRemoveSkillFromMember,
  lineupMemberSource,
  lineupMemberSourceSessionId,
  lineupMemberSourceSession,
  attendanceSessions,
  attendanceImportLoading,
  attendanceImportError,
  onSourceChange,
  onSourceSessionChange,
}) => {
  const [search, setSearch] = useState('');
  const [selectedClass, setSelectedClass] = useState<ClassType | 'All'>('All');
  const [classFilterOpen, setClassFilterOpen] = useState(false);

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
      const query = search.toLowerCase();
      const matchesSearch = [m.name, m.ingameName, m.discordDisplayName, m.discordUsername]
        .filter(Boolean)
        .some(value => value!.toLowerCase().includes(query));
      const matchesClass = selectedClass === 'All' || m.classType === selectedClass;
      return matchesSearch && matchesClass;
    });
  }, [unassignedMembers, search, selectedClass]);

  const classFilterTitle = selectedClass === 'All' ? 'Lọc phái' : `Đang lọc: ${selectedClass}`;

  return (
    <div
      className={cn(
        "relative flex flex-col h-full min-h-0 bg-slate-950/20 overflow-hidden transition-colors",
        isOver && "bg-sky-500/5 shadow-[inset_0_0_20px_rgba(14,165,233,0.1)]"
      )}
    >
      <div ref={setNodeRef} className="pointer-events-none absolute inset-0" />
      <div className="border-b border-slate-800/80 bg-slate-950/30 p-3">
        <div className="space-y-2 rounded-2xl border border-slate-800/80 bg-slate-950/35 p-3 shadow-sm shadow-slate-950/10">
          <div className="flex items-center justify-between gap-2 text-[10px] font-black uppercase tracking-wider text-slate-400">
            <span className="flex items-center gap-2">
              <Users size={12} className="text-sky-300" />
              Thành viên chờ xếp
            </span>
            <span className="rounded-full border border-sky-400/25 bg-sky-500/12 px-2 py-0.5 text-sky-200">{filteredMembers.length}/{unassignedMembers.length}</span>
          </div>

          <div className="grid grid-cols-2 gap-1 rounded-xl border border-slate-800 bg-slate-950/60 p-1">
            <button
              onClick={() => onSourceChange('guild')}
              className={`rounded-lg px-2 py-1.5 text-[10px] font-black uppercase tracking-wider transition-colors ${lineupMemberSource === 'guild' ? 'bg-sky-500/85 text-white' : 'text-slate-400 hover:bg-slate-800 hover:text-slate-100'}`}
            >
              Guild
            </button>
            <button
              onClick={() => onSourceChange('attendance')}
              className={`rounded-lg px-2 py-1.5 text-[10px] font-black uppercase tracking-wider transition-colors ${lineupMemberSource === 'attendance' ? 'bg-sky-500/85 text-white' : 'text-slate-400 hover:bg-slate-800 hover:text-slate-100'}`}
            >
              Điểm danh
            </button>
          </div>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={14} />
            <input
              type="text"
              placeholder="Tìm kiếm thành viên..."
              className="w-full rounded-lg border border-slate-700/80 bg-slate-800/70 py-2 pl-9 pr-11 text-xs text-slate-100 placeholder:text-slate-500 transition-colors focus:border-sky-400/70 focus:outline-none"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <button
              type="button"
              onClick={() => setClassFilterOpen(open => !open)}
              className={cn(
                'absolute right-1.5 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-md border transition-colors',
                selectedClass !== 'All'
                  ? 'border-sky-400/45 bg-sky-500/20 text-sky-200'
                  : 'border-slate-700/80 bg-slate-900/80 text-slate-400 hover:border-slate-500 hover:text-slate-100',
              )}
              title={classFilterTitle}
            >
              <Filter size={13} />
            </button>
            {classFilterOpen && (
              <div className="absolute left-0 right-0 top-full z-30 mt-2 max-h-72 overflow-y-auto rounded-xl border border-slate-700/80 bg-slate-950/98 p-1.5 shadow-2xl shadow-slate-950/50 custom-scrollbar">
                <ClassFilterOption
                  label="Tất cả phái"
                  count={unassignedMembers.length}
                  active={selectedClass === 'All'}
                  onClick={() => {
                    setSelectedClass('All');
                    setClassFilterOpen(false);
                  }}
                />
                {CLASSES.map(cls => (
                  <ClassFilterOption
                    key={cls}
                    label={cls}
                    count={classCounts[cls]}
                    active={selectedClass === cls}
                    color={CLASS_COLORS[cls]}
                    icon={CLASS_ICONS[cls]}
                    onClick={() => {
                      setSelectedClass(cls);
                      setClassFilterOpen(false);
                    }}
                  />
                ))}
              </div>
            )}
          </div>

          {lineupMemberSource === 'attendance' ? (
            <div className="space-y-2 rounded-xl border border-slate-800/80 bg-slate-950/45 p-2">
              <select
                value={lineupMemberSourceSessionId || ''}
                onChange={event => onSourceSessionChange(event.target.value)}
                disabled={attendanceImportLoading && attendanceSessions.length === 0}
                className="w-full rounded-lg border border-slate-700/80 bg-slate-800/70 px-3 py-2 text-xs font-bold text-slate-200 outline-none focus:border-sky-400/70 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <option value="">Chọn phiên điểm danh</option>
                {attendanceSessions.map(session => (
                  <option key={session.id} value={session.id}>
                    {(session.headerText || 'Điểm danh Bang Chiến')} · {session.openedAt ? new Date(session.openedAt).toLocaleString('vi-VN') : '-'}
                  </option>
                ))}
              </select>
              {attendanceImportLoading ? <div className="text-[11px] font-bold text-sky-300">Đang tải điểm danh...</div> : null}
              {attendanceImportError ? <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-2 py-1.5 text-[11px] text-red-200">{attendanceImportError}</div> : null}
            </div>
          ) : null}
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain bg-slate-950/10 p-3 flex flex-col gap-1.5 custom-scrollbar">
        {filteredMembers.length === 0 ? (
          <div className="flex min-h-48 flex-col items-center justify-center rounded-2xl border border-dashed border-slate-700/80 bg-slate-900/25 p-8 text-center text-slate-500">
            <Filter size={36} className="mb-2 opacity-60" />
            <p className="text-sm font-bold">Không tìm thấy thành viên phù hợp</p>
            <p className="mt-1 text-xs">Thử đổi bộ lọc hoặc từ khóa tìm kiếm.</p>
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
