/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { LineupSnapshotDetail, LineupSnapshotSummary } from '../../services/discordApi.ts';
import { Member, Skill } from '../../types.ts';
import { Archive, CalendarDays, Layers, RotateCcw, Shield, Trash2, Users } from 'lucide-react';
import { TeamCard } from './TeamCard.tsx';
import { getSnapshotActionContent, getSnapshotBadge, RecentSnapshotAction } from './lineupSnapshotUi.ts';

const GROUP_ACCENTS = [
  '#38BDF8', '#F59E0B', '#34D399', '#FB7185', '#A78BFA',
  '#22D3EE', '#F472B6', '#FBBF24', '#4ADE80', '#60A5FA',
];

interface SavedLineupsViewProps {
  snapshots: LineupSnapshotSummary[];
  selectedSnapshotId: string | null;
  pendingSnapshotId?: string | null;
  selectedSnapshot: LineupSnapshotDetail | null;
  loading: boolean;
  detailLoading: boolean;
  actionLoading: boolean;
  canRestoreSnapshot: boolean;
  canDeleteSnapshot: boolean;
  recentSnapshotAction?: RecentSnapshotAction | null;
  skills: Skill[];
  getMemberById: (id: string) => Member | null;
  onSelectSnapshot: (snapshotId: string) => void;
  onRestoreSnapshot: (snapshotId: string) => void;
  onDeleteSnapshot: (snapshotId: string) => void;
  variant?: 'modal' | 'page';
}

function formatDate(value: string) {
  return new Date(value).toLocaleString('vi-VN');
}

function SnapshotListSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 4 }).map((_, index) => (
        <div key={index} className="rounded-2xl border border-slate-800/80 bg-slate-900/35 p-4">
          <div className="h-4 w-2/3 rounded-full bg-slate-800" />
          <div className="mt-3 h-3 w-1/2 rounded-full bg-slate-800/80" />
          <div className="mt-4 flex gap-2">
            <div className="h-6 w-16 rounded-full bg-slate-800/70" />
            <div className="h-6 w-20 rounded-full bg-slate-800/70" />
          </div>
        </div>
      ))}
    </div>
  );
}

