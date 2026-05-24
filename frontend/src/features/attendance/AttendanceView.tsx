import React, { useMemo, useState } from 'react';
import { CalendarDays, CheckCircle2, CircleHelp, ClipboardCheck, Hash, Play, Save, Search, ShieldCheck, Square, Trash2, X, XCircle } from 'lucide-react';
import { CLASSES, CLASS_COLORS, CLASS_ICONS } from '../../constants.ts';
import { cn } from '../../lib/utils.ts';
import { deleteAttendanceHistorySession, getAttendanceHistory, getAttendanceSession } from '../../services/discordApi.ts';
import type { AttendanceChoice, AttendanceSession, AttendanceState, AttendanceVote } from '../../shared/types/auth.ts';
import type { Member } from '../../shared/types/member.ts';
import type { ClassType } from '../../types.ts';
import { useSystemDialog } from '../app/SystemDialogProvider.tsx';
import { GvgParticipationModal } from './GvgParticipationModal.tsx';

const choiceMeta: Record<AttendanceChoice, { label: string; shortLabel: string; icon: React.ReactNode; className: string }> = {
  GO: { label: 'Tham gia', shortLabel: 'Tham gia', icon: <CheckCircle2 size={16} />, className: 'text-emerald-300 bg-emerald-500/10 border-emerald-500/25' },
  MAYBE: { label: 'Dự bị', shortLabel: 'Dự bị', icon: <CircleHelp size={16} />, className: 'text-amber-300 bg-amber-500/10 border-amber-500/25' },
  NOGO: { label: 'Không tham gia', shortLabel: 'Không tham gia', icon: <XCircle size={16} />, className: 'text-red-300 bg-red-500/10 border-red-500/25' },
};

function formatDate(value: string | null) {
  if (!value) return '-';
  return new Date(value).toLocaleString('vi-VN');
}

