/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Member, Skill, SquadGroup } from '../../types.ts';
import { LineupSnapshotActions, LineupSnapshotState } from '../../hooks/useLineupSnapshots.ts';
import { CLASSES, CLASS_COLORS, CLASS_ICONS } from '../../constants.ts';
import { TeamCard } from './TeamCard.tsx';
import { BarChart3, RotateCcw, Save, Archive } from 'lucide-react';
import { SnapshotSaveModal } from './SnapshotSaveModal.tsx';
import { LineupSnapshotsModal } from './LineupSnapshotsModal.tsx';

const GROUP_ACCENTS = [
  '#38BDF8', '#F59E0B', '#34D399', '#FB7185', '#A78BFA',
  '#22D3EE', '#F472B6', '#FBBF24', '#4ADE80', '#60A5FA',
];

interface MainBoardProps {
  squadGroups: SquadGroup[];
  skills: Skill[];
  getMemberById: (id: string) => Member | null;
  onRemoveSkillFromMember: (memberId: string, skillId: string) => void;
  onResetSquadSetup: () => void;
  onSquadGroupLeaderChange: (groupId: string, leaderMemberId: string | null) => void;
  readOnly: boolean;
  canManageSnapshots: boolean;
  canRestoreSnapshots: boolean;
  snapshotState: LineupSnapshotState;
  snapshotActions: Pick<LineupSnapshotActions, 'openSnapshots' | 'closeSnapshots' | 'selectSnapshot' | 'saveSnapshot' | 'restoreSnapshot' | 'removeSnapshot'>;
}

