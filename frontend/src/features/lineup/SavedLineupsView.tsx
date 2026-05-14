/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { LineupSnapshotDetail, LineupSnapshotSummary } from '../../services/discordApi.ts';
import { Member, Skill } from '../../types.ts';
import { CalendarDays, Maximize2, Minimize2, RotateCcw, Trash2, Users } from 'lucide-react';
import { TeamCard } from './TeamCard.tsx';
import { getSnapshotActionContent, getSnapshotBadge, RecentSnapshotAction } from './lineupSnapshotUi.ts';

const GROUP_ACCENTS = [
  '#38BDF8', '#F59E0B', '#34D399', '#FB7185', '#A78BFA',
  '#22D3EE', '#F472B6', '#FBBF24', '#4ADE80', '#60A5FA',
];

interface SavedLineupsViewProps {
  snapshots: LineupSnapshotSummary[];
  selectedSnapshotId: string | null;
  selectedSnapshot: LineupSnapshotDetail | null;
  loading: boolean;
  detailLoading: boolean;
  actionLoading: boolean;
  canRestoreSnapshot: boolean;
  canDeleteSnapshot: boolean;
  recentSnapshotAction?: RecentSnapshotAction | null;
  skills: Skill[];
  getMemberById: (id: string) => Member | null;
  isZoomed?: boolean;
  onZoomToggle?: () => void;
  onSelectSnapshot: (snapshotId: string) => void;
  onRestoreSnapshot: (snapshotId: string) => void;
  onDeleteSnapshot: (snapshotId: string) => void;
}

function formatDate(value: string) {
  return new Date(value).toLocaleString('vi-VN');
}

