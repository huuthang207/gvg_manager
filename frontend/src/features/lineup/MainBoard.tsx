/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { toBlob } from 'html-to-image';
import { Member, Skill, SquadGroup } from '../../types.ts';
import { LineupSnapshotActions, LineupSnapshotState } from '../../hooks/useLineupSnapshots.ts';
import { DiscordUser } from '../../services/discordApi.ts';
import { CLASSES, CLASS_COLORS, CLASS_ICONS, getClassIcon } from '../../constants.ts';
import { TeamCard } from './TeamCard.tsx';
import { Archive, BarChart3, ChevronDown, ClipboardList, ImageDown, MessageSquareText, RotateCcw, Save, Search } from 'lucide-react';
import { SnapshotSaveModal } from './SnapshotSaveModal.tsx';
import { useSystemDialog } from '../app/SystemDialogProvider.tsx';
import { getErrorMessage } from '../../lib/error.ts';

const GROUP_ACCENTS = [
  '#38BDF8', '#F59E0B', '#34D399', '#FB7185', '#A78BFA',
  '#22D3EE', '#F472B6', '#FBBF24', '#4ADE80', '#60A5FA',
];

const AssignmentInfo: React.FC<{ label: string; value: string; strong?: boolean }> = ({ label, value, strong = false }) => (
  <div className="min-w-0 rounded-xl border border-slate-800/80 bg-slate-950/45 px-3 py-2">
    <div className="text-[9px] font-black uppercase tracking-widest text-slate-500">{label}</div>
    <div className={`mt-1 truncate text-xs ${strong ? 'font-black text-slate-100' : 'font-bold text-slate-200'}`}>{value}</div>
  </div>
);

interface MainBoardProps {
  squadGroups: SquadGroup[];
  memberPool: Member[];
  skills: Skill[];
  currentUser: DiscordUser | null;
  getMemberById: (id: string) => Member | null;
  onRemoveSkillFromMember: (memberId: string, skillId: string) => void;
  onStartNewLineup: () => void;
  onRearrangeMembers: () => void;
  onOpenAttendanceImport?: () => void;
  lineupResetActionPending?: boolean;
  onSquadGroupLeaderChange: (groupId: string, leaderMemberId: string | null) => void;
  onMemberNoteChange: (teamId: string, memberId: string, note: string) => void;
  readOnly: boolean;
  canManageLineup: boolean;
  canManageSnapshots: boolean;
  snapshotState: LineupSnapshotState;
  snapshotActions: Pick<LineupSnapshotActions, 'openSnapshots' | 'closeSnapshots' | 'selectSnapshot' | 'saveSnapshot' | 'restoreSnapshot' | 'removeSnapshot' | 'refreshSnapshots'>;
}

