/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { toBlob } from 'html-to-image';
import { Member, Skill, SquadGroup } from '../../types.ts';
import { LineupSnapshotActions, LineupSnapshotState } from '../../hooks/useLineupSnapshots.ts';
import { CLASSES, CLASS_COLORS, CLASS_ICONS } from '../../constants.ts';
import { TeamCard } from './TeamCard.tsx';
import { Archive, BarChart3, ImageDown, RotateCcw, Save } from 'lucide-react';
import { SnapshotSaveModal } from './SnapshotSaveModal.tsx';
import { useSystemDialog } from '../app/SystemDialogProvider.tsx';
import { getErrorMessage } from '../../lib/error.ts';

const GROUP_ACCENTS = [
  '#38BDF8', '#F59E0B', '#34D399', '#FB7185', '#A78BFA',
  '#22D3EE', '#F472B6', '#FBBF24', '#4ADE80', '#60A5FA',
];

interface MainBoardProps {
  squadGroups: SquadGroup[];
  skills: Skill[];
  getMemberById: (id: string) => Member | null;
  onRemoveSkillFromMember: (memberId: string, skillId: string) => void;
  onStartNewLineup: () => void;
  onRearrangeMembers: () => void;
  lineupResetActionPending?: boolean;
  onSquadGroupLeaderChange: (groupId: string, leaderMemberId: string | null) => void;
  readOnly: boolean;
  canManageLineup: boolean;
  canManageSnapshots: boolean;
  snapshotState: LineupSnapshotState;
  snapshotActions: Pick<LineupSnapshotActions, 'openSnapshots' | 'closeSnapshots' | 'selectSnapshot' | 'saveSnapshot' | 'restoreSnapshot' | 'removeSnapshot' | 'refreshSnapshots'>;
}