export const SavedLineupsView: React.FC<SavedLineupsViewProps> = ({
  snapshots,
  selectedSnapshotId,
  selectedSnapshot,
  loading,
  detailLoading,
  actionLoading,
  canRestoreSnapshot,
  canDeleteSnapshot,
  recentSnapshotAction,
  skills,
  getMemberById,
  isZoomed = false,
  onZoomToggle,
  onSelectSnapshot,
  onRestoreSnapshot,
  onDeleteSnapshot,
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

  return (
    <div className="flex h-full min-h-0 w-full overflow-hidden rounded-2xl border border-slate-800 bg-[#0F172A] shadow-2xl">
      {!isZoomed && (
      <div className="flex w-[360px] shrink-0 flex-col border-r border-slate-800 bg-slate-900/40">
        <div className="border-b border-slate-800 px-5 py-4">
          <h2 className="text-sm font-bold uppercase tracking-[0.2em] text-white">Đội hình đã lưu</h2>
          <p className="mt-1 text-xs text-slate-400">Chọn bản lưu để xem chi tiết.</p>
        </div>

        <div className="flex-1 overflow-y-auto p-3 custom-scrollbar">
          {loading ? (
            <div className="rounded-xl border border-slate-800 bg-slate-900/40 px-4 py-6 text-center text-sm text-slate-400">
              Đang tải danh sách đội hình...
            </div>
          ) : snapshots.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-700 bg-slate-900/30 px-4 py-8 text-center text-sm text-slate-500">
              Chưa có đội hình nào được lưu.
            </div>
          ) : (
            <div className="space-y-2">
              {snapshots.map(snapshot => {
                const selected = snapshot.id === selectedSnapshotId;
                const badge = getSnapshotBadge(recentSnapshotAction, snapshot.id, snapshot.id === newestSnapshotId);
                return (
                  <button
                    key={snapshot.id}
                    onClick={() => onSelectSnapshot(snapshot.id)}
                    className={`w-full rounded-xl border p-3 text-left transition-colors ${selected
                      ? 'border-sky-500/50 bg-sky-500/10'
                      : 'border-slate-800 bg-slate-900/35 hover:border-slate-700 hover:bg-slate-800/60'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 min-w-0">
                          <p className="truncate text-sm font-bold text-white">{snapshot.name}</p>
                          {badge && (
                            <span className={`shrink-0 rounded-full border px-2 py-0.5 text-[9px] font-black uppercase tracking-wider ${badge.className}`}>
                              {badge.label}
                            </span>
                          )}
                        </div>
                        <p className="mt-1 text-[11px] text-slate-400">Cập nhật: {formatDate(snapshot.updatedAt)}</p>
                      </div>
                      <span className="rounded-full border border-slate-700 bg-slate-800/80 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-300">
                        {snapshot.teamCount} đội
                      </span>
                    </div>
                    <div className="mt-2 flex items-center gap-3 text-[11px] text-slate-500">
                      <span className="inline-flex items-center gap-1">
                        <Users size={12} />
                        {snapshot.groupCount} đoàn
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <CalendarDays size={12} />
                        {formatDate(snapshot.createdAt)}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex items-center justify-between border-b border-slate-800 px-5 py-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2 min-w-0">
              <h3 className="truncate text-base font-bold text-white">
                {selectedSnapshot?.name || 'Chi tiết đội hình'}
              </h3>
              {(() => {
                const recentAction = getSnapshotActionContent(recentSnapshotAction, selectedSnapshotId);
                return recentAction ? (
                  <span className={`shrink-0 rounded-full border px-2 py-0.5 text-[9px] font-black uppercase tracking-wider ${recentAction.chip.className}`}>
                    {recentAction.chip.text}
                  </span>
                ) : null;
              })()}
            </div>
            {selectedSnapshot && (
              <p className="mt-1 text-xs text-slate-400">
                Tạo lúc {formatDate(selectedSnapshot.createdAt)} · Cập nhật {formatDate(selectedSnapshot.updatedAt)}
              </p>
            )}
          </div>
          {selectedSnapshot && (onZoomToggle || canRestoreSnapshot || canDeleteSnapshot) && (
            <div className="flex items-center gap-2">
              {onZoomToggle && (
                <button
                  onClick={onZoomToggle}
                  className="inline-flex items-center gap-2 rounded-lg border border-sky-500/30 bg-sky-500/10 px-3 py-2 text-xs font-bold text-sky-300 transition-colors hover:bg-sky-500/20"
                  title={isZoomed ? 'Thu nhỏ' : 'Phóng to'}
                >
                  {isZoomed ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
                  {isZoomed ? 'Thu nhỏ' : 'Phóng to'}
                </button>
              )}
              {canRestoreSnapshot && (
                <button
                  onClick={() => onRestoreSnapshot(selectedSnapshot.id)}
                  disabled={actionLoading}
                  className="inline-flex items-center gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-xs font-bold text-emerald-300 transition-colors hover:bg-emerald-500/20 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <RotateCcw size={14} />
                  Khôi phục
                </button>
              )}
              {canDeleteSnapshot && (
                <button
                  onClick={() => onDeleteSnapshot(selectedSnapshot.id)}
                  disabled={actionLoading}
                  className="inline-flex items-center gap-2 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs font-bold text-red-300 transition-colors hover:bg-red-500/20 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <Trash2 size={14} />
                  Xóa
                </button>
              )}
            </div>
          )}
        </div>

        <div className="flex-1 overflow-y-auto p-5 custom-scrollbar">
          {detailLoading ? (
            <div className="rounded-xl border border-slate-800 bg-slate-900/35 px-4 py-8 text-center text-sm text-slate-400">
              Đang tải chi tiết đội hình...
            </div>
          ) : !selectedSnapshot ? (
            <div className="rounded-xl border border-dashed border-slate-700 bg-slate-900/25 px-4 py-8 text-center text-sm text-slate-500">
              Chọn một đội hình đã lưu ở bên trái để xem trước.
            </div>
          ) : (
            <div className="space-y-6 pb-4">
              {(() => {
                const recentAction = getSnapshotActionContent(recentSnapshotAction, selectedSnapshotId);
                return recentAction ? (
                  <div className="rounded-xl border px-4 py-3" style={recentAction.panel.style}>
                    <div className="flex items-center gap-2">
                      <span className={`rounded-full border px-2 py-0.5 text-[9px] font-black uppercase tracking-wider ${recentAction.chip.className}`}>
                        {recentAction.chip.text}
                      </span>
                      <p className="text-sm font-semibold text-white">{recentAction.panel.title}</p>
                    </div>
                    <p className="mt-1 text-xs text-slate-300">{recentAction.panel.description}</p>
                  </div>
                ) : null;
              })()}
              {selectedSnapshot.groups.map((group, groupIndex) => {
                const accent = GROUP_ACCENTS[groupIndex % GROUP_ACCENTS.length];
                const leader = group.leaderMemberId ? getMemberById(group.leaderMemberId) : null;

                return (
                  <section key={group.id} className="space-y-3">
                    <div className="rounded-xl border border-slate-800/70 bg-slate-900/35 px-3 py-2.5">
                      <div className="flex flex-col gap-2 xl:flex-row xl:items-center xl:justify-between">
                        <div className="flex items-center gap-2 min-w-0">
                          <span
                            className="rounded-full border px-2 py-1 text-[10px] font-black uppercase tracking-wider"
                            style={{ borderColor: `${accent}55`, color: accent, backgroundColor: `${accent}14` }}
                          >
                            Leader đoàn
                          </span>
                          <span className="truncate text-xs font-semibold text-slate-200">
                            {leader ? leader.name : 'Chưa chọn leader'}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between px-1">
                      <h2 className="text-lg font-extrabold uppercase tracking-widest text-[#E2E8F0]">
                        {group.name}
                      </h2>
                      <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                        {group.teams.length} đội
                      </span>
                    </div>

                    <div className="grid grid-cols-1 xl:grid-cols-3 2xl:grid-cols-5 gap-4">
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
                        />
                      ))}
                    </div>
                  </section>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