export const MainBoard: React.FC<MainBoardProps> = ({
  squadGroups,
  memberPool,
  skills,
  currentUser,
  getMemberById,
  onRemoveSkillFromMember,
  onStartNewLineup,
  onRearrangeMembers,
  onOpenAttendanceImport,
  lineupResetActionPending = false,
  onSquadGroupLeaderChange,
  onMemberNoteChange,
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
  const [assignmentsOpen, setAssignmentsOpen] = React.useState(false);
  const [assignmentSearch, setAssignmentSearch] = React.useState('');
  const [draftNotes, setDraftNotes] = React.useState<Record<string, string>>({});

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

  const assignedRows = React.useMemo(() => {
    return squadGroups.flatMap(group => group.teams.flatMap(team => {
      const mainRows = team.memberIds
        .map((memberId, index) => ({ memberId, position: `Chính ${index + 1}` }))
        .filter(row => Boolean(row.memberId));
      const reserveRows = team.reserveMemberIds
        .map((memberId, index) => ({ memberId, position: `Dự bị ${index + 1}` }))
        .filter(row => Boolean(row.memberId));

      return [...mainRows, ...reserveRows].map(row => {
        const member = getMemberById(row.memberId);
        return member ? {
          key: `${team.id}-${member.id}`,
          groupId: group.id,
          groupName: group.name,
          teamId: team.id,
          teamName: team.name,
          member,
          position: row.position,
          note: team.memberNotes?.[member.id] ?? '',
          skills: (member.assignedSkills || []).map(id => skills.find(skill => skill.id === id)).filter(Boolean) as Skill[],
        } : null;
      }).filter((row): row is NonNullable<typeof row> => Boolean(row));
    }));
  }, [getMemberById, skills, squadGroups]);

  const filteredAssignedRows = React.useMemo(() => {
    const query = assignmentSearch.trim().toLowerCase();
    if (!query) return assignedRows;

    return assignedRows.filter(row => {
      const values = [
        row.member.name,
        row.member.ingameName,
        row.member.discordDisplayName,
        row.member.discordUsername,
        row.member.classType,
        row.groupName,
        row.teamName,
        row.position,
        row.note,
        ...row.skills.map(skill => skill.name),
      ];

      return values
        .filter(Boolean)
        .some(value => value!.toLowerCase().includes(query));
    });
  }, [assignedRows, assignmentSearch]);

  const selfMember = React.useMemo(() => {
    if (!currentUser?.id) return null;
    return memberPool.find(member => member.discordId === currentUser.id) || null;
  }, [currentUser, memberPool]);

  const selfAssignment = React.useMemo(() => {
    if (!selfMember) return null;
    return assignedRows.find(row => row.member.id === selfMember.id) || null;
  }, [assignedRows, selfMember]);

  const handleNoteDraftChange = (key: string, note: string) => {
    setDraftNotes(prev => ({ ...prev, [key]: note }));
  };

  const handleNoteBlur = (row: (typeof assignedRows)[number]) => {
    if (!(row.key in draftNotes)) return;
    onMemberNoteChange(row.teamId, row.member.id, draftNotes[row.key]);
    setDraftNotes(prev => {
      const next = { ...prev };
      delete next[row.key];
      return next;
    });
  };

  const selfLineupType = selfAssignment?.position.startsWith('Dự bị') ? 'Đội hình Dự bị' : 'Đội hình Chính';

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
        <div className="overflow-hidden rounded-2xl border border-emerald-400/20 bg-gradient-to-br from-emerald-500/10 via-slate-950/45 to-sky-500/8 shadow-xl shadow-slate-950/15">
          <div className="flex flex-col gap-4 border-b border-slate-800/80 p-4 xl:flex-row xl:items-stretch xl:justify-between">
            <section className="min-w-0 flex-1 rounded-2xl border border-slate-800/80 bg-slate-950/40 p-4">
              <div className="mb-3 flex items-center justify-between gap-2">
                <h2 className="flex items-center gap-2 text-sm font-black uppercase tracking-wider text-emerald-100">
                  <ClipboardList size={16} className="text-emerald-300" />
                  Phân công của bạn
                </h2>
                <span className="rounded-full border border-emerald-400/25 bg-emerald-500/12 px-2.5 py-1 text-[10px] font-black text-emerald-200">
                  {selfAssignment ? selfLineupType : 'Chưa xếp'}
                </span>
              </div>
              {selfMember ? selfAssignment ? (
                <div className="grid grid-cols-1 gap-2 lg:grid-cols-2 2xl:grid-cols-4">
                  <AssignmentInfo label="Tên" value={selfMember.name} strong />
                  <AssignmentInfo label="Phái" value={selfMember.classType} />
                  <AssignmentInfo label="Vị trí" value={`${selfAssignment.groupName} - ${selfAssignment.teamName}`} />
                  <div className="min-w-0 rounded-xl border border-slate-800/80 bg-slate-950/45 px-3 py-2">
                    <div className="text-[9px] font-black uppercase tracking-widest text-slate-500">Kỹ năng</div>
                    <div className="mt-1 flex min-h-6 items-center gap-1">
                      {selfAssignment.skills.length > 0 ? selfAssignment.skills.map(skill => (
                        <img key={skill.id} src={skill.logo} alt={skill.name} title={skill.name} className="h-6 w-6 rounded border border-slate-700 bg-slate-950 object-cover" />
                      )) : <span className="text-xs font-bold text-slate-500">Chưa có</span>}
                    </div>
                  </div>
                  <div className="min-w-0 rounded-xl border border-slate-800/80 bg-slate-950/45 px-3 py-2 lg:col-span-2 2xl:col-span-4" title={selfAssignment.note || 'Không có ghi chú'}>
                    <div className="text-[9px] font-black uppercase tracking-widest text-slate-500">Ghi chú</div>
                    <div className="mt-1 truncate text-xs font-bold text-slate-200">{selfAssignment.note || 'Không có ghi chú'}</div>
                  </div>
                </div>
              ) : (
                <div className="rounded-xl border border-dashed border-slate-700/80 bg-slate-950/35 px-3 py-5 text-center text-sm font-bold text-slate-500">
                  Bạn chưa được xếp vào đội hình hiện tại.
                </div>
              ) : (
                <div className="rounded-xl border border-dashed border-slate-700/80 bg-slate-950/35 px-3 py-5 text-center text-sm font-bold text-slate-500">
                  Không tìm thấy thông tin thành viên của bạn.
                </div>
              )}
            </section>

            <section className="flex w-full flex-col justify-between gap-3 rounded-2xl border border-slate-800/80 bg-slate-950/40 p-4 xl:w-72">
              <div>
                <div className="text-[10px] font-black uppercase tracking-wider text-slate-500">Danh sách phân công</div>
                <div className="mt-1 text-2xl font-black text-slate-100">{assignedRows.length}</div>
                <div className="text-xs font-bold text-slate-500">thành viên đã có vị trí</div>
              </div>
              <button
                onClick={() => setAssignmentsOpen(open => !open)}
                className="flex items-center justify-between gap-3 rounded-xl border border-emerald-400/25 bg-emerald-500/10 px-3 py-2 text-left transition-colors hover:border-emerald-300/45 hover:bg-emerald-500/15"
              >
                <span className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-emerald-100">
                  <ClipboardList size={15} className="text-emerald-300" />
                  {assignmentsOpen ? 'Ẩn danh sách' : 'Xem tất cả'}
                </span>
                <ChevronDown size={16} className={`shrink-0 text-emerald-200 transition-transform ${assignmentsOpen ? 'rotate-180' : ''}`} />
              </button>
            </section>
          </div>

          {assignmentsOpen && (
            <div className="space-y-3 bg-slate-950/20 p-4">
              <div className="relative max-w-md">
                <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  value={assignmentSearch}
                  onChange={event => setAssignmentSearch(event.target.value)}
                  placeholder="Tìm thành viên, đoàn, đội, phái, skill..."
                  className="w-full rounded-lg border border-slate-700/80 bg-slate-800/70 py-2 pl-9 pr-3 text-xs font-bold text-slate-100 placeholder:text-slate-500 focus:border-emerald-400/60 focus:outline-none"
                />
              </div>
              {assignedRows.length === 0 ? (
                <div className="rounded-lg border border-dashed border-slate-700/80 bg-slate-900/35 px-3 py-5 text-center text-xs text-slate-500">
                  Chưa có thành viên nào được xếp vào đội hình.
                </div>
              ) : filteredAssignedRows.length === 0 ? (
                <div className="rounded-lg border border-dashed border-slate-700/80 bg-slate-900/35 px-3 py-5 text-center text-xs text-slate-500">
                  Không tìm thấy thành viên phù hợp.
                </div>
              ) : (
                <div className="overflow-x-auto custom-scrollbar">
                  <table className="w-full min-w-[820px] table-fixed border-separate border-spacing-y-1 text-left text-xs">
                    <thead className="text-[10px] font-black uppercase tracking-wider text-slate-500">
                      <tr>
                        <th className="w-[22%] px-3 py-2">Thành viên</th>
                        <th className="w-[14%] px-3 py-2">Đoàn</th>
                        <th className="w-[14%] px-3 py-2">Đội</th>
                        <th className="w-[13%] px-3 py-2">Vị trí</th>
                        <th className="w-[13%] px-3 py-2">Skill</th>
                        <th className="w-[24%] px-3 py-2">Ghi chú</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredAssignedRows.map(row => (
                        <tr key={row.key} className="bg-slate-900/45 text-slate-200 transition-colors hover:bg-slate-800/55">
                          <td className="rounded-l-xl px-3 py-2">
                            <div className="flex min-w-0 items-center gap-2.5">
                              {getClassIcon(row.member.classType) ? (
                                <img src={getClassIcon(row.member.classType)!} alt="" className="h-7 w-7 shrink-0 object-contain" />
                              ) : (
                                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-slate-700 bg-slate-950/50 text-[9px] font-black text-slate-300">?</div>
                              )}
                              <span className="truncate font-semibold text-slate-300">{row.member.name}</span>
                              {row.note && <MessageSquareText size={13} className="shrink-0 text-emerald-300" />}
                            </div>
                          </td>
                          <td className="px-3 py-2 text-slate-400"><span className="block truncate">{row.groupName}</span></td>
                          <td className="px-3 py-2 text-slate-300"><span className="block truncate">{row.teamName}</span></td>
                          <td className="px-3 py-2 text-slate-400"><span className="block truncate">{row.position}</span></td>
                          <td className="px-3 py-2">
                            {row.skills.length > 0 ? (
                              <div className="flex items-center gap-1">
                                {row.skills.map(skill => (
                                  <img key={skill.id} src={skill.logo} alt={skill.name} title={skill.name} className="h-6 w-6 rounded border border-slate-700 bg-slate-950 object-cover" />
                                ))}
                              </div>
                            ) : (
                              <span className="text-slate-600">—</span>
                            )}
                          </td>
                          <td className="rounded-r-xl px-3 py-2">
                            <input
                              value={draftNotes[row.key] ?? row.note}
                              onChange={event => handleNoteDraftChange(row.key, event.target.value)}
                              onBlur={() => handleNoteBlur(row)}
                              disabled={readOnly}
                              placeholder={readOnly ? 'Không có ghi chú' : 'Nhập nhiệm vụ...'}
                              className="w-full rounded-lg border border-slate-700/80 bg-slate-950/55 px-2.5 py-1.5 text-xs text-slate-100 placeholder:text-slate-600 focus:border-emerald-400/60 focus:outline-none disabled:cursor-not-allowed disabled:opacity-70"
                            />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>

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