function getCurrentMonthKey(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

function getVoteName(vote: AttendanceVote) {
  return vote.snapshotIngameName || vote.member.ingameName || vote.member.displayName || vote.member.username;
}

function getVoteClass(vote: AttendanceVote) {
  return vote.snapshotClassType || vote.member.classType || 'Unknown';
}

function getMemberName(member: Member) {
  return member.ingameName || member.discordDisplayName || member.name || member.discordUsername || 'Không rõ tên';
}

function isKnownClass(value: string): value is ClassType {
  return (CLASSES as readonly string[]).includes(value);
}

function getClassColor(classType: string) {
  return isKnownClass(classType) ? CLASS_COLORS[classType] : '#94A3B8';
}

function sortClassEntries(entries: Array<[string, number]>) {
  const order = new Map<string, number>(CLASSES.map((classType, index) => [classType, index]));
  return [...entries].sort(([a], [b]) => {
    const aOrder = order.get(a);
    const bOrder = order.get(b);
    if (aOrder !== undefined && bOrder !== undefined) return aOrder - bOrder;
    if (aOrder !== undefined) return -1;
    if (bOrder !== undefined) return 1;
    return a.localeCompare(b, 'vi');
  });
}

function ClassBadge({ classType }: { classType: string }) {
  const color = getClassColor(classType);
  const icon = isKnownClass(classType) ? CLASS_ICONS[classType] : null;

  return (
    <span
      className="inline-flex max-w-full items-center gap-1.5 rounded-full border px-2 py-0.5 text-[11px] font-black"
      style={{ borderColor: `${color}55`, backgroundColor: `${color}18`, color }}
    >
      {icon ? <img src={icon} alt="" className="h-3.5 w-3.5 rounded-full object-cover" /> : null}
      <span className="truncate">{classType}</span>
    </span>
  );
}

function ChoiceSummaryCard({ choice, count }: { choice: AttendanceChoice; count: number }) {
  const meta = choiceMeta[choice];
  return (
    <div className={cn('rounded-2xl border px-3 py-2.5 shadow-sm shadow-slate-950/20', meta.className)}>
      <div className="flex items-center justify-between gap-2">
        <div className="inline-flex min-w-0 items-center gap-2 text-xs font-black">
          {meta.icon}
          <span className="truncate">{meta.label}</span>
        </div>
        <div className="text-2xl font-black text-white tabular-nums">{count}</div>
      </div>
    </div>
  );
}

function SummaryPill({ choice, count }: { choice: AttendanceChoice; count: number }) {
  const meta = choiceMeta[choice];
  return (
    <span className={cn('inline-flex items-center gap-1 rounded-full border px-2 py-1 text-xs font-black', meta.className)}>
      {meta.shortLabel} {count}
    </span>
  );
}

function ClassSummary({ votes }: { votes: AttendanceVote[] }) {
  const classCounts = useMemo(() => {
    const counts = new Map<string, number>();
    votes.forEach(vote => {
      const classType = getVoteClass(vote);
      counts.set(classType, (counts.get(classType) || 0) + 1);
    });
    return sortClassEntries([...counts.entries()]);
  }, [votes]);
  const maxCount = Math.max(...classCounts.map(([, count]) => count), 1);

  return (
    <section className="app-surface rounded-2xl p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-black text-slate-100">Cơ cấu phái</h3>
          <p className="text-xs text-slate-500">Tổng hợp tất cả lựa chọn</p>
        </div>
        <span className="rounded-full border border-slate-700 bg-slate-950/70 px-2.5 py-1 text-xs font-black text-slate-300">
          Tổng {votes.length}
        </span>
      </div>
      {classCounts.length ? (
        <div className="space-y-2">
          {classCounts.map(([classType, count]) => {
            const color = getClassColor(classType);
            return (
              <div key={classType} className="rounded-xl border border-slate-800/80 bg-slate-950/40 p-2.5">
                <div className="flex items-center justify-between gap-3">
                  <ClassBadge classType={classType} />
                  <span className="rounded-full border border-slate-700 bg-slate-900 px-2 py-0.5 text-xs font-black text-white tabular-nums">{count}</span>
                </div>
                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-800/80">
                  <div className="h-full rounded-full" style={{ width: `${Math.max((count / maxCount) * 100, 8)}%`, backgroundColor: color }} />
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="rounded-xl border border-dashed border-slate-700/70 px-3 py-6 text-center text-sm text-slate-500">
          Chưa có vote nào.
        </div>
      )}
    </section>
  );
}

function VoteChoiceBadge({ choice }: { choice: AttendanceChoice }) {
  const meta = choiceMeta[choice];
  return (
    <span className={cn('inline-flex items-center gap-1.5 rounded-full border px-2 py-1 text-xs font-black', meta.className)}>
      {meta.icon}
      {meta.label}
    </span>
  );
}

function VoteTable({ votes, totalVotes }: { votes: AttendanceVote[]; totalVotes: number }) {
  return (
    <section className="app-surface rounded-2xl p-4">
      <div className="mb-3 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-sm font-black text-slate-100">Danh sách điểm danh</h3>
          <p className="text-xs text-slate-500">Hiển thị {votes.length}/{totalVotes} vote</p>
        </div>
      </div>
      {votes.length ? (
        <div className="max-h-[560px] overflow-auto rounded-xl border border-slate-800/80 custom-scrollbar">
          <table className="min-w-full divide-y divide-slate-800/80 text-left text-sm">
            <thead className="sticky top-0 z-10 bg-slate-950/95 text-xs uppercase tracking-wider text-slate-500 backdrop-blur">
              <tr>
                <th className="w-16 px-3 py-3 font-black">#</th>
                <th className="min-w-[220px] px-3 py-3 font-black">Thành viên</th>
                <th className="min-w-[140px] px-3 py-3 font-black">Phái</th>
                <th className="min-w-[150px] px-3 py-3 font-black">Lựa chọn</th>
                <th className="min-w-[170px] px-3 py-3 text-right font-black">Cập nhật</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 bg-slate-950/25">
              {votes.map((vote, index) => (
                <tr key={vote.id} className="transition-colors hover:bg-slate-900/70">
                  <td className="px-3 py-3 font-mono text-xs font-black text-slate-500">#{index + 1}</td>
                  <td className="px-3 py-3">
                    <div className="font-bold text-slate-100">{getVoteName(vote)}</div>
                    <div className="text-xs text-slate-500">{vote.member.username}</div>
                  </td>
                  <td className="px-3 py-3"><ClassBadge classType={getVoteClass(vote)} /></td>
                  <td className="px-3 py-3"><VoteChoiceBadge choice={vote.choice} /></td>
                  <td className="px-3 py-3 text-right text-xs font-medium text-slate-500">{formatDate(vote.updatedAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="rounded-xl border border-dashed border-slate-700/70 px-3 py-8 text-center text-sm text-slate-500">
          Không có vote phù hợp với bộ lọc.
        </div>
      )}
    </section>
  );
}

function NotVotedTable({ members }: { members: Member[] }) {
  return (
    <section className="app-surface rounded-2xl p-4">
      <div className="mb-3 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-sm font-black text-slate-100">Chưa điểm danh</h3>
          <p className="text-xs text-slate-500">Thành viên active chưa chọn Tham gia, Dự bị hoặc Không tham gia</p>
        </div>
        <span className="w-fit rounded-full border border-slate-700 bg-slate-950/70 px-2.5 py-1 text-xs font-black text-slate-300">
          {members.length} người
        </span>
      </div>
      {members.length ? (
        <div className="max-h-[360px] overflow-auto rounded-xl border border-slate-800/80 custom-scrollbar">
          <table className="min-w-full divide-y divide-slate-800/80 text-left text-sm">
            <thead className="sticky top-0 z-10 bg-slate-950/95 text-xs uppercase tracking-wider text-slate-500 backdrop-blur">
              <tr>
                <th className="w-16 px-3 py-3 font-black">#</th>
                <th className="min-w-[220px] px-3 py-3 font-black">Thành viên</th>
                <th className="min-w-[140px] px-3 py-3 font-black">Phái</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 bg-slate-950/25">
              {members.map((member, index) => (
                <tr key={member.id} className="transition-colors hover:bg-slate-900/70">
                  <td className="px-3 py-3 font-mono text-xs font-black text-slate-500">#{index + 1}</td>
                  <td className="px-3 py-3">
                    <div className="font-bold text-slate-100">{getMemberName(member)}</div>
                    <div className="text-xs text-slate-500">{member.discordUsername || member.name}</div>
                  </td>
                  <td className="px-3 py-3"><ClassBadge classType={member.classType} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="rounded-xl border border-dashed border-emerald-500/30 bg-emerald-500/10 px-3 py-8 text-center text-sm font-bold text-emerald-200">
          Tất cả thành viên active đã điểm danh.
        </div>
      )}
    </section>
  );
}

function SessionSummaryCard({ session, channelName, onOpenDetails }: { session: AttendanceSession; channelName?: string | null; onOpenDetails: () => void }) {
  return (
    <button
      type="button"
      onClick={onOpenDetails}
      className="w-full rounded-2xl border border-sky-400/20 bg-gradient-to-br from-sky-500/10 via-slate-900/75 to-indigo-500/10 p-4 text-left shadow-lg shadow-slate-950/25 backdrop-blur-sm transition-colors hover:border-sky-300/35 hover:from-sky-500/15"
    >
      <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <div className="min-w-0">
          <div className={cn(
            'mb-3 inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-black',
            session.status === 'OPEN'
              ? 'border-emerald-500/25 bg-emerald-500/10 text-emerald-200'
              : 'border-slate-600/60 bg-slate-800/60 text-slate-300',
          )}>
            <ClipboardCheck size={14} />
            {session.status === 'OPEN' ? 'Đang mở' : 'Đã đóng'}
          </div>
          <h2 className="truncate text-2xl font-black text-white">{session.headerText || 'Điểm danh Bang Chiến'}</h2>
          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-slate-400">
            <span>Mở: {formatDate(session.openedAt)}</span>
            <span>Cập nhật: {formatDate(session.lastVoteAt || session.updatedAt)}</span>
            {session.discordChannelId ? <span>Kênh: {channelName || session.discordChannelId}</span> : null}
            <span className="font-bold text-sky-200">Click để mở chi tiết</span>
          </div>
        </div>
        <div className="grid min-w-full grid-cols-1 gap-2 sm:grid-cols-3 xl:min-w-[440px]">
          <ChoiceSummaryCard choice="GO" count={session.summary.go} />
          <ChoiceSummaryCard choice="MAYBE" count={session.summary.maybe} />
          <ChoiceSummaryCard choice="NOGO" count={session.summary.nogo} />
        </div>
      </div>
    </button>
  );
}

function SessionDetailsPanel({ session, members }: { session: AttendanceSession; members: Member[] }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [choiceFilter, setChoiceFilter] = useState<AttendanceChoice | 'ALL'>('ALL');
  const [classFilter, setClassFilter] = useState('ALL');
  const sortedVotesByClass = useMemo(() => (
    [...session.votes].sort((a, b) => {
      const classCompare = getVoteClass(a).localeCompare(getVoteClass(b), 'vi');
      if (classCompare !== 0) return classCompare;
      return getVoteName(a).localeCompare(getVoteName(b), 'vi');
    })
  ), [session.votes]);
  const notVotedMembers = useMemo(() => {
    const votedMemberIds = new Set(session.votes.map(vote => vote.memberId));
    return members
      .filter(member => member.active !== false && !votedMemberIds.has(member.id))
      .sort((a, b) => {
        const classCompare = a.classType.localeCompare(b.classType, 'vi');
        if (classCompare !== 0) return classCompare;
        return getMemberName(a).localeCompare(getMemberName(b), 'vi');
      });
  }, [members, session.votes]);
  const classOptions = useMemo(() => sortClassEntries([...new Set(session.votes.map(getVoteClass))].map(classType => [classType, 0])), [session.votes]);
  const filteredVotes = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    return sortedVotesByClass.filter(vote => {
      if (choiceFilter !== 'ALL' && vote.choice !== choiceFilter) return false;
      if (classFilter !== 'ALL' && getVoteClass(vote) !== classFilter) return false;
      if (!query) return true;
      return [getVoteName(vote), vote.member.username, vote.member.displayName, vote.member.ingameName]
        .filter(Boolean)
        .some(value => value!.toLowerCase().includes(query));
    });
  }, [choiceFilter, classFilter, searchTerm, sortedVotesByClass]);

  return (
    <div className="grid grid-cols-1 gap-4 2xl:grid-cols-[360px_1fr]">
        <ClassSummary votes={sortedVotesByClass} />
        <div className="space-y-3">
          <section className="app-surface rounded-2xl p-4">
            <div className="grid grid-cols-1 gap-3 xl:grid-cols-[1fr_auto_auto]">
              <div className="relative">
                <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  value={searchTerm}
                  onChange={event => setSearchTerm(event.target.value)}
                  className="w-full rounded-xl border border-slate-700 bg-slate-950/60 py-2 pl-9 pr-3 text-sm text-slate-100 outline-none transition-colors placeholder:text-slate-600 focus:border-sky-500"
                  placeholder="Tìm theo tên ingame hoặc Discord..."
                />
              </div>
              <select
                value={choiceFilter}
                onChange={event => setChoiceFilter(event.target.value as AttendanceChoice | 'ALL')}
                className="rounded-xl border border-slate-700 bg-slate-950/60 px-3 py-2 text-sm font-bold text-slate-200 outline-none transition-colors focus:border-sky-500"
              >
                <option value="ALL">Tất cả lựa chọn</option>
                <option value="GO">Tham gia</option>
                <option value="MAYBE">Dự bị</option>
                <option value="NOGO">Không tham gia</option>
              </select>
              <select
                value={classFilter}
                onChange={event => setClassFilter(event.target.value)}
                className="rounded-xl border border-slate-700 bg-slate-950/60 px-3 py-2 text-sm font-bold text-slate-200 outline-none transition-colors focus:border-sky-500"
              >
                <option value="ALL">Tất cả phái</option>
                {classOptions.map(([classType]) => <option key={classType} value={classType}>{classType}</option>)}
              </select>
            </div>
          </section>
          <VoteTable votes={filteredVotes} totalVotes={session.votes.length} />
          <NotVotedTable members={notVotedMembers} />
        </div>
      </div>
  );
}

export function AttendanceView({
  attendance,
  members,
  actionLoading,
  onSetChannel,
  onOpenSession,
  onCloseSession,
  onRefreshSession,
  onDeleteGvgParticipationMonth,
}: {
  attendance: AttendanceState;
  members: Member[];
  actionLoading: boolean;
  onSetChannel: (discordChannelId: string) => void;
  onOpenSession: (headerText: string) => void;
  onCloseSession: () => void;
  onRefreshSession: () => void;
  onDeleteGvgParticipationMonth: (month: string) => Promise<number>;
}) {
  const { confirm } = useSystemDialog();
  const [historySessions, setHistorySessions] = useState<AttendanceSession[]>(attendance.recentSessions);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState('');
  const [historyModalOpen, setHistoryModalOpen] = useState(false);
  const [historyHasMore, setHistoryHasMore] = useState(false);
  const [historyNextOffset, setHistoryNextOffset] = useState(0);
  const [selectedHistorySession, setSelectedHistorySession] = useState<AttendanceSession | null>(null);
  const [activeDetailsOpen, setActiveDetailsOpen] = useState(false);
  const [selectedHistoryLoading, setSelectedHistoryLoading] = useState(false);
  const [selectedHistoryError, setSelectedHistoryError] = useState('');
  const [deletingSessionId, setDeletingSessionId] = useState<string | null>(null);
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const [selectedHistoryIds, setSelectedHistoryIds] = useState<Set<string>>(() => new Set());
  const [deleteError, setDeleteError] = useState('');
  const [channelId, setChannelId] = useState(attendance.config?.discordChannelId || '');
  const [headerText, setHeaderText] = useState('');
  const [setupModal, setSetupModal] = useState<'open' | null>(null);
  const [isGvgModalOpen, setIsGvgModalOpen] = useState(false);
  const [deleteGvgMonth, setDeleteGvgMonth] = useState(getCurrentMonthKey);
  const [deletingGvgMonth, setDeletingGvgMonth] = useState(false);
  const historyList = historySessions.filter(session => session.id !== attendance.activeSession?.id);
  const recentHistoryList = historyList.slice(0, 5);
  const gvgParticipationSourceSessions = attendance.activeSession ? [attendance.activeSession, ...historyList] : historyList;
  const historyListIds = useMemo(() => historyList.map(session => session.id), [historyList]);
  const selectedHistoryCount = historyListIds.filter(id => selectedHistoryIds.has(id)).length;
  const allVisibleHistorySelected = historyListIds.length > 0 && selectedHistoryCount === historyListIds.length;
  const deleteActionDisabled = historyLoading || bulkDeleting;

  React.useEffect(() => {
    setChannelId(attendance.config?.discordChannelId || '');
  }, [attendance.config?.discordChannelId]);

  React.useEffect(() => {
    setHistorySessions(attendance.recentSessions);
    setHistoryLoading(true);
    setHistoryError('');
    getAttendanceHistory(20)
      .then(result => {
        setHistorySessions(result.sessions);
        setHistoryHasMore(!!result.hasMore);
        setHistoryNextOffset(result.nextOffset ?? result.sessions.length);
      })
      .catch(() => setHistoryError('Không thể tải lịch sử điểm danh.'))
      .finally(() => setHistoryLoading(false));
  }, [attendance.recentSessions]);

  React.useEffect(() => {
    const validIds = new Set(historyListIds);
    setSelectedHistoryIds(prev => {
      const next = new Set([...prev].filter(id => validIds.has(id)));
      return next.size === prev.size ? prev : next;
    });
  }, [historyListIds]);

  const openHistorySession = (sessionId: string) => {
    const preview = historySessions.find(session => session.id === sessionId) || null;
    setSelectedHistorySession(preview);
    setSelectedHistoryLoading(true);
    setSelectedHistoryError('');
    getAttendanceSession(sessionId)
      .then(result => setSelectedHistorySession(result.session))
      .catch(() => setSelectedHistoryError('Không thể tải chi tiết phiên điểm danh.'))
      .finally(() => setSelectedHistoryLoading(false));
  };

  const loadMoreHistory = () => {
    setHistoryLoading(true);
    setHistoryError('');
    getAttendanceHistory(20, historyNextOffset)
      .then(result => {
        setHistorySessions(prev => [...prev, ...result.sessions.filter(session => !prev.some(item => item.id === session.id))]);
        setHistoryHasMore(!!result.hasMore);
        setHistoryNextOffset(result.nextOffset ?? historyNextOffset + result.sessions.length);
      })
      .catch(() => setHistoryError('Không thể tải thêm lịch sử điểm danh.'))
      .finally(() => setHistoryLoading(false));
  };

  const toggleHistorySelection = (sessionId: string) => {
    setSelectedHistoryIds(prev => {
      const next = new Set(prev);
      if (next.has(sessionId)) {
        next.delete(sessionId);
      } else {
        next.add(sessionId);
      }
      return next;
    });
  };

  const toggleSelectAllHistory = () => {
    setSelectedHistoryIds(prev => {
      const next = new Set(prev);
      if (allVisibleHistorySelected) {
        historyListIds.forEach(id => next.delete(id));
      } else {
        historyListIds.forEach(id => next.add(id));
      }
      return next;
    });
  };

  const clearHistorySelection = () => setSelectedHistoryIds(new Set());

  const deleteHistoryIds = async (ids: string[], message: string) => {
    const uniqueIds = [...new Set(ids)].filter(id => historyListIds.includes(id));
    if (!uniqueIds.length) return;

    const confirmed = await confirm({
      message,
      variant: 'danger',
      confirmLabel: 'Xóa',
    });
    if (!confirmed) return;

    setBulkDeleting(uniqueIds.length > 1);
    setDeletingSessionId(uniqueIds.length === 1 ? uniqueIds[0] : null);
    setDeleteError('');
    const results = await Promise.allSettled(uniqueIds.map(id => deleteAttendanceHistorySession(id)));
    const deletedIds = uniqueIds.filter((_, index) => results[index].status === 'fulfilled');
    const deletedIdSet = new Set(deletedIds);

    if (deletedIds.length) {
      setHistorySessions(prev => prev.filter(item => !deletedIdSet.has(item.id)));
      setSelectedHistoryIds(prev => new Set([...prev].filter(id => !deletedIdSet.has(id))));
      if (selectedHistorySession && deletedIdSet.has(selectedHistorySession.id)) {
        setSelectedHistorySession(null);
      }
    }

    if (deletedIds.length !== uniqueIds.length) {
      setDeleteError(deletedIds.length ? `Đã xóa ${deletedIds.length}/${uniqueIds.length} lịch sử. Một số phiên không thể xóa.` : 'Không thể xóa lịch sử điểm danh.');
    }

    setBulkDeleting(false);
    setDeletingSessionId(null);
  };

  const deleteHistorySession = async (session: AttendanceSession) => {
    await deleteHistoryIds([session.id], `Xóa lịch sử điểm danh "${session.headerText || 'Điểm danh Bang Chiến'}"?`);
  };

  const deleteSelectedHistorySessions = async () => {
    const ids = historyListIds.filter(id => selectedHistoryIds.has(id));
    await deleteHistoryIds(ids, `Xóa ${ids.length} lịch sử điểm danh đã chọn?`);
  };

  const deleteAllHistorySessions = async () => {
    await deleteHistoryIds(historyListIds, `Xóa tất cả ${historyListIds.length} lịch sử điểm danh đang hiển thị?`);
  };

  const deleteGvgParticipationMonth = async () => {
    if (!deleteGvgMonth) return;

    const confirmed = await confirm({
      title: 'Xoá dữ liệu bang chiến theo tháng',
      message: `Xoá toàn bộ dữ liệu chốt tham gia bang chiến trong tháng ${deleteGvgMonth}? Thao tác này không xoá thành viên, điểm danh hoặc đội hình và không thể hoàn tác.`,
      variant: 'danger',
      confirmLabel: 'Xoá dữ liệu tháng',
    });
    if (!confirmed) return;

    setDeletingGvgMonth(true);
    try {
      const deletedCount = await onDeleteGvgParticipationMonth(deleteGvgMonth);
      await confirm({
        title: 'Đã xoá dữ liệu bang chiến',
        message: `Đã xoá ${deletedCount} phiên chốt tham gia bang chiến trong tháng ${deleteGvgMonth}.`,
        confirmLabel: 'Đã hiểu',
      });
    } finally {
      setDeletingGvgMonth(false);
    }
  };

  return (
    <main className="flex-1 space-y-5 overflow-auto p-5 custom-scrollbar lg:p-6">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-3xl font-black text-white">Điểm danh Bang Chiến</h1>
          <p className="mt-1 text-sm text-slate-400">Theo dõi phiên điểm danh từ web, Discord bot và lịch sử gần đây.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[360px_1fr]">
        <section className="app-surface h-fit rounded-2xl p-4">
          <div className="mb-4">
            <h2 className="text-lg font-black text-white">Quản lý điểm danh</h2>
            <p className="mt-1 text-sm text-slate-500">Cấu hình kênh, mở phiên và điều khiển phiên đang chạy.</p>
          </div>
          <div className="mb-4 rounded-2xl border border-slate-800/80 bg-slate-950/35 p-3">
            <div className="mb-2 flex items-center gap-2 text-xs font-black uppercase tracking-wider text-slate-500">
              <Hash size={14} />
              Kênh điểm danh
            </div>
            <div className="mb-2 rounded-xl border border-sky-500/20 bg-sky-500/10 px-3 py-2 text-sm font-bold text-sky-100">
              {attendance.config ? (attendance.config.discordChannelName || attendance.config.discordChannelId) : 'Chưa cấu hình'}
            </div>
            <div className="flex gap-2">
              <input
                value={channelId}
                onChange={event => setChannelId(event.target.value)}
                className="min-w-0 flex-1 rounded-xl border border-slate-700 bg-slate-950/60 px-3 py-2 text-sm text-slate-100 outline-none transition-colors focus:border-sky-500"
                placeholder="Discord channel id"
              />
              <button
                onClick={() => onSetChannel(channelId)}
                disabled={actionLoading || !channelId.trim()}
                className="app-button-primary inline-flex items-center justify-center gap-2 rounded-xl px-3 py-2 text-sm font-bold"
              >
                <Save size={16} />
              </button>
            </div>
          </div>
          <div className="grid grid-cols-1 gap-2">
            <button
              onClick={() => setSetupModal('open')}
              disabled={actionLoading || !!attendance.activeSession || !attendance.config}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-emerald-400/35 bg-emerald-950/80 px-4 py-2 text-sm font-bold text-emerald-100 shadow-lg shadow-emerald-950/30 transition-all hover:border-emerald-300/60 hover:bg-emerald-900/90 hover:shadow-emerald-500/10 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Play size={16} />
              Mở điểm danh
            </button>
            <button
              onClick={onCloseSession}
              disabled={actionLoading || !attendance.activeSession}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-red-400/35 bg-red-950/80 px-4 py-2 text-sm font-bold text-red-100 shadow-lg shadow-red-950/30 transition-all hover:border-red-300/60 hover:bg-red-900/90 hover:shadow-red-500/10 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Square size={16} />
              Đóng điểm danh
            </button>
          </div>

          <div className="mt-4 rounded-2xl border border-violet-400/20 bg-violet-500/10 p-3">
            <div className="mb-3 flex items-start gap-3">
              <ShieldCheck size={18} className="mt-0.5 shrink-0 text-violet-300" />
              <div>
                <h3 className="text-sm font-black text-white">Chốt tham gia bang chiến</h3>
                <p className="mt-1 text-xs text-slate-400">Ghi nhận thành viên thực sự tham gia sau trận; không tự động lấy từ vote điểm danh.</p>
              </div>
            </div>
            <button
              onClick={() => setIsGvgModalOpen(true)}
              className="app-button-primary inline-flex w-full items-center justify-center gap-2 rounded-xl px-4 py-2 text-sm font-bold"
            >
              <ShieldCheck size={16} />
              Chốt tham gia
            </button>
            <div className="mt-3 rounded-xl border border-red-400/20 bg-red-500/10 p-2.5">
              <div className="mb-2 flex items-center gap-2 text-[10px] font-black uppercase tracking-wider text-red-200">
                <Trash2 size={12} />
                Xoá dữ liệu theo tháng
              </div>
              <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
                <input
                  type="month"
                  value={deleteGvgMonth}
                  onChange={event => {
                    if (event.target.value) setDeleteGvgMonth(event.target.value);
                  }}
                  className="w-full rounded-lg border border-red-400/25 bg-slate-950/60 px-2.5 py-1.5 text-xs font-bold text-red-100 outline-none transition-colors focus:border-red-300/70"
                />
                <button
                  type="button"
                  onClick={() => void deleteGvgParticipationMonth()}
                  disabled={deletingGvgMonth || !deleteGvgMonth}
                  className="app-button-danger inline-flex items-center justify-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-black disabled:opacity-50"
                >
                  <Trash2 size={13} />
                  {deletingGvgMonth ? 'Đang xoá...' : 'Xoá'}
                </button>
              </div>
              <p className="mt-2 text-[11px] font-bold leading-4 text-red-100/70">Chỉ xoá dữ liệu chốt tham gia bang chiến của tháng đã chọn.</p>
            </div>
          </div>
        </section>

        <div className="space-y-4">
          {attendance.activeSession ? (
            <SessionSummaryCard session={attendance.activeSession} channelName={attendance.config?.discordChannelName} onOpenDetails={() => setActiveDetailsOpen(true)} />
          ) : (
            <div className="rounded-2xl border border-dashed border-slate-700 bg-slate-900/25 px-6 py-8 text-center">
              <ClipboardCheck size={38} className="mx-auto mb-3 text-slate-500" />
              <h2 className="text-xl font-black text-white">Chưa có phiên điểm danh đang mở</h2>
              <p className="mt-2 text-sm text-slate-400">Mở phiên mới từ web hoặc dùng lệnh Discord /diemdanhbangchien open.</p>
            </div>
          )}

          <section className="app-surface rounded-2xl p-4">
            <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-2">
                <CalendarDays size={16} className="text-slate-400" />
                <h3 className="text-sm font-black text-slate-100">Lịch sử gần đây</h3>
              </div>
              <div className="flex items-center gap-2">
                {historyLoading ? <span className="text-xs font-bold text-slate-500">Đang tải...</span> : null}
                {historyList.length > 5 || historyHasMore ? (
                  <button onClick={() => setHistoryModalOpen(true)} className="app-button-secondary rounded-xl px-3 py-1.5 text-xs font-black">
                    Xem tất cả
                  </button>
                ) : null}
              </div>
            </div>
            {historyError ? (
              <div className="mb-3 rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-200">
                {historyError}
              </div>
            ) : null}
            {deleteError ? (
              <div className="mb-3 rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-200">
                {deleteError}
              </div>
            ) : null}
            {historyList.length ? (
              <div className="mb-3 flex flex-col gap-2 rounded-2xl border border-slate-800/80 bg-slate-950/35 p-2 sm:flex-row sm:items-center sm:justify-between">
                <label className="inline-flex w-fit items-center gap-2 rounded-xl px-2 py-1 text-xs font-black text-slate-300">
                  <input
                    type="checkbox"
                    checked={allVisibleHistorySelected}
                    onChange={toggleSelectAllHistory}
                    disabled={deleteActionDisabled || !historyListIds.length}
                    className="h-4 w-4 accent-sky-500"
                  />
                  Chọn tất cả
                </label>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs font-bold text-slate-500">Đã chọn {selectedHistoryCount}</span>
                  {selectedHistoryCount ? (
                    <button onClick={clearHistorySelection} disabled={deleteActionDisabled} className="app-button-secondary rounded-xl px-3 py-1.5 text-xs font-black">
                      Bỏ chọn
                    </button>
                  ) : null}
                  <button onClick={() => void deleteSelectedHistorySessions()} disabled={deleteActionDisabled || !selectedHistoryCount} className="app-button-danger rounded-xl px-3 py-1.5 text-xs font-black">
                    Xóa đã chọn
                  </button>
                  <button onClick={() => void deleteAllHistorySessions()} disabled={deleteActionDisabled || !historyListIds.length} className="app-button-danger rounded-xl px-3 py-1.5 text-xs font-black">
                    Xóa tất cả
                  </button>
                </div>
              </div>
            ) : null}
            {recentHistoryList.length ? (
              <div className="space-y-2">
                {recentHistoryList.map(session => (
                  <div key={session.id} className="flex items-center gap-2 rounded-2xl border border-slate-800/80 bg-slate-950/35 p-2 transition-colors hover:bg-slate-900/60">
                    <input
                      type="checkbox"
                      checked={selectedHistoryIds.has(session.id)}
                      onChange={() => toggleHistorySelection(session.id)}
                      disabled={deleteActionDisabled}
                      className="h-4 w-4 shrink-0 accent-sky-500"
                      aria-label={`Chọn lịch sử ${session.headerText || 'Điểm danh Bang Chiến'}`}
                    />
                    <button
                      onClick={() => openHistorySession(session.id)}
                      className="flex min-w-0 flex-1 flex-col gap-2 rounded-xl px-2 py-1 text-left sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div className="min-w-0">
                        <div className="truncate font-black text-slate-100">{session.headerText || 'Điểm danh Bang Chiến'}</div>
                        <div className="text-xs text-slate-500">{formatDate(session.openedAt)} - {formatDate(session.closedAt)}</div>
                      </div>
                      <div className="flex shrink-0 flex-wrap gap-1.5">
                        <SummaryPill choice="GO" count={session.summary.go} />
                        <SummaryPill choice="MAYBE" count={session.summary.maybe} />
                        <SummaryPill choice="NOGO" count={session.summary.nogo} />
                      </div>
                    </button>
                    <button
                      onClick={() => void deleteHistorySession(session)}
                      disabled={deletingSessionId === session.id || bulkDeleting}
                      className="app-button-danger rounded-xl p-2"
                      title="Xóa lịch sử điểm danh"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-xl border border-dashed border-slate-700/70 px-3 py-6 text-center text-sm text-slate-500">
                Chưa có lịch sử điểm danh.
              </div>
            )}
          </section>
        </div>
      </div>


      {historyModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-3 backdrop-blur-sm lg:p-6" onClick={() => setHistoryModalOpen(false)}>
          <div className="max-h-[92vh] w-full max-w-5xl overflow-y-auto rounded-2xl border border-slate-700 bg-slate-950 shadow-2xl custom-scrollbar" onClick={event => event.stopPropagation()}>
            <div className="sticky top-0 z-10 flex items-center justify-between gap-3 border-b border-slate-800 bg-slate-950/95 px-6 py-5 backdrop-blur">
              <div>
                <h2 className="text-xl font-black text-white">Tất cả lịch sử điểm danh</h2>
                <p className="text-sm text-slate-500">Hiển thị theo từng trang, chỉ tải thêm khi cần.</p>
              </div>
              <button onClick={() => setHistoryModalOpen(false)} className="app-button-secondary rounded-xl p-2">
                <X size={18} />
              </button>
            </div>
            <div className="space-y-3 p-5">
              {historyList.length ? (
                <div className="flex flex-col gap-2 rounded-2xl border border-slate-800/80 bg-slate-950/35 p-2 sm:flex-row sm:items-center sm:justify-between">
                  <label className="inline-flex w-fit items-center gap-2 rounded-xl px-2 py-1 text-xs font-black text-slate-300">
                    <input
                      type="checkbox"
                      checked={allVisibleHistorySelected}
                      onChange={toggleSelectAllHistory}
                      disabled={deleteActionDisabled || !historyListIds.length}
                      className="h-4 w-4 accent-sky-500"
                    />
                    Chọn tất cả
                  </label>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs font-bold text-slate-500">Đã chọn {selectedHistoryCount}</span>
                    {selectedHistoryCount ? (
                      <button onClick={clearHistorySelection} disabled={deleteActionDisabled} className="app-button-secondary rounded-xl px-3 py-1.5 text-xs font-black">
                        Bỏ chọn
                      </button>
                    ) : null}
                    <button onClick={() => void deleteSelectedHistorySessions()} disabled={deleteActionDisabled || !selectedHistoryCount} className="app-button-danger rounded-xl px-3 py-1.5 text-xs font-black">
                      Xóa đã chọn
                    </button>
                    <button onClick={() => void deleteAllHistorySessions()} disabled={deleteActionDisabled || !historyListIds.length} className="app-button-danger rounded-xl px-3 py-1.5 text-xs font-black">
                      Xóa tất cả
                    </button>
                  </div>
                </div>
              ) : null}
              {historyList.length ? historyList.map(session => (
                <div key={session.id} className="flex items-center gap-2 rounded-2xl border border-slate-800/80 bg-slate-950/35 p-2 transition-colors hover:bg-slate-900/60">
                  <input
                    type="checkbox"
                    checked={selectedHistoryIds.has(session.id)}
                    onChange={() => toggleHistorySelection(session.id)}
                    disabled={deleteActionDisabled}
                    className="h-4 w-4 shrink-0 accent-sky-500"
                    aria-label={`Chọn lịch sử ${session.headerText || 'Điểm danh Bang Chiến'}`}
                  />
                  <button
                    onClick={() => openHistorySession(session.id)}
                    className="flex min-w-0 flex-1 flex-col gap-2 rounded-xl px-2 py-1 text-left sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="min-w-0">
                      <div className="truncate font-black text-slate-100">{session.headerText || 'Điểm danh Bang Chiến'}</div>
                      <div className="text-xs text-slate-500">{formatDate(session.openedAt)} - {formatDate(session.closedAt)}</div>
                    </div>
                    <div className="flex shrink-0 flex-wrap gap-1.5">
                      <SummaryPill choice="GO" count={session.summary.go} />
                      <SummaryPill choice="MAYBE" count={session.summary.maybe} />
                      <SummaryPill choice="NOGO" count={session.summary.nogo} />
                    </div>
                  </button>
                  <button
                    onClick={() => void deleteHistorySession(session)}
                    disabled={deletingSessionId === session.id || bulkDeleting}
                    className="app-button-danger rounded-xl p-2"
                    title="Xóa lịch sử điểm danh"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              )) : (
                <div className="rounded-xl border border-dashed border-slate-700/70 px-3 py-8 text-center text-sm text-slate-500">
                  Chưa có lịch sử điểm danh.
                </div>
              )}
              {historyHasMore ? (
                <button
                  onClick={loadMoreHistory}
                  disabled={historyLoading}
                  className="app-button-secondary w-full rounded-xl px-4 py-2 text-sm font-black"
                >
                  {historyLoading ? 'Đang tải...' : 'Tải thêm lịch sử'}
                </button>
              ) : null}
            </div>
          </div>
        </div>
      )}

      {activeDetailsOpen && attendance.activeSession && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-3 backdrop-blur-sm lg:p-6" onClick={() => setActiveDetailsOpen(false)}>
          <div className="max-h-[96vh] w-full max-w-[96vw] overflow-y-auto rounded-2xl border border-slate-700 bg-slate-950 shadow-2xl custom-scrollbar" onClick={event => event.stopPropagation()}>
            <div className="sticky top-0 z-10 flex items-center justify-between gap-3 border-b border-slate-800 bg-slate-950/95 px-6 py-5 backdrop-blur">
              <div className="min-w-0">
                <h2 className="truncate text-xl font-black text-white">{attendance.activeSession.headerText || 'Điểm danh Bang Chiến'}</h2>
                <p className="text-sm text-slate-500">Cơ cấu phái, bộ lọc và danh sách điểm danh đang mở.</p>
              </div>
              <button onClick={() => setActiveDetailsOpen(false)} className="app-button-secondary rounded-xl p-2">
                <X size={18} />
              </button>
            </div>
            <div className="p-5 lg:p-6">
              <SessionDetailsPanel session={attendance.activeSession} members={members} />
            </div>
          </div>
        </div>
      )}

      {isGvgModalOpen && (
        <GvgParticipationModal
          members={members}
          attendanceSessions={gvgParticipationSourceSessions}
          onClose={() => setIsGvgModalOpen(false)}
          onSaved={() => setIsGvgModalOpen(false)}
        />
      )}

      {setupModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm" onClick={() => setSetupModal(null)}>
          <div className="w-full max-w-lg rounded-2xl border border-slate-700 bg-slate-950 shadow-2xl" onClick={event => event.stopPropagation()}>
            <div className="flex items-center justify-between gap-3 border-b border-slate-800 px-5 py-4">
              <div>
                <h2 className="text-xl font-black text-white">Mở phiên điểm danh</h2>
                <p className="text-sm text-slate-500">Nhập tiêu đề hiển thị trên phiên điểm danh mới.</p>
              </div>
              <button onClick={() => setSetupModal(null)} className="app-button-secondary rounded-xl p-2">
                <X size={18} />
              </button>
            </div>
            <div className="space-y-4 p-5">
              <div className="space-y-2">
                <label className="text-xs font-black uppercase tracking-wider text-slate-500">Tiêu đề phiên</label>
                <input
                  value={headerText}
                  onChange={event => setHeaderText(event.target.value)}
                  className="w-full rounded-xl border border-slate-700 bg-slate-950/60 px-3 py-2 text-sm text-slate-100 outline-none transition-colors focus:border-sky-500"
                  placeholder="Điểm danh Bang Chiến"
                  autoFocus
                />
              </div>
              <div className="flex justify-end gap-2">
                <button onClick={() => setSetupModal(null)} className="app-button-secondary rounded-xl px-4 py-2 text-sm font-bold">
                  Hủy
                </button>
                <button
                  onClick={() => {
                    onOpenSession(headerText);
                    setSetupModal(null);
                  }}
                  disabled={actionLoading || !!attendance.activeSession || !attendance.config}
                  className="app-button-primary inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-bold"
                >
                  <Play size={16} />
                  Mở phiên
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {(selectedHistorySession || selectedHistoryLoading || selectedHistoryError) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-3 backdrop-blur-sm lg:p-6" onClick={() => setSelectedHistorySession(null)}>
          <div className="max-h-[96vh] w-full max-w-[96vw] overflow-y-auto rounded-2xl border border-slate-700 bg-slate-950 shadow-2xl custom-scrollbar" onClick={event => event.stopPropagation()}>
            <div className="sticky top-0 z-10 flex items-center justify-between gap-3 border-b border-slate-800 bg-slate-950/95 px-6 py-5 backdrop-blur">
              <div>
                <h2 className="text-xl font-black text-white">Chi tiết lịch sử điểm danh</h2>
                <p className="text-sm text-slate-500">Xem lại kết quả và danh sách vote của phiên đã chọn.</p>
              </div>
              <button
                onClick={() => setSelectedHistorySession(null)}
                className="app-button-secondary rounded-xl p-2"
              >
                <X size={18} />
              </button>
            </div>
            <div className="p-5 lg:p-6">
              {selectedHistoryLoading ? (
                <div className="rounded-xl border border-slate-800 bg-slate-900/60 px-4 py-10 text-center text-sm text-slate-400">
                  Đang tải chi tiết...
                </div>
              ) : selectedHistoryError ? (
                <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-10 text-center text-sm text-red-200">
                  {selectedHistoryError}
                </div>
              ) : selectedHistorySession ? (
                <SessionDetailsPanel session={selectedHistorySession} members={members} />
              ) : null}
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