export const MainBoard: React.FC<MainBoardProps> = ({
  squadGroups,
  skills,
  getMemberById,
  onRemoveSkillFromMember,
  onResetSquadSetup,
  onSquadGroupLeaderChange,
  readOnly,
  canManageSnapshots,
  canRestoreSnapshots,
  snapshotState,
  snapshotActions,
}) => {
  const {
    snapshots,
    snapshotsOpen,
    snapshotsLoading,
    snapshotDetailLoading,
    snapshotActionLoading,
    selectedSnapshotId,
    selectedSnapshot,
    recentSnapshotAction,
  } = snapshotState;
  const {
    openSnapshots,
    closeSnapshots,
    selectSnapshot,
    saveSnapshot,
    restoreSnapshot,
    removeSnapshot,
  } = snapshotActions;

  const [snapshotName, setSnapshotName] = React.useState('');
  const [saveMode, setSaveMode] = React.useState<'create' | 'overwrite'>('create');
  const [overwriteSnapshotId, setOverwriteSnapshotId] = React.useState<string>('');
  const [isSaveModalOpen, setIsSaveModalOpen] = React.useState(false);
  const [savingSnapshot, setSavingSnapshot] = React.useState(false);

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

  const handleOpenSaveModal = () => {
    setSaveMode('create');
    setOverwriteSnapshotId('');
    setSnapshotName('');
    setIsSaveModalOpen(true);
  };

  const handleSaveSnapshot = async () => {
    const name = snapshotName.trim();
    if (!name) {
      alert('Vui lòng nhập tên đội hình.');
      return;
    }
    if (saveMode === 'overwrite' && !overwriteSnapshotId) {
      alert('Vui lòng chọn đội hình cũ để ghi đè.');
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
      <div className="flex-1 min-h-0 p-4 overflow-y-auto space-y-6 bg-[#0F172A] border-l border-slate-800 custom-scrollbar">
        <div className="bg-slate-900/40 border border-slate-800/60 rounded-xl p-3 mb-4 backdrop-blur-sm">
          <div className="flex flex-wrap items-center gap-2 mb-3">
            <BarChart3 size={14} className="text-blue-400" />
            <h3 className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
              Thống kê phái
            </h3>
            <span className="text-[10px] font-black text-slate-500 bg-slate-800/60 border border-slate-700 px-2 py-0.5 rounded-full">
              {squadGroups.length} đoàn · {totalTeams}/10 đội
            </span>
            <span className="text-[10px] font-black text-blue-300 bg-blue-500/10 border border-blue-500/20 px-2 py-0.5 rounded-full sm:ml-auto">
              {totalAssigned} đã xếp
            </span>
            {canManageSnapshots && (
              <button
                onClick={handleOpenSaveModal}
                className="flex items-center gap-1.5 text-[10px] font-bold text-slate-400 hover:text-emerald-300 bg-slate-800/50 hover:bg-emerald-500/10 border border-slate-700 hover:border-emerald-500/30 px-2 py-1 rounded-lg transition-colors"
                title="Lưu đội hình"
              >
                <Save size={12} />
                Lưu đội hình
              </button>
            )}
            <button
              onClick={() => void openSnapshots()}
              className="flex items-center gap-1.5 text-[10px] font-bold text-slate-400 hover:text-sky-300 bg-slate-800/50 hover:bg-sky-500/10 border border-slate-700 hover:border-sky-500/30 px-2 py-1 rounded-lg transition-colors"
              title="Đội hình đã lưu"
            >
              <Archive size={12} />
              Đội hình đã lưu
            </button>
            {!readOnly && (
              <button
                onClick={onResetSquadSetup}
                className="flex items-center gap-1.5 text-[10px] font-bold text-slate-400 hover:text-amber-300 bg-slate-800/50 hover:bg-amber-500/10 border border-slate-700 hover:border-amber-500/30 px-2 py-1 rounded-lg transition-colors"
                title="Tạo lại đội hình"
              >
                <RotateCcw size={12} />
                Tạo lại
              </button>
            )}
            <span className="text-[10px] font-black text-slate-500 bg-slate-800/60 border border-slate-700 px-2 py-0.5 rounded-full">
              {snapshots.length} bản lưu
            </span>
          </div>

          <div className="grid grid-cols-7 gap-2">
            {CLASSES.map(cls => (
              <div
                key={cls}
                className="flex items-center gap-2 rounded-lg border bg-slate-950/35 px-2 py-1.5 min-w-0"
                style={{
                  borderColor: `${CLASS_COLORS[cls]}35`,
                  background: `linear-gradient(90deg, ${CLASS_COLORS[cls]}16 0%, rgba(15, 23, 42, 0.25) 72%)`,
                }}
              >
                <img src={CLASS_ICONS[cls]} alt="" className="w-8 h-8 object-contain shrink-0" />
                <div className="min-w-0">
                  <p className="text-[10px] font-bold text-slate-200 truncate">{cls}</p>
                  <p className="text-sm font-black leading-none" style={{ color: CLASS_COLORS[cls] }}>
                    {classStats[cls]}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-6 pb-6">
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

                    {!readOnly && (
                      <select
                        value={group.leaderMemberId ?? ''}
                        onChange={event => onSquadGroupLeaderChange(group.id, event.target.value || null)}
                        className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-blue-500 xl:w-60"
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

                <div className="flex items-center justify-between px-1">
                  <h2 className="text-lg font-extrabold uppercase tracking-widest text-[#E2E8F0]">
                    {group.name}
                  </h2>
                  <span className="text-[11px] text-slate-500 font-bold uppercase tracking-wider">
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

      {snapshotsOpen && (
        <LineupSnapshotsModal
          snapshots={snapshots}
          selectedSnapshotId={selectedSnapshotId}
          selectedSnapshot={selectedSnapshot}
          loading={snapshotsLoading}
          detailLoading={snapshotDetailLoading}
          actionLoading={snapshotActionLoading}
          canRestoreSnapshot={canRestoreSnapshots}
          canDeleteSnapshot={canManageSnapshots}
          recentSnapshotAction={recentSnapshotAction}
          skills={skills}
          getMemberById={getMemberById}
          onClose={closeSnapshots}
          onSelectSnapshot={snapshotId => { void selectSnapshot(snapshotId); }}
          onRestoreSnapshot={snapshotId => { void restoreSnapshot(snapshotId); }}
          onDeleteSnapshot={snapshotId => { void removeSnapshot(snapshotId); }}
        />
      )}
    </>
  );
};
