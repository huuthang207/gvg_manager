/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useMemo, useState } from 'react';
import { Plus, Minus, Users } from 'lucide-react';
import { SquadGroup } from '../../types.ts';

interface SquadSetupScreenProps {
  onCreate: (groups: SquadGroup[]) => void;
}

interface DraftGroup {
  name: string;
  teamNames: string[];
}

const MAX_TEAMS_PER_GROUP = 5;
const MAX_TOTAL_TEAMS = 10;

export const SquadSetupScreen: React.FC<SquadSetupScreenProps> = ({ onCreate }) => {
  const [groupCount, setGroupCount] = useState(3);
  const [groups, setGroups] = useState<DraftGroup[]>([
    { name: 'Đoàn 1', teamNames: ['Đội 1'] },
    { name: 'Đoàn 2', teamNames: ['Đội 1'] },
    { name: 'Đoàn 3', teamNames: ['Đội 1'] },
  ]);
  const [error, setError] = useState('');

  const totalTeams = useMemo(() => groups.reduce((sum, group) => sum + group.teamNames.length, 0), [groups]);

  useEffect(() => {
    setGroups(prev => Array.from({ length: groupCount }, (_, index) => prev[index] ?? {
      name: `Đoàn ${index + 1}`,
      teamNames: ['Đội 1'],
    }));
  }, [groupCount]);

  const updateGroupCount = (nextCount: number) => {
    setGroupCount(Math.min(MAX_TOTAL_TEAMS, Math.max(1, nextCount)));
    setError('');
  };

  const updateTeamCount = (groupIndex: number, nextCount: number) => {
    setGroups(prev => {
      const currentTotal = prev.reduce((sum, group, index) => sum + (index === groupIndex ? 0 : group.teamNames.length), 0);
      const cappedCount = Math.min(MAX_TEAMS_PER_GROUP, MAX_TOTAL_TEAMS - currentTotal, Math.max(1, nextCount));
      return prev.map((group, index) => {
        if (index !== groupIndex) return group;
        return {
          ...group,
          teamNames: Array.from({ length: cappedCount }, (_, teamIndex) => group.teamNames[teamIndex] ?? `Đội ${teamIndex + 1}`),
        };
      });
    });
    setError('');
  };

  const updateGroupName = (groupIndex: number, name: string) => {
    setGroups(prev => prev.map((group, index) => index === groupIndex ? { ...group, name } : group));
    setError('');
  };

  const updateTeamName = (groupIndex: number, teamIndex: number, name: string) => {
    setGroups(prev => prev.map((group, index) => {
      if (index !== groupIndex) return group;
      const teamNames = [...group.teamNames];
      teamNames[teamIndex] = name;
      return { ...group, teamNames };
    }));
    setError('');
  };

  const handleCreate = () => {
    if (totalTeams < 1 || totalTeams > MAX_TOTAL_TEAMS) {
      setError(`Tổng số đội phải từ 1 đến ${MAX_TOTAL_TEAMS}.`);
      return;
    }
    if (groups.some(group => group.teamNames.length > MAX_TEAMS_PER_GROUP)) {
      setError(`Mỗi đoàn chỉ được tối đa ${MAX_TEAMS_PER_GROUP} đội.`);
      return;
    }
    if (groups.some(group => !group.name.trim())) {
      setError('Tên đoàn không được để trống.');
      return;
    }
    if (groups.some(group => group.teamNames.length === 0 || group.teamNames.some(name => !name.trim()))) {
      setError('Tên đội không được để trống.');
      return;
    }

    const timestamp = Date.now();
    onCreate(groups.map((group, groupIndex) => ({
      id: `group-${timestamp}-${groupIndex}`,
      name: group.name.trim(),
      teams: group.teamNames.map((teamName, teamIndex) => ({
        id: `team-${timestamp}-${groupIndex}-${teamIndex}`,
        name: teamName.trim(),
        memberIds: Array(6).fill(''),
      })),
    })));
  };

  return (
    <div className="flex-1 h-full overflow-y-auto bg-[#0F172A] p-4 custom-scrollbar md:p-5">
      <div className="mx-auto max-w-6xl rounded-2xl border border-slate-800 bg-slate-900/60 shadow-2xl overflow-hidden">
        <div className="border-b border-slate-800 px-5 py-4">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-blue-500/25 bg-blue-500/10">
              <Users size={18} className="text-blue-300" />
            </div>
            <div className="min-w-0">
              <h2 className="text-base font-black uppercase tracking-[0.18em] text-white">Khởi tạo đội hình</h2>
              <p className="mt-1 text-[11px] text-slate-500">Thiết lập đoàn và đội trước khi bắt đầu sắp xếp. Tối đa {MAX_TEAMS_PER_GROUP} đội mỗi đoàn, {MAX_TOTAL_TEAMS} đội toàn đội hình.</p>
            </div>
          </div>
        </div>

        <div className="space-y-4 p-4 md:p-5">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-[minmax(0,1fr)_220px]">
            <div className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-950/35 px-4 py-3">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Số lượng đoàn</p>
                <p className="mt-1 text-[11px] text-slate-500">Từ 1 đến 10 đoàn</p>
              </div>
              <Counter value={groupCount} min={1} max={10} onChange={updateGroupCount} />
            </div>

            <div className="flex items-center justify-between rounded-xl border border-blue-500/20 bg-blue-500/10 px-4 py-3">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-blue-200">Tổng số đội</p>
                <p className="mt-1 text-[11px] text-blue-300/70">Giới hạn toàn đội hình</p>
              </div>
              <span className="text-2xl font-black text-blue-200">{totalTeams}/10</span>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 xl:grid-cols-3">
            {groups.map((group, groupIndex) => {
              const otherTeamTotal = totalTeams - group.teamNames.length;
              return (
                <section key={groupIndex} className="space-y-3 rounded-xl border border-slate-800 bg-slate-950/25 p-3.5">
                  <div className="flex items-center justify-between gap-3 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    <span>Đoàn {groupIndex + 1}</span>
                    <span className="rounded-full bg-slate-800 px-2 py-1 text-[10px] text-slate-300">{group.teamNames.length} đội</span>
                  </div>

                  <div className="grid grid-cols-1 gap-3">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Tên đoàn</label>
                      <input
                        value={group.name}
                        onChange={event => updateGroupName(groupIndex, event.target.value)}
                        className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-blue-500"
                        placeholder={`Đoàn ${groupIndex + 1}`}
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500">Số đội</label>
                      <Counter
                        value={group.teamNames.length}
                        min={1}
                        max={Math.max(1, Math.min(MAX_TEAMS_PER_GROUP, MAX_TOTAL_TEAMS - otherTeamTotal))}
                        onChange={value => updateTeamCount(groupIndex, value)}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    {group.teamNames.map((teamName, teamIndex) => (
                      <div key={teamIndex} className="space-y-1.5">
                        <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Đội {teamIndex + 1}</label>
                        <input
                          value={teamName}
                          onChange={event => updateTeamName(groupIndex, teamIndex, event.target.value)}
                          className="w-full rounded-lg border border-slate-700 bg-slate-800/70 px-3 py-2 text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-blue-500"
                          placeholder={`Đội ${teamIndex + 1}`}
                        />
                      </div>
                    ))}
                  </div>
                </section>
              );
            })}
          </div>

          {error && (
            <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-[11px] text-red-300">
              {error}
            </div>
          )}

          <div className="flex justify-end">
            <button
              onClick={handleCreate}
              className="rounded-xl bg-blue-500 px-4 py-2.5 text-[11px] font-black uppercase tracking-[0.18em] text-white shadow-lg shadow-blue-500/20 transition-colors hover:bg-blue-400"
            >
              Tạo đội hình
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

interface CounterProps {
  value: number;
  min: number;
  max: number;
  onChange: (value: number) => void;
}

const Counter: React.FC<CounterProps> = ({ value, min, max, onChange }) => (
  <div className="flex items-center gap-2">
    <button
      onClick={() => onChange(value - 1)}
      disabled={value <= min}
      className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700 disabled:opacity-40"
    >
      <Minus size={14} />
    </button>
    <span className="w-8 text-center text-lg font-black text-white">{value}</span>
    <button
      onClick={() => onChange(value + 1)}
      disabled={value >= max}
      className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700 disabled:opacity-40"
    >
      <Plus size={14} />
    </button>
  </div>
);