export const SavedLineupsView: React.FC<SavedLineupsViewProps> = ({
  snapshots,
  selectedSnapshotId,
  pendingSnapshotId,
  selectedSnapshot,
  loading,
  detailLoading,
  actionLoading,
  canRestoreSnapshot,
  canDeleteSnapshot,
  recentSnapshotAction,
  skills,
  getMemberById,
  onSelectSnapshot,
  onRestoreSnapshot,
  onDeleteSnapshot,
  variant = 'modal',
}) => {
  const newestSnapshotId = React.useMemo(() => {
    let newestSnapshot: LineupSnapshotSummary | null = null;
    snapshots.forEach(snapshot => {
      if (!newestSnapshot || new Date(snapshot.updatedAt).getTime() > new Date(newestSnapshot.updatedAt).getTime()) {
        newestSnapshot = snapshot;
      }
    });
    return newestSnapshot?.id ?? null;
  }, [snapshots]);

  const selectedStats = React.useMemo(() => {
    if (!selectedSnapshot) return null;
    const teams = selectedSnapshot.groups.flatMap(group => group.teams);
    return {
      groupCount: selectedSnapshot.groups.length,
      teamCount: teams.length,
      mainCount: teams.reduce((sum, team) => sum + team.memberIds.filter(Boolean).length, 0),
      reserveCount: teams.reduce((sum, team) => sum + team.reserveMemberIds.filter(Boolean).length, 0),
    };
  }, [selectedSnapshot]);

  const recentAction = getSnapshotActionContent(recentSnapshotAction, selectedSnapshotId);
  const containerClass = variant === 'modal'
    ? 'h-full rounded-[28px] border-0'
    : 'h-full rounded-2xl border border-slate-800/90 shadow-2xl shadow-slate-950/25';
  const teamGridClass = variant === 'modal'
    ? 'grid grid-cols-1 gap-4 xl:grid-cols-2 2xl:grid-cols-3'
    : 'grid grid-cols-1 gap-4 xl:grid-cols-3 2xl:grid-cols-4';

  return (
    <div className={`flex min-h-0 w-full overflow-hidden bg-gradient-to-br from-slate-900/95 via-slate-950/95 to-slate-900/90 ${containerClass} flex-col lg:flex-row`}>
      <aside className="flex max-h-[360px] shrink-0 flex-col border-b border-slate-800/80 bg-slate-950/45 lg:h-full lg:max-h-none lg:w-[390px] lg:border-b-0 lg:border-r">
        <div className="min-h-[116px] border-b border-slate-800/80 bg-gradient-to-br from-slate-900/90 to-slate-950/70 px-5 py-5">
          <div className="flex items-start justify-between gap-4">
            <div className="flex min-w-0 gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-sky-400/25 bg-sky-500/10 text-sky-200 shadow-lg shadow-sky-950/20">
                <Archive size={19} />
              </div>
              <div className="min-w-0">
                <h2 className="text-sm font-black uppercase tracking-[0.22em] text-white">Đội hình đã lưu</h2>
                <p className="mt-1 text-xs leading-5 text-slate-400">Chọn bản lưu để xem trước hoặc khôi phục.</p>
              </div>
            </div>
            <span className="shrink-0 rounded-full border border-slate-700/80 bg-slate-900/80 px-3 py-1 text-[10px] font-black uppercase tracking-wider text-slate-300">
              {snapshots.length} bản lưu
            </span>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-3 custom-scrollbar">
          {loading ? (
            <SnapshotListSkeleton />
          ) : snapshots.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-700 bg-slate-900/35 px-5 py-10 text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl border border-slate-700 bg-slate-950/60 text-slate-400">
                <Archive size={20} />
              </div>
              <p className="mt-4 text-sm font-bold text-slate-200">Chưa có đội hình nào được lưu</p>
              <p className="mt-2 text-xs leading-5 text-slate-500">Hãy lưu đội hình hiện tại để xem lại tại đây.</p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {snapshots.map(snapshot => {
                const selected = snapshot.id === selectedSnapshotId;
                const pending = snapshot.id === pendingSnapshotId;
                const badge = getSnapshotBadge(recentSnapshotAction, snapshot.id, snapshot.id === newestSnapshotId);
                return (
                  <button
                    key={snapshot.id}
                    type="button"
                    aria-pressed={selected}
                    onClick={() => onSelectSnapshot(snapshot.id)}
                    className={`group relative w-full overflow-hidden rounded-2xl border p-4 text-left transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400/60 ${selected
                      ? 'border-sky-400/55 bg-sky-500/10 shadow-lg shadow-sky-950/20'
                      : pending
                        ? 'border-amber-400/45 bg-amber-500/10'
                        : 'border-slate-800/85 bg-slate-900/35 hover:border-slate-600/90 hover:bg-slate-800/55'
                    }`}
                  >
                    {selected && <span className="absolute inset-y-3 left-0 w-1 rounded-r-full bg-sky-300" />}
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 pl-1">
                        <div className="flex min-w-0 items-center gap-2">
                          <p className="truncate text-sm font-black text-white">{snapshot.name}</p>
                          {badge && (
                            <span className={`shrink-0 rounded-full border px-2 py-0.5 text-[9px] font-black uppercase tracking-wider ${badge.className}`}>
                              {badge.label}
                            </span>
                          )}
                        </div>
                        <p className="mt-1.5 text-[11px] text-slate-400">Cập nhật {formatDate(snapshot.updatedAt)}</p>
                      </div>
                      <span className={`shrink-0 rounded-full border px-2.5 py-1 text-[10px] font-black uppercase tracking-wider ${pending ? 'border-amber-500/30 bg-amber-500/10 text-amber-300' : 'border-slate-700 bg-slate-800/80 text-slate-300'}`}>
                        {pending ? 'Đang tải' : `${snapshot.teamCount} đội`}
                      </span>
                    </div>
                    <div className="mt-3 grid grid-cols-2 gap-2 pl-1 text-[11px] text-slate-500">
                      <span className="inline-flex items-center gap-1.5 rounded-lg border border-slate-800/80 bg-slate-950/35 px-2 py-1">
                        <Users size={12} />
                        {snapshot.groupCount} đoàn
                      </span>
                      <span className="inline-flex min-w-0 items-center gap-1.5 rounded-lg border border-slate-800/80 bg-slate-950/35 px-2 py-1">
                        <CalendarDays size={12} />
                        <span className="truncate">{formatDate(snapshot.createdAt)}</span>
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </aside>

      <section className="flex min-h-0 min-w-0 flex-1 flex-col">
        <header className="min-h-[116px] border-b border-slate-800/80 bg-slate-950/35 px-5 py-5 pr-20 lg:px-6 lg:pr-20 xl:pr-24">
          <div className="flex flex-col gap-4 2xl:flex-row 2xl:items-start 2xl:justify-between">
            <div className="min-w-0">
              <div className="flex min-w-0 flex-wrap items-center gap-2">
                <h3 className="truncate text-xl font-black text-white">
                  {selectedSnapshot?.name || 'Chi tiết đội hình'}
                </h3>
                {recentAction && (
                  <span className={`shrink-0 rounded-full border px-2.5 py-1 text-[9px] font-black uppercase tracking-wider ${recentAction.chip.className}`}>
                    {recentAction.chip.text}
                  </span>
                )}
                {detailLoading && (
                  <span className="shrink-0 rounded-full border border-sky-500/25 bg-sky-500/10 px-2.5 py-1 text-[9px] font-black uppercase tracking-wider text-sky-200">
                    Đang tải chi tiết
                  </span>
                )}
              </div>
              {selectedSnapshot ? (
                <p className="mt-2 text-xs text-slate-400">
                  Tạo lúc {formatDate(selectedSnapshot.createdAt)} · Cập nhật {formatDate(selectedSnapshot.updatedAt)}
                </p>
              ) : (
                <p className="mt-2 text-xs text-slate-400">Chọn một bản lưu để xem bố cục đội hình.</p>
              )}
            </div>

            {selectedSnapshot && (canRestoreSnapshot || canDeleteSnapshot) && (
              <div className="flex shrink-0 flex-wrap items-center gap-2 rounded-2xl border border-slate-800/80 bg-slate-950/45 p-1.5 shadow-xl shadow-slate-950/20">
                {canRestoreSnapshot && (
                  <button
                    type="button"
                    onClick={() => onRestoreSnapshot(selectedSnapshot.id)}
                    disabled={actionLoading}
                    className="group inline-flex items-center gap-2 rounded-xl border border-emerald-400/35 bg-gradient-to-r from-emerald-500/25 to-teal-500/15 px-4 py-2.5 text-xs font-black uppercase tracking-wider text-emerald-100 shadow-lg shadow-emerald-950/20 transition-all hover:border-emerald-300/60 hover:from-emerald-400/35 hover:to-teal-400/25 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-400/15 text-emerald-200 transition-colors group-hover:bg-emerald-300/25 group-hover:text-white">
                      <RotateCcw size={14} />
                    </span>
                    Khôi phục
                  </button>
                )}
                {canDeleteSnapshot && (
                  <button
                    type="button"
                    onClick={() => onDeleteSnapshot(selectedSnapshot.id)}
                    disabled={actionLoading}
                    className="group inline-flex items-center gap-2 rounded-xl border border-rose-400/30 bg-slate-950/50 px-4 py-2.5 text-xs font-black uppercase tracking-wider text-rose-200 shadow-lg shadow-rose-950/10 transition-all hover:border-rose-300/55 hover:bg-rose-500/15 hover:text-rose-100 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-rose-500/12 text-rose-300 transition-colors group-hover:bg-rose-400/20 group-hover:text-rose-100">
                      <Trash2 size={14} />
                    </span>
                    Xóa
                  </button>
                )}
              </div>
            )}
          </div>

          {selectedStats && (
            <div className="mt-5 grid grid-cols-2 gap-3 xl:grid-cols-4">
              {[
                { label: 'Đoàn', value: selectedStats.groupCount, icon: Users },
                { label: 'Đội', value: selectedStats.teamCount, icon: Layers },
                { label: 'Chính', value: selectedStats.mainCount, icon: Shield },
                { label: 'Dự bị', value: selectedStats.reserveCount, icon: Archive },
              ].map(item => (
                <div key={item.label} className="rounded-2xl border border-slate-800/80 bg-slate-900/45 px-4 py-3 shadow-lg shadow-slate-950/10">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">{item.label}</span>
                    <item.icon size={14} className="text-slate-500" />
                  </div>
                  <p className="mt-1 text-2xl font-black text-slate-100">{item.value}</p>
                </div>
              ))}
            </div>
          )}
        </header>

        <div className="relative flex-1 overflow-y-auto p-4 custom-scrollbar lg:p-6">
          {!selectedSnapshot ? (
            <div className="flex min-h-full items-center justify-center">
              <div className="max-w-md rounded-3xl border border-dashed border-slate-700 bg-slate-900/30 px-6 py-10 text-center shadow-2xl shadow-slate-950/20">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-slate-700 bg-slate-950/60 text-slate-400">
                  <Layers size={24} />
                </div>
                <p className="mt-4 text-sm font-bold text-slate-200">Chọn một đội hình đã lưu</p>
                <p className="mt-2 text-xs leading-5 text-slate-500">Danh sách bên trái chứa các bản lưu gần đây để bạn xem trước nội dung.</p>
              </div>
            </div>
          ) : (
            <div key={selectedSnapshot.id} className="space-y-5 pb-4 animate-in fade-in duration-200">
              {recentAction && (
                <div className="rounded-2xl border px-4 py-3 shadow-lg shadow-slate-950/10" style={recentAction.panel.style}>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`rounded-full border px-2.5 py-1 text-[9px] font-black uppercase tracking-wider ${recentAction.chip.className}`}>
                      {recentAction.chip.text}
                    </span>
                    <p className="text-sm font-bold text-white">{recentAction.panel.title}</p>
                  </div>
                  <p className="mt-1 text-xs text-slate-300">{recentAction.panel.description}</p>
                </div>
              )}

              {selectedSnapshot.groups.map((group, groupIndex) => {
                const accent = GROUP_ACCENTS[groupIndex % GROUP_ACCENTS.length];
                const leader = group.leaderMemberId ? getMemberById(group.leaderMemberId) : null;

                return (
                  <section
                    key={group.id}
                    className="rounded-3xl border border-slate-800/80 bg-slate-900/30 p-4 shadow-xl shadow-slate-950/15"
                    style={{ boxShadow: `inset 3px 0 0 ${accent}99` }}
                  >
                    <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span
                            className="rounded-full border px-2.5 py-1 text-[10px] font-black uppercase tracking-wider"
                            style={{ borderColor: `${accent}55`, color: accent, backgroundColor: `${accent}14` }}
                          >
                            Đoàn {groupIndex + 1}
                          </span>
                          <span className="rounded-full border border-slate-700/80 bg-slate-950/50 px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-slate-400">
                            {group.teams.length} đội
                          </span>
                        </div>
                        <h2 className="mt-2 truncate text-xl font-black uppercase tracking-widest text-slate-100">
                          {group.name}
                        </h2>
                      </div>

                      <div className="flex min-w-0 items-center gap-2 rounded-2xl border border-slate-800/80 bg-slate-950/40 px-3 py-2">
                        <span
                          className="rounded-full border px-2 py-1 text-[10px] font-black uppercase tracking-wider"
                          style={{ borderColor: `${accent}55`, color: accent, backgroundColor: `${accent}14` }}
                        >
                          Leader
                        </span>
                        <span className="truncate text-xs font-bold text-slate-200">
                          {leader ? leader.name : 'Chưa chọn leader'}
                        </span>
                      </div>
                    </div>

                    <div className={teamGridClass}>
                      {group.teams.map((team, teamIndex) => (
                        <TeamCard
                          key={team.id}
                          team={team}
                          index={groupIndex * 10 + teamIndex}
                          accent={accent}
                          skills={skills}
                          getMemberById={getMemberById}
                          onRemoveSkillFromMember={() => {}}
                          readOnly
                          hideSkills
                        />
                      ))}
                    </div>
                  </section>
                );
              })}
            </div>
          )}
        </div>
      </section>
    </div>
  );
};
