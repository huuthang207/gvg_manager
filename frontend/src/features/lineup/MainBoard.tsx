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

      const file = new File([blob], 'gvg-lineup.png', { type: 'image/png' });
      if (typeof navigator.share === 'function' && typeof navigator.canShare === 'function' && navigator.canShare({ files: [file] })) {
        try {
          await navigator.share({ files: [file], title: 'GvG Lineup' });
          return;
        } catch (err) {
          if (err instanceof DOMException && err.name === 'AbortError') return;
          throw err;
        }
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
      <div className="flex-1 min-h-0 p-4 overflow-y-auto space-y-6 bg-slate-950/15 border-l border-slate-800/80 custom-scrollbar">
        <div className="relative mb-4 overflow-visible rounded-xl border border-emerald-400/20 bg-slate-950/35 shadow-sm shadow-slate-950/20">
          <div className="absolute -top-3.5 left-3 z-10 flex items-center gap-1.5 rounded-full border border-emerald-400/25 bg-slate-950 px-3 py-1 text-xs font-black uppercase tracking-widest text-emerald-200 shadow-sm shadow-slate-950/40">
            <ClipboardList size={14} className="text-emerald-300" />
Bảng phân công
          </div>
          <div className="flex flex-col gap-2 border-b border-slate-800/70 bg-slate-950/35 px-2.5 pb-2.5 pt-4 xl:flex-row xl:items-center xl:justify-between">
            <div className="flex min-w-0 flex-1 flex-wrap items-center gap-1.5 text-xs">
              {selfMember ? selfAssignment ? (
                <>
                  <span className="rounded-lg border border-emerald-400/20 bg-emerald-500/8 px-2 py-1 font-black text-emerald-100">
                    Phân công của bạn
                  </span>
                  <span className="rounded-lg border border-slate-700/70 bg-slate-950/45 px-2 py-1">
                    <span className="text-[9px] font-black uppercase tracking-widest text-slate-500">Tên</span>
                    <span className="ml-1 font-black text-slate-100">{selfMember.name}</span>
                  </span>
                  <span className="rounded-lg border border-slate-700/70 bg-slate-950/45 px-2 py-1">
                    <span className="text-[9px] font-black uppercase tracking-widest text-slate-500">Môn phái</span>
                    <span className="ml-1 font-bold text-slate-200">{selfMember.classType}</span>
                  </span>
                  <span className="rounded-lg border border-slate-700/70 bg-slate-950/45 px-2 py-1">
                    <span className="text-[9px] font-black uppercase tracking-widest text-slate-500">Vị trí</span>
                    <span className="ml-1 font-bold text-slate-200">{selfAssignment.groupName} - {selfAssignment.teamName}</span>
                  </span>
                  <span className="rounded-lg border border-emerald-400/20 bg-emerald-500/8 px-2 py-1 font-black text-emerald-100">
                    {selfLineupType}
                  </span>
                  <span className="flex items-center gap-1 rounded-lg border border-slate-700/70 bg-slate-950/45 px-2 py-1">
                    <span className="text-[9px] font-black uppercase tracking-widest text-slate-500">Kĩ năng</span>
                    {selfAssignment.skills.length > 0 ? selfAssignment.skills.map(skill => (
                      <img key={skill.id} src={skill.logo} alt={skill.name} title={skill.name} className="h-5 w-5 rounded border border-slate-700 bg-slate-950 object-cover" />
                    )) : <span className="font-bold text-slate-500">Chưa có</span>}
                  </span>
                  <span className="min-w-0 rounded-lg border border-slate-700/70 bg-slate-950/45 px-2 py-1" title={selfAssignment.note || 'Không có ghi chú'}>
                    <span className="text-[9px] font-black uppercase tracking-widest text-slate-500">Ghi chú</span>
                    <span className="ml-1 font-bold text-slate-200">{selfAssignment.note || 'Không có ghi chú'}</span>
                  </span>
                </>
              ) : (
                <span className="rounded-lg border border-dashed border-slate-700/80 bg-slate-950/35 px-2 py-1 font-bold text-slate-500">
                  Bạn chưa được xếp vào đội hình hiện tại.
                </span>
              ) : (
                <span className="rounded-lg border border-dashed border-slate-700/80 bg-slate-950/35 px-2 py-1 font-bold text-slate-500">
                  Không tìm thấy thông tin thành viên của bạn.
                </span>
              )}
            </div>

            <div className="flex min-w-0 flex-col justify-center gap-2 lg:flex-row lg:items-center">
              <button
                onClick={() => setAssignmentsOpen(open => !open)}
                className="flex shrink-0 items-center justify-between gap-3 rounded-lg border border-emerald-400/20 bg-slate-950/35 px-3 py-2 text-left transition-colors hover:bg-slate-900/50"
              >
                <span className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-slate-100">
                  <ClipboardList size={15} className="text-emerald-300" />
                  {assignmentsOpen ? 'Ẩn danh sách' : 'Xem tất cả'}
                  <span className="rounded-full border border-emerald-400/20 bg-emerald-500/10 px-2 py-0.5 text-[10px] text-emerald-200">
                    {assignedRows.length} người
                  </span>
                </span>
                <ChevronDown size={16} className={`shrink-0 text-slate-400 transition-transform ${assignmentsOpen ? 'rotate-180' : ''}`} />
              </button>
            </div>
          </div>

          {assignmentsOpen && (
            <div className="space-y-2 p-2">
              <div className="relative max-w-md">
                <Search size={14} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  value={assignmentSearch}
                  onChange={event => setAssignmentSearch(event.target.value)}
                  placeholder="Tìm thành viên, đoàn, đội, phái, skill..."
                  className="w-full rounded-lg border border-slate-700/70 bg-slate-950/55 py-2 pl-8 pr-3 text-xs font-bold text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-emerald-400/60"
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
                  <table className="w-full min-w-[780px] border-separate border-spacing-y-1 text-left text-xs">
                    <thead className="text-[10px] font-black uppercase tracking-wider text-slate-500">
                      <tr>
                        <th className="px-2 py-1.5">Thành viên</th>
                        <th className="px-2 py-1.5">Đoàn</th>
                        <th className="px-2 py-1.5">Đội</th>
                        <th className="px-2 py-1.5">Vị trí</th>
                        <th className="px-2 py-1.5">Skill</th>
                        <th className="px-2 py-1.5">Ghi chú</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredAssignedRows.map(row => (
                        <tr key={row.key} className="bg-slate-900/45 text-slate-200">
                          <td className="rounded-l-lg px-2 py-1.5">
                            <div className="flex min-w-0 items-center gap-2">
                              {getClassIcon(row.member.classType) ? (
                                <img src={getClassIcon(row.member.classType)!} alt="" className="h-6 w-6 shrink-0 object-contain" />
                              ) : (
                                <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md border border-slate-700 bg-slate-950/50 text-[9px] font-black text-slate-300">?</div>
                              )}
                              <span className="truncate font-bold text-slate-100">{row.member.name}</span>
                              {row.note && <MessageSquareText size={13} className="shrink-0 text-emerald-300" />}
                            </div>
                          </td>
                          <td className="px-2 py-1.5 text-slate-400">{row.groupName}</td>
                          <td className="px-2 py-1.5 text-slate-300">{row.teamName}</td>
                          <td className="px-2 py-1.5 text-slate-400">{row.position}</td>
                          <td className="px-2 py-1.5">
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
                          <td className="rounded-r-lg px-2 py-1.5">
                            <input
                              value={draftNotes[row.key] ?? row.note}
                              onChange={event => handleNoteDraftChange(row.key, event.target.value)}
                              onBlur={() => handleNoteBlur(row)}
                              disabled={readOnly}
                              placeholder={readOnly ? 'Không có ghi chú' : 'Nhập nhiệm vụ...'}
                              className="w-full rounded-lg border border-slate-700/70 bg-slate-950/55 px-2 py-1.5 text-xs text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-emerald-400/60 disabled:cursor-not-allowed disabled:opacity-70"
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
          <div className="mb-4 rounded-xl border border-slate-800/80 bg-slate-950/35 p-2.5 shadow-sm shadow-slate-950/20">
            <div className="flex flex-wrap items-center gap-1.5">
              <div className="mr-1 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-slate-500">
                <BarChart3 size={13} className="text-blue-400" />
                Phái
              </div>
              <span className="rounded-full border border-slate-700 bg-slate-800/55 px-2 py-0.5 text-[10px] font-black text-slate-400">
                {squadGroups.length} đoàn · {totalTeams}/10 đội
              </span>
              <span className="rounded-full border border-blue-500/20 bg-blue-500/10 px-2 py-0.5 text-[10px] font-black text-blue-300">
                {totalAssigned} đã xếp
              </span>

              <div className="mx-1 h-5 w-px bg-slate-800" />

              <div className="flex flex-wrap items-center gap-1.5">
                {CLASSES.map(cls => (
                  <div
                    key={cls}
                    className="flex items-center gap-1 rounded-lg border bg-slate-900/45 px-1.5 py-1"
                    style={{ borderColor: `${CLASS_COLORS[cls]}35` }}
                    title={cls}
                  >
                    <img src={CLASS_ICONS[cls]} alt="" className="h-5 w-5 shrink-0 object-contain" />
                    <span
                      className="min-w-5 rounded-md px-1 text-center text-[10px] font-black leading-5"
                      style={{ color: CLASS_COLORS[cls], backgroundColor: `${CLASS_COLORS[cls]}12` }}
                    >
                      {classStats[cls]}
                    </span>
                  </div>
                ))}
              </div>

              <div className="ml-auto flex flex-wrap items-center gap-1.5">
                {canManageSnapshots && !readOnly && (
                  <button
                    onClick={handleOpenSaveModal}
                    className="flex items-center gap-1.5 rounded-lg border border-emerald-400/25 bg-emerald-500/8 px-2 py-1 text-[10px] font-bold text-emerald-200 transition-colors hover:border-emerald-300/45 hover:bg-emerald-500/14"
                    title="Lưu đội hình"
                  >
                    <Save size={12} />
                    Lưu
                  </button>
                )}
                <button
                  onClick={() => void openSnapshots()}
                  className="flex items-center gap-1.5 rounded-lg border border-sky-400/25 bg-sky-500/8 px-2 py-1 text-[10px] font-bold text-sky-200 transition-colors hover:border-sky-300/45 hover:bg-sky-500/14"
                  title="Đội hình đã lưu"
                >
                  <Archive size={12} />
                  Đã lưu
                </button>
                <button
                  onClick={() => void handleShareLineupImage()}
                  disabled={exportingLineupImage || squadGroups.length === 0}
                  className="flex items-center gap-1.5 rounded-lg border border-fuchsia-400/25 bg-fuchsia-500/8 px-2 py-1 text-[10px] font-bold text-fuchsia-200 transition-colors hover:border-fuchsia-300/45 hover:bg-fuchsia-500/14 disabled:cursor-not-allowed disabled:opacity-50"
                  title="Chia sẻ hoặc tải ảnh đội hình"
                >
                  <ImageDown size={12} />
                  {exportingLineupImage ? 'Đang chụp...' : 'Chia sẻ ảnh'}
                </button>
                {!readOnly && (
                  <>
                    {onOpenAttendanceImport ? (
                      <button
                        onClick={onOpenAttendanceImport}
                        disabled={lineupResetActionPending}
                        className="flex items-center gap-1.5 rounded-lg border border-sky-400/25 bg-sky-500/8 px-2 py-1 text-[10px] font-bold text-sky-200 transition-colors hover:border-sky-300/45 hover:bg-sky-500/14 disabled:cursor-not-allowed disabled:opacity-50"
                        title="Nhập danh sách từ điểm danh"
                      >
                        <ClipboardList size={12} />
                        Từ điểm danh
                      </button>
                    ) : null}
                    <button
                      onClick={onRearrangeMembers}
                      disabled={lineupResetActionPending}
                      className="flex items-center gap-1.5 rounded-lg border border-indigo-400/25 bg-indigo-500/8 px-2 py-1 text-[10px] font-bold text-indigo-200 transition-colors hover:border-indigo-300/45 hover:bg-indigo-500/14 disabled:cursor-not-allowed disabled:opacity-50"
                      title="Sắp xếp lại thành viên"
                    >
                      <RotateCcw size={12} />
                      Sắp xếp lại
                    </button>
                    <button
                      onClick={onStartNewLineup}
                      disabled={lineupResetActionPending}
                      className="flex items-center gap-1.5 rounded-lg border border-amber-400/25 bg-amber-500/8 px-2 py-1 text-[10px] font-bold text-amber-200 transition-colors hover:border-amber-300/45 hover:bg-amber-500/14 disabled:cursor-not-allowed disabled:opacity-50"
                      title="Tạo mới đội hình"
                    >
                      <RotateCcw size={12} />
                      Tạo mới
                    </button>
                  </>
                )}
                <span className="rounded-full border border-slate-700 bg-slate-800/55 px-2 py-0.5 text-[10px] font-black text-slate-500">
                  {snapshots.length} bản lưu
                </span>
              </div>
            </div>
          </div>
        )}


        <div ref={lineupBoardRef} className="space-y-6 rounded-2xl bg-slate-950 p-4 pb-6">
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
                <div className="rounded-xl border border-slate-700/60 bg-slate-900/55 px-3 py-2.5 shadow-sm shadow-slate-950/10">
                  <div className="flex flex-col gap-2 xl:flex-row xl:items-center xl:justify-between">
                    <div className="min-w-0 space-y-1">
                      <div className="flex min-w-0 flex-wrap items-center gap-2">
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
                        className="w-full rounded-lg border border-slate-700/80 bg-slate-800/70 px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-sky-400/70 xl:w-60"
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

    </>
  );
};