export const MainBoard: React.FC<MainBoardProps> = ({
  squadGroups,
  skills,
  getMemberById,
  onRemoveSkillFromMember,
  onStartNewLineup,
  onRearrangeMembers,
  lineupResetActionPending = false,
  onSquadGroupLeaderChange,
  readOnly,
  canManageLineup,
  canManageSnapshots,
  snapshotState,
  snapshotActions,
}) => {
  const {
    snapshots,
  } = snapshotState;
  const {
    openSnapshots,
    saveSnapshot,
    refreshSnapshots,
  } = snapshotActions;

  const { alert } = useSystemDialog();
  const lineupBoardRef = React.useRef<HTMLDivElement | null>(null);
  const [snapshotName, setSnapshotName] = React.useState('');
  const [saveMode, setSaveMode] = React.useState<'create' | 'overwrite'>('create');
  const [overwriteSnapshotId, setOverwriteSnapshotId] = React.useState<string>('');
  const [isSaveModalOpen, setIsSaveModalOpen] = React.useState(false);
  const [savingSnapshot, setSavingSnapshot] = React.useState(false);
  const [exportingLineupImage, setExportingLineupImage] = React.useState(false);

  const classStats = React.useMemo(() => {
    const stats: Record<string, number> = {};
    CLASSES.forEach(c => {
      stats[c] = 0;
    });

    squadGroups.forEach(group => {
      group.teams.forEach(team => {
        team.memberIds.forEach(id => {
          if (!id) return;
          const member = getMemberById(id);
          if (member) stats[member.classType]++;
        });
      });
    });

    return stats;
  }, [squadGroups, getMemberById]);

  const totalAssigned = (Object.values(classStats) as number[]).reduce((a, b) => a + b, 0);
  const totalTeams = squadGroups.reduce((sum, group) => sum + group.teams.length, 0);

  const handleOpenSaveModal = async () => {
    setSaveMode('create');
    setOverwriteSnapshotId('');
    setSnapshotName('');
    try {
      await refreshSnapshots();
    } catch (err) {
      void alert({ message: getErrorMessage(err, 'Không thể tải đội hình đã lưu'), variant: 'error' });
    } finally {
      setIsSaveModalOpen(true);
    }
  };

  const handleSaveSnapshot = async () => {
    const name = snapshotName.trim();
    if (!name) {
      void alert({ message: 'Vui lòng nhập tên đội hình.', variant: 'warning' });
      return;
    }
    if (saveMode === 'overwrite' && !overwriteSnapshotId) {
      void alert({ message: 'Vui lòng chọn đội hình cũ để ghi đè.', variant: 'warning' });
      return;
    }

    setSavingSnapshot(true);
    try {
      await saveSnapshot(saveMode, name, overwriteSnapshotId || null);
      setSnapshotName('');
      setOverwriteSnapshotId('');
      setSaveMode('create');
      setIsSaveModalOpen(false);
    } catch {
      return;
    } finally {
      setSavingSnapshot(false);
    }
  };

  const handleShareLineupImage = async () => {
    if (!lineupBoardRef.current || exportingLineupImage) return;

    setExportingLineupImage(true);
    try {
      const blob = await toBlob(lineupBoardRef.current, {
        backgroundColor: '#020617',
        cacheBust: true,
        pixelRatio: 2,
      });

      if (!blob) {
        throw new Error('Không thể tạo ảnh đội hình.');
      }

      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'gvg-lineup.png';
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      void alert({ message: getErrorMessage(err, 'Không thể tạo ảnh đội hình'), variant: 'error' });
    } finally {
      setExportingLineupImage(false);
    }
  };

  const handleOverwriteSelectionChange = (snapshotId: string) => {
    setOverwriteSnapshotId(snapshotId);
    const snapshot = snapshots.find(item => item.id === snapshotId);
    if (snapshot) {
      setSnapshotName(snapshot.name);
    }
  };

  const closeSaveModal = () => {
    setIsSaveModalOpen(false);
    setSnapshotName('');
    setOverwriteSnapshotId('');
    setSaveMode('create');
  };

  return (
    <>
      <div className="flex-1 min-h-0 overflow-y-auto space-y-5 border-l border-slate-800/80 bg-slate-950/15 p-4 custom-scrollbar">

        {canManageLineup && (
          <div className="rounded-2xl border border-slate-800/80 bg-slate-950/35 p-3 shadow-sm shadow-slate-950/20">
            <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
              <div className="flex min-w-0 flex-wrap items-center gap-2">
                <div className="flex items-center gap-2 text-sm font-black text-slate-200">
                  <BarChart3 size={16} className="text-blue-400" />
                  <span>{squadGroups.length} đoàn · {totalTeams}/10 đội · {totalAssigned} người</span>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-1.5 xl:justify-end">
                {canManageSnapshots && !readOnly && (
                  <button
                    onClick={handleOpenSaveModal}
                    className="flex items-center gap-1.5 rounded-lg border border-emerald-400/25 bg-emerald-500/8 px-2.5 py-1.5 text-[10px] font-bold text-emerald-200 transition-colors hover:border-emerald-300/45 hover:bg-emerald-500/14"
                    title="Lưu đội hình"
                  >
                    <Save size={12} />
                    Lưu
                  </button>
                )}
                <button
                  onClick={() => void openSnapshots()}
                  className="flex items-center gap-1.5 rounded-lg border border-sky-400/25 bg-sky-500/8 px-2.5 py-1.5 text-[10px] font-bold text-sky-200 transition-colors hover:border-sky-300/45 hover:bg-sky-500/14"
                  title={`Đội hình đã lưu (${snapshots.length} bản lưu)`}
                >
                  <Archive size={12} />
                  Đã lưu
                </button>
                <button
                  onClick={() => void handleShareLineupImage()}
                  disabled={exportingLineupImage || squadGroups.length === 0}
                  className="flex items-center gap-1.5 rounded-lg border border-fuchsia-400/25 bg-fuchsia-500/8 px-2.5 py-1.5 text-[10px] font-bold text-fuchsia-200 transition-colors hover:border-fuchsia-300/45 hover:bg-fuchsia-500/14 disabled:cursor-not-allowed disabled:opacity-50"
                  title="Chia sẻ hoặc tải ảnh đội hình"
                >
                  <ImageDown size={12} />
                  {exportingLineupImage ? 'Đang chụp...' : 'Tải ảnh'}
                </button>
                {!readOnly && (
                  <>
                    <button
                      onClick={onRearrangeMembers}
                      disabled={lineupResetActionPending}
                      className="flex items-center gap-1.5 rounded-lg border border-indigo-400/25 bg-indigo-500/8 px-2.5 py-1.5 text-[10px] font-bold text-indigo-200 transition-colors hover:border-indigo-300/45 hover:bg-indigo-500/14 disabled:cursor-not-allowed disabled:opacity-50"
                      title="Sắp xếp lại thành viên"
                    >
                      <RotateCcw size={12} />
                      Xếp lại
                    </button>
                    <button
                      onClick={onStartNewLineup}
                      disabled={lineupResetActionPending}
                      className="flex items-center gap-1.5 rounded-lg border border-amber-400/25 bg-amber-500/8 px-2.5 py-1.5 text-[10px] font-bold text-amber-200 transition-colors hover:border-amber-300/45 hover:bg-amber-500/14 disabled:cursor-not-allowed disabled:opacity-50"
                      title="Tạo mới đội hình"
                    >
                      <RotateCcw size={12} />
                      Tạo mới
                    </button>
                  </>
                )}
              </div>
            </div>

            <div className="mt-2 flex flex-wrap items-center gap-1.5">
              {CLASSES.map(cls => (
                <div
                  key={cls}
                  className="flex items-center gap-1.5 rounded-lg border bg-slate-900/35 px-2 py-1"
                  style={{ borderColor: `${CLASS_COLORS[cls]}35` }}
                  title={cls}
                >
                  <img src={CLASS_ICONS[cls]} alt="" className="h-6 w-6 shrink-0 object-contain" />
                  <span
                    className="min-w-5 text-center text-xs font-black leading-5"
                    style={{ color: CLASS_COLORS[cls] }}
                  >
                    {classStats[cls]}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}


        <div ref={lineupBoardRef} className="space-y-6 rounded-2xl border border-slate-800/70 bg-slate-950 p-4 pb-6 shadow-xl shadow-slate-950/15">
          {squadGroups.map((group, groupIndex) => {
            const accent = GROUP_ACCENTS[groupIndex % GROUP_ACCENTS.length];
            const leader = group.leaderMemberId ? getMemberById(group.leaderMemberId) : null;
            const availableLeaders = Array.from(new Map<string, NonNullable<ReturnType<typeof getMemberById>>>(
              group.teams
                .flatMap(team => [...team.memberIds, ...team.reserveMemberIds])
                .filter((memberId): memberId is string => Boolean(memberId))
                .map(memberId => {
                  const member = getMemberById(memberId);
                  return member ? [member.id, member] as const : null;
                })
                .filter((entry): entry is readonly [string, NonNullable<ReturnType<typeof getMemberById>>] => Boolean(entry))
            ).values());

            return (
              <section key={group.id} className="space-y-3">
                <div
                  className="overflow-hidden rounded-2xl border border-slate-700/60 bg-slate-900/55 shadow-sm shadow-slate-950/10"
                  style={{ borderTopColor: `${accent}88` }}
                >
                  <div className="flex flex-col gap-3 bg-gradient-to-r from-slate-900/90 via-slate-900/55 to-slate-950/20 px-4 py-3 xl:flex-row xl:items-center xl:justify-between">
                    <div className="min-w-0 space-y-1.5">
                      <div className="flex min-w-0 flex-wrap items-center gap-2">
                        <span className="h-2.5 w-2.5 shrink-0 rounded-full shadow-[0_0_16px_currentColor]" style={{ color: accent, backgroundColor: accent }} />
                        <h2 className="truncate text-lg font-extrabold uppercase tracking-widest text-slate-100">
                          {group.name}
                        </h2>
                        <span className="rounded-full border border-slate-700/70 bg-slate-800/60 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                          {group.teams.length} đội
                        </span>
                      </div>
                      <div className="flex min-w-0 items-center gap-2">
                        <span className="shrink-0 rounded-full border border-amber-400/35 bg-amber-500/12 px-2 py-0.5 text-[9px] font-black uppercase tracking-wider text-amber-200">
                          Leader đoàn
                        </span>
                        <span className="truncate text-sm font-black text-amber-100 drop-shadow-[0_0_8px_rgba(245,158,11,0.18)]">
                          {leader ? leader.name : 'Chưa chọn leader'}
                        </span>
                      </div>
                    </div>

                    {!readOnly && (
                      <select
                        value={group.leaderMemberId ?? ''}
                        onChange={event => onSquadGroupLeaderChange(group.id, event.target.value || null)}
                        className="w-full rounded-lg border border-slate-700/80 bg-slate-800/70 px-3 py-2 text-xs font-bold text-slate-100 focus:border-sky-400/70 focus:outline-none xl:w-64"
                      >
                        <option value="">Chưa chọn leader</option>
                        {availableLeaders.map(member => (
                          <option key={member.id} value={member.id}>
                            {member.name}
                          </option>
                        ))}
                      </select>
                    )}
                  </div>
                </div>
                <div className="grid grid-cols-1 xl:grid-cols-3 2xl:grid-cols-5 gap-4">
                  {group.teams.map((team, teamIndex) => (
                    <TeamCard
                      key={team.id}
                      team={team}
                      accent={accent}
                      skills={skills}
                      getMemberById={getMemberById}
                      onRemoveSkillFromMember={readOnly ? () => {} : onRemoveSkillFromMember}
                      readOnly={readOnly}
                    />
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      </div>

      <SnapshotSaveModal
        open={isSaveModalOpen}
        snapshots={snapshots}
        snapshotName={snapshotName}
        saveMode={saveMode}
        overwriteSnapshotId={overwriteSnapshotId}
        saving={savingSnapshot}
        onClose={closeSaveModal}
        onSnapshotNameChange={setSnapshotName}
        onSaveModeChange={mode => {
          setSaveMode(mode);
          if (mode === 'create') {
            setOverwriteSnapshotId('');
          }
        }}
        onOverwriteSnapshotChange={handleOverwriteSelectionChange}
        onSave={handleSaveSnapshot}
      />

    </>
  );
};
