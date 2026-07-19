import React, { useMemo, useState } from 'react';
import { CalendarDays, CheckCircle2, ClipboardCheck, Hash, Play, RefreshCw, Save, Search, ShieldCheck, Square, Trash2, Users, X, XCircle } from 'lucide-react';
import { CLASSES, CLASS_COLORS, CLASS_ICONS } from '../../constants.ts';
import { cn } from '../../lib/utils.ts';
import { deleteAttendanceHistorySession, getAttendanceHistory, getAttendanceSession, getGvgParticipationSessions } from '../../services/discordApi.ts';
import type { GvgParticipationSession } from '../../services/discordApi.ts';
import type { AttendanceChoice, AttendanceSession, AttendanceState, AttendanceType, AttendanceVote, RawAttendanceChoice } from '../../shared/types/auth.ts';
import type { Member } from '../../shared/types/member.ts';
import type { ClassType } from '../../types.ts';
import { useSystemDialog } from '../app/SystemDialogProvider.tsx';
import { AppMonthPicker } from '../../components/ui/AppMonthPicker.tsx';
import { GvgParticipationModal } from './GvgParticipationModal.tsx';

const choiceMeta: Record<AttendanceChoice, { label: string; shortLabel: string; icon: React.ReactNode; className: string }> = {
  GO: { label: 'Tham gia', shortLabel: 'Tham gia', icon: <CheckCircle2 size={16} />, className: 'text-emerald-300 bg-emerald-500/10 border-emerald-500/25' },
  NOGO: { label: 'Không tham gia', shortLabel: 'Không tham gia', icon: <XCircle size={16} />, className: 'text-red-300 bg-red-500/10 border-red-500/25' },
};

function formatDate(value: string | null) {
  if (!value) return '-';
  return new Date(value).toLocaleString('vi-VN');
}

function getCurrentMonthKey(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

function getAttendanceLabel(type: AttendanceType) {
  return type === 'SCRIM' ? 'Scrim' : 'Bang Chiến';
}

function getAttendanceTitle(session: AttendanceSession) {
  return session.headerText || `Điểm danh ${getAttendanceLabel(session.type)}`;
}

function isCurrentAttendanceChoice(choice: RawAttendanceChoice): choice is AttendanceChoice {
  return choice === 'GO' || choice === 'NOGO';
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
    <section className="rounded-3xl border border-slate-800/80 bg-slate-950/35 p-3.5">
      <div className="mb-3 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-sm font-black text-slate-100">Cơ cấu phái</h3>
          <p className="text-xs text-slate-500">Tổng hợp theo phản hồi hiện có</p>
        </div>
        <span className="w-fit rounded-full border border-slate-700/80 bg-slate-900/70 px-2.5 py-1 text-[11px] font-black text-slate-300">
          {votes.length} phản hồi
        </span>
      </div>
      {classCounts.length ? (
        <div className="space-y-2">
          {classCounts.map(([classType, count]) => {
            const color = getClassColor(classType);
            const width = Math.max((count / maxCount) * 100, 10);
            return (
              <div key={classType} className="rounded-2xl border border-slate-800/70 bg-slate-900/45 px-3 py-2.5">
                <div className="flex items-center gap-3">
                  <div className="min-w-0 flex-[0_0_140px] sm:flex-[0_0_160px]">
                    <ClassBadge classType={classType} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="h-1.5 overflow-hidden rounded-full bg-slate-800/80">
                      <div className="h-full rounded-full" style={{ width: `${width}%`, backgroundColor: color }} />
                    </div>
                  </div>
                  <span className="shrink-0 text-sm font-black tabular-nums text-slate-200">{count}</span>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-slate-700/70 px-3 py-6 text-center text-sm text-slate-500">
          Chưa có vote nào.
        </div>
      )}
    </section>
  );
}

function HistoryMetricCard({
  label,
  value,
  helper,
  className,
}: {
  label: string;
  value: string | number;
  helper?: string;
  className?: string;
}) {
  return (
    <div className={cn('rounded-3xl border px-4 py-3 shadow-lg shadow-slate-950/15', className || 'border-slate-800/80 bg-slate-950/45')}>
      <div className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-500">{label}</div>
      <div className="mt-2 text-2xl font-black tracking-tight text-white tabular-nums">{value}</div>
      {helper ? <div className="mt-1 text-xs font-bold text-slate-400">{helper}</div> : null}
    </div>
  );
}

function SessionResponseSummary({
  goCount,
  nogoCount,
  respondedCount,
  totalActiveMembers,
  notVotedCount,
}: {
  goCount: number;
  nogoCount: number;
  respondedCount: number;
  totalActiveMembers: number;
  notVotedCount: number;
}) {
  const progressPercent = totalActiveMembers ? Math.min(100, Math.round((respondedCount / totalActiveMembers) * 100)) : 0;

  return (
    <section className="rounded-[28px] border border-sky-400/20 bg-gradient-to-br from-sky-500/10 via-slate-950/85 to-indigo-500/10 p-4 shadow-2xl shadow-slate-950/25">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div className="min-w-0 xl:max-w-[420px]">
          <div className="flex flex-wrap items-center gap-2 text-[11px] font-black uppercase tracking-[0.18em] text-sky-200/80">
            <ClipboardCheck size={14} />
            Snapshot phiên đã đóng
          </div>
          <h3 className="mt-3 text-lg font-black text-white sm:text-xl">Tình hình phản hồi của phiên này</h3>
          <p className="mt-1 text-sm leading-6 text-slate-400">
            Xem nhanh số người tham gia, không tham gia và những thành viên active vẫn chưa phản hồi để review lại phiên attendance đã đóng.
          </p>
          <div className="mt-4">
            <div className="mb-2 flex items-center justify-between gap-3 text-xs font-bold text-slate-400">
              <span>{respondedCount}/{totalActiveMembers} thành viên đã phản hồi</span>
              <span className="text-slate-200 tabular-nums">{progressPercent}%</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-slate-800/80">
              <div className="h-full rounded-full bg-gradient-to-r from-sky-400 via-cyan-300 to-emerald-400 transition-all" style={{ width: `${progressPercent}%` }} />
            </div>
          </div>
        </div>
        <div className="grid flex-1 grid-cols-1 gap-3 sm:grid-cols-2 2xl:grid-cols-4">
          <HistoryMetricCard label="Tham gia" value={goCount} helper="Đã chọn GO" className="border-emerald-500/25 bg-emerald-500/10" />
          <HistoryMetricCard label="Không tham gia" value={nogoCount} helper="Đã chọn NOGO" className="border-red-500/25 bg-red-500/10" />
          <HistoryMetricCard label="Chưa điểm danh" value={notVotedCount} helper="Active chưa phản hồi" className="border-amber-500/25 bg-amber-500/10" />
          <HistoryMetricCard label="Tổng active" value={totalActiveMembers} helper="Dùng để tính tiến độ" className="border-slate-700/80 bg-slate-900/70" />
        </div>
      </div>
    </section>
  );
}

type ReviewStatus = AttendanceChoice | 'NOT_VOTED';

interface MemberReviewRow {
  member: Member;
  vote: AttendanceVote | null;
  status: ReviewStatus;
  name: string;
  classType: string;
  discordName: string;
}

function SessionDetailsHeader({ session }: { session: AttendanceSession }) {
  return (
    <section className="rounded-3xl border border-slate-800/80 bg-slate-950/40 px-4 py-4 shadow-lg shadow-slate-950/15">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-full border border-slate-700/80 bg-slate-900/80 px-2.5 py-1 text-[11px] font-black uppercase tracking-[0.18em] text-slate-300">Lịch sử attendance</span>
          <span className="rounded-full border border-slate-700/80 bg-slate-950/80 px-2.5 py-1 text-[11px] font-black uppercase tracking-[0.18em] text-slate-400">{session.status === 'CLOSED' ? 'Đã đóng' : session.status}</span>
        </div>
        <h3 className="mt-3 text-xl font-black text-white sm:text-2xl">{getAttendanceTitle(session)}</h3>
        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs font-bold text-slate-400">
          <span>Mở: {formatDate(session.openedAt)}</span>
          <span>Đóng: {formatDate(session.closedAt)}</span>
          <span>Cập nhật cuối: {formatDate(session.lastVoteAt || session.updatedAt)}</span>
        </div>
      </div>
    </section>
  );
}

function SessionDetailsToolbar({
  searchTerm,
  onSearchChange,
  statusFilter,
  onStatusFilterChange,
  statusCounts,
  classFilter,
  onClassFilterChange,
  classOptions,
}: {
  searchTerm: string;
  onSearchChange: (value: string) => void;
  statusFilter: ReviewStatus | 'ALL';
  onStatusFilterChange: (value: ReviewStatus | 'ALL') => void;
  statusCounts: Record<ReviewStatus | 'ALL', number>;
  classFilter: string;
  onClassFilterChange: (value: string) => void;
  classOptions: string[];
}) {
  const filters: Array<{ value: ReviewStatus | 'ALL'; label: string; className: string }> = [
    { value: 'ALL', label: 'Tất cả', className: 'border-slate-700 bg-slate-900/70 text-slate-300' },
    { value: 'GO', label: 'Tham gia', className: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-200' },
    { value: 'NOGO', label: 'Không tham gia', className: 'border-red-500/30 bg-red-500/10 text-red-200' },
    { value: 'NOT_VOTED', label: 'Chưa phản hồi', className: 'border-amber-500/30 bg-amber-500/10 text-amber-200' },
  ];

  return (
    <section className="rounded-3xl border border-slate-800/80 bg-slate-950/45 p-3 shadow-lg shadow-slate-950/15">
      <div className="flex flex-wrap gap-2">
        {filters.map(filter => (
          <button
            key={filter.value}
            type="button"
            onClick={() => onStatusFilterChange(filter.value)}
            aria-pressed={statusFilter === filter.value}
            className={cn(
              'inline-flex min-h-9 items-center gap-1.5 rounded-xl border px-3 text-xs font-black transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-400/70',
              filter.className,
              statusFilter === filter.value ? 'ring-1 ring-current' : 'opacity-75 hover:opacity-100',
            )}
          >
            {filter.label} <span className="tabular-nums">{statusCounts[filter.value]}</span>
          </button>
        ))}
      </div>
      <div className="mt-3 flex flex-col gap-2 sm:flex-row">
        <div className="relative min-w-0 flex-1">
          <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            value={searchTerm}
            onChange={event => onSearchChange(event.target.value)}
            className="w-full rounded-2xl border border-slate-700/80 bg-slate-950/75 py-2.5 pl-9 pr-3 text-sm text-slate-100 outline-none transition-colors placeholder:text-slate-600 focus:border-sky-400/70"
            placeholder="Tìm theo tên ingame hoặc Discord..."
          />
        </div>
        <select
          value={classFilter}
          onChange={event => onClassFilterChange(event.target.value)}
          aria-label="Lọc theo phái"
          className="rounded-2xl border border-slate-700/80 bg-slate-950/75 px-3 py-2.5 text-sm font-bold text-slate-200 outline-none transition-colors focus:border-sky-400/70 sm:w-52"
        >
          <option value="ALL">Tất cả phái</option>
          {classOptions.map(classType => <option key={classType} value={classType}>{classType}</option>)}
        </select>
      </div>
    </section>
  );
}

function MemberReviewList({ rows, totalRows }: { rows: MemberReviewRow[]; totalRows: number }) {
  return (
    <section className="rounded-3xl border border-slate-800/80 bg-slate-950/45 p-4 shadow-lg shadow-slate-950/15">
      <div className="mb-3 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-sm font-black text-slate-100">Danh sách thành viên</h3>
          <p className="text-xs text-slate-500">Hiển thị {rows.length}/{totalRows} thành viên active phù hợp với bộ lọc</p>
        </div>
        <span className="w-fit rounded-full border border-slate-700/80 bg-slate-900/80 px-2.5 py-1 text-xs font-black text-slate-300">{rows.length} mục</span>
      </div>
      {rows.length ? (
        <div className="max-h-[560px] space-y-2 overflow-y-auto pr-1 custom-scrollbar">
          {rows.map(row => (
            <article key={row.member.id} className="rounded-2xl border border-slate-800/80 bg-slate-900/55 px-3 py-3 transition-colors hover:border-slate-700/80 hover:bg-slate-900/80">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <div className="truncate text-sm font-black text-slate-100">{row.name}</div>
                    <ClassBadge classType={row.classType} />
                  </div>
                  <div className="mt-1 truncate text-xs font-medium text-slate-500">{row.discordName}</div>
                </div>
                <div className="flex shrink-0 flex-wrap items-center gap-2 sm:justify-end">
                  {row.status === 'NOT_VOTED' ? (
                    <span className="rounded-full border border-amber-500/25 bg-amber-500/10 px-2.5 py-1 text-xs font-black text-amber-200">Chưa phản hồi</span>
                  ) : <VoteChoiceBadge choice={row.status} />}
                  <span className="rounded-full border border-slate-700/80 bg-slate-950/80 px-2.5 py-1 text-[11px] font-bold text-slate-400">{row.vote ? formatDate(row.vote.updatedAt) : '—'}</span>
                </div>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-slate-700/70 px-3 py-8 text-center text-sm text-slate-500">Không có thành viên phù hợp với bộ lọc.</div>
      )}
    </section>
  );
}

function AttendanceEmptyState({ title, description }: { title: string; description: string }) {
  return (
    <div className="rounded-3xl border border-dashed border-slate-700/70 bg-slate-950/35 px-4 py-8 text-center">
      <Users size={28} className="mx-auto mb-3 text-slate-500" />
      <h3 className="text-base font-black text-white">{title}</h3>
      <p className="mt-2 text-sm text-slate-400">{description}</p>
    </div>
  );
}

function SessionDetailsPanel({ session, members }: { session: AttendanceSession; members: Member[] }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<ReviewStatus | 'ALL'>('ALL');
  const [classFilter, setClassFilter] = useState('ALL');
  const activeMembers = useMemo(() => members.filter(member => member.active !== false), [members]);
  const currentVotes = useMemo(
    () => session.votes.filter((vote): vote is AttendanceVote & { choice: AttendanceChoice } => isCurrentAttendanceChoice(vote.choice)),
    [session.votes],
  );
  const hasLegacyVotes = currentVotes.length !== session.votes.length;
  const reviewRows = useMemo(() => {
    const votesByMemberId = new Map<string, AttendanceVote & { choice: AttendanceChoice }>(currentVotes.map(vote => [vote.memberId, vote]));
    return activeMembers.map(member => {
      const vote = votesByMemberId.get(member.id) || null;
      return {
        member,
        vote,
        status: vote?.choice || 'NOT_VOTED',
        name: vote ? getVoteName(vote) : getMemberName(member),
        classType: vote ? getVoteClass(vote) : member.classType,
        discordName: vote?.member.username || member.discordUsername || member.name,
      } satisfies MemberReviewRow;
    }).sort((a, b) => a.name.localeCompare(b.name, 'vi'));
  }, [activeMembers, currentVotes]);
  const statusCounts = useMemo(() => ({
    ALL: reviewRows.length,
    GO: reviewRows.filter(row => row.status === 'GO').length,
    NOGO: reviewRows.filter(row => row.status === 'NOGO').length,
    NOT_VOTED: reviewRows.filter(row => row.status === 'NOT_VOTED').length,
  }), [reviewRows]);
  const classOptions = useMemo(() => sortClassEntries([...new Set(reviewRows.map(row => row.classType))].map(classType => [classType, 0] as [string, number])).map(([classType]) => classType), [reviewRows]);
  const filteredRows = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    return reviewRows.filter(row => {
      if (statusFilter !== 'ALL' && row.status !== statusFilter) return false;
      if (classFilter !== 'ALL' && row.classType !== classFilter) return false;
      if (!query) return true;
      return [row.name, row.discordName, row.member.discordDisplayName, row.member.ingameName]
        .filter(Boolean)
        .some(value => value!.toLowerCase().includes(query));
    });
  }, [classFilter, reviewRows, searchTerm, statusFilter]);

  return (
    <div className="space-y-4">
      <SessionDetailsHeader session={session} />
      <SessionResponseSummary
        goCount={statusCounts.GO}
        nogoCount={statusCounts.NOGO}
        respondedCount={currentVotes.length}
        totalActiveMembers={activeMembers.length}
        notVotedCount={statusCounts.NOT_VOTED}
      />
      {hasLegacyVotes ? (
        <div className="rounded-2xl border border-slate-700/80 bg-slate-950/45 px-3 py-2 text-xs font-medium text-slate-400">
          Phiên này có phản hồi cũ không còn được tính trong tổng hợp hiện tại; các thành viên liên quan được xếp vào nhóm chưa phản hồi.
        </div>
      ) : null}
      <SessionDetailsToolbar
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        statusFilter={statusFilter}
        onStatusFilterChange={setStatusFilter}
        statusCounts={statusCounts}
        classFilter={classFilter}
        onClassFilterChange={setClassFilter}
        classOptions={classOptions}
      />
      {reviewRows.length ? <MemberReviewList rows={filteredRows} totalRows={reviewRows.length} /> : <AttendanceEmptyState title="Phiên này chưa có dữ liệu hiển thị" description="Không có thành viên active nào cần review trong lịch sử attendance này." />}
      {currentVotes.length ? (
        <details className="group rounded-3xl border border-slate-800/80 bg-slate-950/45 shadow-lg shadow-slate-950/15">
          <summary className="cursor-pointer list-none px-4 py-3 text-sm font-black text-slate-200 marker:hidden focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-sky-400/70">Cơ cấu phái <span className="ml-1 text-xs font-bold text-slate-500">({currentVotes.length} phản hồi)</span></summary>
          <div className="border-t border-slate-800/80 p-3"><ClassSummary votes={currentVotes} /></div>
        </details>
      ) : null}
    </div>
  );
}

function VoteChoiceBadge({ choice }: { choice: RawAttendanceChoice }) {
  if (!isCurrentAttendanceChoice(choice)) return null;
  const meta = choiceMeta[choice];
  return (
    <span className={cn('inline-flex items-center gap-1.5 rounded-full border px-2 py-1 text-xs font-black', meta.className)}>
      {meta.icon}
      {meta.label}
    </span>
  );
}

function getGvgBattleCounts(session: GvgParticipationSession) {
  return {
    battleOne: session.entries.filter(entry => entry.battleNumbers.includes(1)).length,
    battleTwo: session.entries.filter(entry => entry.battleNumbers.includes(2)).length,
  };
}

function getGvgEntryMember(entry: GvgParticipationSession['entries'][number], members: Member[]) {
  return members.find(member => member.id === entry.memberId) || null;
}

function getGvgEntryName(entry: GvgParticipationSession['entries'][number], members: Member[]) {
  const member = getGvgEntryMember(entry, members);
  return entry.snapshotIngameName || (member ? getMemberName(member) : 'Không rõ tên');
}

function getGvgEntryClass(entry: GvgParticipationSession['entries'][number], members: Member[]) {
  const member = getGvgEntryMember(entry, members);
  return entry.snapshotClassType || member?.classType || 'Unknown';
}

const GvgHistoryRow: React.FC<{ session: GvgParticipationSession; onOpen: () => void }> = ({ session, onOpen }) => {
  const { battleOne, battleTwo } = getGvgBattleCounts(session);
  return (
    <button
      type="button"
      onClick={onOpen}
      className="w-full rounded-xl border border-slate-800/80 bg-slate-950/35 p-2 text-left transition-colors hover:bg-slate-900/65 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-400/60"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="truncate text-xs font-black text-slate-100">Bang chiến {formatDate(session.battleDate)}</div>
          <div className="mt-1 text-[11px] font-bold text-slate-500">
            {session.battleCount} trận · {session.entries.length} thành viên · Chốt {formatDate(session.finalizedAt)}
          </div>
        </div>
        {session.battleCount === 2 ? (
          <span className="shrink-0 rounded-full border border-sky-400/25 bg-sky-500/10 px-2 py-0.5 text-[10px] font-black text-sky-200">
            T1 {battleOne} · T2 {battleTwo}
          </span>
        ) : null}
      </div>
      {session.note ? <div className="mt-1 truncate text-[11px] font-bold text-amber-200/85">{session.note}</div> : null}
    </button>
  );
};

function GvgHistoryDetailsPanel({ session, members }: { session: GvgParticipationSession; members: Member[] }) {
  const sortedEntries = useMemo(() => [...session.entries].sort((a, b) => {
    const classCompare = getGvgEntryClass(a, members).localeCompare(getGvgEntryClass(b, members), 'vi');
    if (classCompare !== 0) return classCompare;
    return getGvgEntryName(a, members).localeCompare(getGvgEntryName(b, members), 'vi');
  }), [members, session.entries]);
  const { battleOne, battleTwo } = getGvgBattleCounts(session);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-xl border border-slate-800/80 bg-slate-950/35 p-3">
          <div className="text-[10px] font-black uppercase tracking-wider text-slate-500">Ngày</div>
          <div className="mt-1 text-sm font-black text-slate-100">{formatDate(session.battleDate)}</div>
        </div>
        <div className="rounded-xl border border-slate-800/80 bg-slate-950/35 p-3">
          <div className="text-[10px] font-black uppercase tracking-wider text-slate-500">Số trận</div>
          <div className="mt-1 text-sm font-black text-slate-100">{session.battleCount} trận</div>
        </div>
        <div className="rounded-xl border border-slate-800/80 bg-slate-950/35 p-3">
          <div className="text-[10px] font-black uppercase tracking-wider text-slate-500">Thành viên</div>
          <div className="mt-1 text-sm font-black text-slate-100">{session.entries.length} người</div>
        </div>
        <div className="rounded-xl border border-slate-800/80 bg-slate-950/35 p-3">
          <div className="text-[10px] font-black uppercase tracking-wider text-slate-500">Chốt lúc</div>
          <div className="mt-1 text-sm font-black text-slate-100">{formatDate(session.finalizedAt)}</div>
        </div>
      </div>
      {session.battleCount === 2 ? (
        <div className="flex flex-wrap gap-2">
          <span className="rounded-full border border-sky-400/25 bg-sky-500/10 px-3 py-1 text-xs font-black text-sky-200">T1: {battleOne}</span>
          <span className="rounded-full border border-indigo-400/25 bg-indigo-500/10 px-3 py-1 text-xs font-black text-indigo-200">T2: {battleTwo}</span>
        </div>
      ) : null}
      <section className="rounded-2xl border border-slate-800/80 bg-slate-950/35 p-3">
        <h3 className="text-sm font-black text-slate-100">Ghi chú</h3>
        <p className="mt-2 whitespace-pre-wrap text-sm font-medium leading-6 text-slate-300">{session.note || 'Không có ghi chú.'}</p>
      </section>
      <section className="rounded-2xl border border-slate-800/80 bg-slate-950/35 p-3">
        <div className="mb-3 flex items-center justify-between gap-3">
          <h3 className="text-sm font-black text-slate-100">Danh sách tham gia</h3>
          <span className="rounded-full border border-slate-700 bg-slate-950/70 px-2.5 py-1 text-xs font-black text-slate-300">{sortedEntries.length} người</span>
        </div>
        {sortedEntries.length ? (
          <div className="max-h-[520px] overflow-auto rounded-xl border border-slate-800/80 custom-scrollbar">
            <table className="min-w-full divide-y divide-slate-800/80 text-left text-sm">
              <thead className="sticky top-0 z-10 bg-slate-950/95 text-xs uppercase tracking-wider text-slate-500 backdrop-blur">
                <tr>
                  <th className="w-16 px-3 py-3 font-black">#</th>
                  <th className="min-w-[220px] px-3 py-3 font-black">Thành viên</th>
                  <th className="min-w-[140px] px-3 py-3 font-black">Phái</th>
                  <th className="min-w-[140px] px-3 py-3 font-black">Trận</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 bg-slate-950/25">
                {sortedEntries.map((entry, index) => (
                  <tr key={entry.id} className="transition-colors hover:bg-slate-900/70">
                    <td className="px-3 py-3 font-mono text-xs font-black text-slate-500">#{index + 1}</td>
                    <td className="px-3 py-3 font-bold text-slate-100">{getGvgEntryName(entry, members)}</td>
                    <td className="px-3 py-3"><ClassBadge classType={getGvgEntryClass(entry, members)} /></td>
                    <td className="px-3 py-3">
                      <div className="flex flex-wrap gap-1.5">
                        {entry.battleNumbers.map(battleNumber => (
                          <span key={battleNumber} className="rounded-full border border-sky-400/25 bg-sky-500/10 px-2 py-0.5 text-xs font-black text-sky-200">T{battleNumber}</span>
                        ))}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="rounded-xl border border-dashed border-slate-700/70 px-3 py-8 text-center text-sm text-slate-500">Chưa có thành viên nào trong phiên chốt này.</div>
        )}
      </section>
    </div>
  );
}

function SessionSummaryCard({
  session,
  channelName,
  actionLoading,
  onOpenDetails,
  onRefresh,
  onClose,
}: {
  session: AttendanceSession;
  channelName?: string | null;
  actionLoading: boolean;
  onOpenDetails: () => void;
  onRefresh: () => void;
  onClose: () => void;
}) {
  const totalVotes = session.summary.go + session.summary.nogo;

  return (
    <section className="rounded-2xl border border-sky-400/20 bg-gradient-to-br from-sky-500/10 via-slate-900/75 to-indigo-500/10 p-4 shadow-lg shadow-slate-950/25 backdrop-blur-sm">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div className="min-w-0">
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <span className={cn(
              'inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-black uppercase tracking-wider',
              session.status === 'OPEN'
                ? 'border-emerald-500/25 bg-emerald-500/10 text-emerald-200'
                : 'border-slate-600/60 bg-slate-800/60 text-slate-300',
            )}>
              <ClipboardCheck size={14} />
              {session.status === 'OPEN' ? 'Đang mở' : 'Đã đóng'}
            </span>
            <span className="rounded-full border border-slate-700/80 bg-slate-950/55 px-3 py-1 text-xs font-black text-slate-300">
              {totalVotes} lượt vote
            </span>
          </div>
          <h2 className="truncate text-2xl font-black text-white">{getAttendanceTitle(session)}</h2>
          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs font-bold text-slate-400">
            <span>Mở: {formatDate(session.openedAt)}</span>
            <span>Cập nhật: {formatDate(session.lastVoteAt || session.updatedAt)}</span>
            {session.discordChannelId ? <span>Kênh: {channelName || session.discordChannelId}</span> : null}
          </div>
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-2 xl:justify-end">
          <SummaryPill choice="GO" count={session.summary.go} />
          <SummaryPill choice="NOGO" count={session.summary.nogo} />
        </div>
      </div>
      <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-slate-800/70 pt-3">
        <button type="button" onClick={onOpenDetails} className="app-button-primary inline-flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-black">
          <ClipboardCheck size={14} />
          Chi tiết
        </button>
        <button type="button" onClick={onRefresh} disabled={actionLoading} className="app-button-secondary inline-flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-black disabled:cursor-not-allowed disabled:opacity-50">
          <RefreshCw size={14} />
          Làm mới
        </button>
        <button type="button" onClick={onClose} disabled={actionLoading || session.status !== 'OPEN'} className="app-button-danger inline-flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-black disabled:cursor-not-allowed disabled:opacity-50">
          <Square size={14} />
          Đóng phiên
        </button>
      </div>
    </section>
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
  onSetChannel: (discordChannelId: string, type: AttendanceType) => void;
  onOpenSession: (headerText: string, type: AttendanceType) => void;
  onCloseSession: (type: AttendanceType) => void;
  onRefreshSession: (type: AttendanceType) => void;
  onDeleteGvgParticipationMonth: (month: string) => Promise<number>;
}) {
  const { confirm } = useSystemDialog();
  const [attendanceType, setAttendanceType] = useState<AttendanceType>('GVG');
  const selectedAttendance = attendanceType === 'GVG' ? attendance.gvg : attendance.scrim;
  const attendanceLabel = attendanceType === 'GVG' ? 'Bang Chiến' : 'Scrim';
  const [historySessions, setHistorySessions] = useState<AttendanceSession[]>(selectedAttendance.recentSessions);
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
  const [channelId, setChannelId] = useState(selectedAttendance.config?.discordChannelId || '');
  const [headerText, setHeaderText] = useState('');
  const [setupModal, setSetupModal] = useState<'open' | null>(null);
  const [managementModalOpen, setManagementModalOpen] = useState(false);
  const [isGvgModalOpen, setIsGvgModalOpen] = useState(false);
  const [gvgHistorySessions, setGvgHistorySessions] = useState<GvgParticipationSession[]>([]);
  const [gvgHistoryLoading, setGvgHistoryLoading] = useState(false);
  const [gvgHistoryError, setGvgHistoryError] = useState('');
  const [gvgHistoryHasMore, setGvgHistoryHasMore] = useState(false);
  const [gvgHistoryNextOffset, setGvgHistoryNextOffset] = useState(0);
  const [gvgHistoryModalOpen, setGvgHistoryModalOpen] = useState(false);
  const [selectedGvgHistorySession, setSelectedGvgHistorySession] = useState<GvgParticipationSession | null>(null);
  const [deleteGvgModalOpen, setDeleteGvgModalOpen] = useState(false);
  const [deleteGvgMonth, setDeleteGvgMonth] = useState(getCurrentMonthKey);
  const [deletingGvgMonth, setDeletingGvgMonth] = useState(false);
  const historyList = historySessions.filter(session => session.id !== selectedAttendance.activeSession?.id);
  const recentHistoryList = historyList.slice(0, 5);
  const gvgParticipationSourceSessions = attendance.gvg.activeSession ? [attendance.gvg.activeSession, ...attendance.gvg.recentSessions.filter(session => session.id !== attendance.gvg.activeSession?.id)] : attendance.gvg.recentSessions;
  const historyListIds = useMemo(() => historyList.map(session => session.id), [historyList]);
  const selectedHistoryCount = historyListIds.filter(id => selectedHistoryIds.has(id)).length;
  const allVisibleHistorySelected = historyListIds.length > 0 && selectedHistoryCount === historyListIds.length;
  const deleteActionDisabled = historyLoading || bulkDeleting;

  React.useEffect(() => {
    setChannelId(selectedAttendance.config?.discordChannelId || '');
  }, [selectedAttendance.config?.discordChannelId]);

  React.useEffect(() => {
    setHistorySessions(selectedAttendance.recentSessions);
    setHistoryLoading(true);
    setHistoryError('');
    getAttendanceHistory(attendanceType, 20)
      .then(result => {
        setHistorySessions(result.sessions);
        setHistoryHasMore(!!result.hasMore);
        setHistoryNextOffset(result.nextOffset ?? result.sessions.length);
      })
      .catch(() => setHistoryError(`Không thể tải lịch sử điểm danh ${attendanceLabel}.`))
      .finally(() => setHistoryLoading(false));
  }, [attendanceLabel, attendanceType, selectedAttendance.recentSessions]);

  const loadGvgHistory = async (reset = false) => {
    const offset = reset ? 0 : gvgHistoryNextOffset;
    setGvgHistoryLoading(true);
    setGvgHistoryError('');
    try {
      const result = await getGvgParticipationSessions(20, offset);
      setGvgHistorySessions(prev => reset
        ? result.sessions
        : [...prev, ...result.sessions.filter(session => !prev.some(item => item.id === session.id))]);
      setGvgHistoryHasMore(!!result.hasMore);
      setGvgHistoryNextOffset(result.nextOffset ?? offset + result.sessions.length);
    } catch {
      setGvgHistoryError(reset ? 'Không thể tải lịch sử chốt bang chiến.' : 'Không thể tải thêm lịch sử chốt bang chiến.');
    } finally {
      setGvgHistoryLoading(false);
    }
  };

  React.useEffect(() => {
    void loadGvgHistory(true);
  }, []);

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
    getAttendanceSession(sessionId, attendanceType)
      .then(result => setSelectedHistorySession(result.session))
      .catch(() => setSelectedHistoryError('Không thể tải chi tiết phiên điểm danh.'))
      .finally(() => setSelectedHistoryLoading(false));
  };

  const loadMoreHistory = () => {
    setHistoryLoading(true);
    setHistoryError('');
    getAttendanceHistory(attendanceType, 20, historyNextOffset)
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
    const results = await Promise.allSettled(uniqueIds.map(id => deleteAttendanceHistorySession(id, attendanceType)));
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
    await deleteHistoryIds([session.id], `Xóa lịch sử điểm danh "${getAttendanceTitle(session)}"?`);
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
      message: `Xoá toàn bộ dữ liệu chốt tham gia bang chiến trong tháng ${deleteGvgMonth}? Thao tác này chỉ xóa dữ liệu chốt tham gia bang chiến của tháng đã chọn, không xóa thành viên hoặc điểm danh và không thể hoàn tác.`,
      variant: 'danger',
      confirmLabel: 'Xoá dữ liệu tháng',
    });
    if (!confirmed) return;

    setDeletingGvgMonth(true);
    try {
      const deletedCount = await onDeleteGvgParticipationMonth(deleteGvgMonth);
      await loadGvgHistory(true);
      setDeleteGvgModalOpen(false);
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
    <main className="min-h-0 h-full flex-1 space-y-4 overflow-y-scroll overflow-x-hidden bg-slate-950/20 p-4 custom-scrollbar lg:p-5">
      <div className="mx-auto w-full max-w-5xl space-y-4">
        <div className="flex flex-wrap gap-2" role="tablist" aria-label="Loại điểm danh">
          {(['GVG', 'SCRIM'] as const).map(type => (
            <button
              key={type}
              type="button"
              role="tab"
              aria-selected={attendanceType === type}
              onClick={() => setAttendanceType(type)}
              className={cn('min-h-10 rounded-xl border px-4 text-sm font-black transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-400/70', attendanceType === type ? 'border-sky-400/50 bg-sky-500/15 text-sky-100' : 'border-slate-700/80 bg-slate-900/45 text-slate-400 hover:text-slate-200')}
            >
              {type === 'GVG' ? 'Bang Chiến' : 'Scrim'}
            </button>
          ))}
        </div>

        {selectedAttendance.activeSession ? (
          <SessionSummaryCard
            session={selectedAttendance.activeSession}
            channelName={selectedAttendance.config?.discordChannelName}
            actionLoading={actionLoading}
            onOpenDetails={() => setActiveDetailsOpen(true)}
            onRefresh={() => onRefreshSession(attendanceType)}
            onClose={() => onCloseSession(attendanceType)}
          />
        ) : (
          <section className="rounded-2xl border border-dashed border-slate-700 bg-slate-900/25 px-6 py-9 text-center">
            <ClipboardCheck size={38} className="mx-auto mb-3 text-slate-500" />
            <h2 className="text-xl font-black text-white">Chưa có phiên điểm danh {attendanceLabel} đang mở</h2>
            <p className="mx-auto mt-2 max-w-lg text-sm text-slate-400">Mở phiên mới để gửi lựa chọn Tham gia hoặc Không tham gia đến Discord.</p>
            <button
              type="button"
              onClick={() => setSetupModal('open')}
              disabled={actionLoading || !selectedAttendance.config}
              className="mt-5 inline-flex min-h-10 items-center gap-2 rounded-xl border border-emerald-400/35 bg-emerald-500/15 px-4 text-sm font-black text-emerald-100 transition-colors hover:border-emerald-300/60 hover:bg-emerald-500/25 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300/70 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Play size={16} /> Mở điểm danh {attendanceLabel}
            </button>
          </section>
        )}

        <section className="rounded-2xl border border-slate-800/80 bg-slate-950/45 p-3 shadow-lg shadow-slate-950/15">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-sm font-black text-slate-100">Hành động nhanh</h2>
              <p className="mt-1 text-xs text-slate-500">{attendanceType === 'GVG' ? 'Chốt danh sách tham gia thực tế sau trận bang chiến.' : 'Quản lý kênh và vận hành điểm danh Scrim.'}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={() => setManagementModalOpen(true)} className="app-button-secondary inline-flex min-h-10 items-center justify-center gap-2 rounded-xl px-4 text-sm font-black">
                <Hash size={16} /> Quản lý {attendanceLabel}
              </button>
              {attendanceType === 'GVG' ? (
                <button type="button" onClick={() => setIsGvgModalOpen(true)} className="app-button-primary inline-flex min-h-10 items-center justify-center gap-2 rounded-xl px-4 text-sm font-black">
                  <ShieldCheck size={16} /> Chốt tham gia bang chiến
                </button>
              ) : null}
            </div>
          </div>
        </section>

        <section className="app-surface rounded-2xl p-4">
          <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2">
              <CalendarDays size={16} className="text-slate-400" />
              <h2 className="text-sm font-black text-slate-100">Lịch sử {attendanceLabel} gần đây</h2>
            </div>
            <div className="flex items-center gap-2">
              {historyLoading ? <span className="text-xs font-bold text-slate-500">Đang tải...</span> : null}
              <button type="button" onClick={() => setHistoryModalOpen(true)} className="app-button-secondary min-h-9 rounded-xl px-3 text-xs font-black">Xem tất cả</button>
            </div>
          </div>
          {historyError ? <div className="mb-3 rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-200">{historyError}</div> : null}
          {recentHistoryList.length ? (
            <div className="space-y-2">
              {recentHistoryList.map(session => (
                <button
                  key={session.id}
                  type="button"
                  onClick={() => openHistorySession(session.id)}
                  className="flex w-full min-h-14 items-center justify-between gap-3 rounded-2xl border border-slate-800/80 bg-slate-950/35 p-3 text-left transition-colors hover:border-slate-700/80 hover:bg-slate-900/60 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-400/70"
                >
                  <div className="min-w-0">
                    <div className="truncate font-black text-slate-100">{getAttendanceTitle(session)}</div>
                    <div className="mt-1 text-xs text-slate-500">{formatDate(session.openedAt)} - {formatDate(session.closedAt)}</div>
                  </div>
                  <div className="flex shrink-0 flex-wrap justify-end gap-1.5">
                    <SummaryPill choice="GO" count={session.summary.go} />
                    <SummaryPill choice="NOGO" count={session.summary.nogo} />
                  </div>
                </button>
              ))}
            </div>
          ) : <div className="rounded-xl border border-dashed border-slate-700/70 px-3 py-6 text-center text-sm text-slate-500">Chưa có lịch sử điểm danh.</div>}
        </section>
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
              {deleteError ? <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-200">{deleteError}</div> : null}
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
                    aria-label={`Chọn lịch sử ${getAttendanceTitle(session)}`}
                  />
                  <button
                    onClick={() => openHistorySession(session.id)}
                    className="flex min-w-0 flex-1 flex-col gap-2 rounded-xl px-2 py-1 text-left sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="min-w-0">
                      <div className="truncate font-black text-slate-100">{getAttendanceTitle(session)}</div>
                      <div className="text-xs text-slate-500">{formatDate(session.openedAt)} - {formatDate(session.closedAt)}</div>
                    </div>
                    <div className="flex shrink-0 flex-wrap gap-1.5">
                      <SummaryPill choice="GO" count={session.summary.go} />
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

      {managementModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-3 backdrop-blur-sm lg:p-6" onClick={() => setManagementModalOpen(false)}>
          <div className="w-full max-w-lg overflow-hidden rounded-2xl border border-slate-700 bg-slate-950 shadow-2xl" role="dialog" aria-modal="true" aria-labelledby="attendance-management-title" onClick={event => event.stopPropagation()}>
            <div className="flex items-start justify-between gap-3 border-b border-slate-800 bg-slate-950/95 px-5 py-4">
              <div>
                <h2 id="attendance-management-title" className="text-xl font-black text-white">Quản lý điểm danh {attendanceLabel}</h2>
                <p className="mt-1 text-sm text-slate-500">Cấu hình kênh {attendanceLabel} và quản lý dữ liệu ít dùng.</p>
              </div>
              <button type="button" onClick={() => setManagementModalOpen(false)} aria-label="Đóng quản lý điểm danh" className="app-button-secondary flex h-9 w-9 items-center justify-center rounded-xl"><X size={18} /></button>
            </div>
            <div className="space-y-4 p-5">
              <section className="rounded-2xl border border-slate-800/80 bg-slate-900/35 p-3">
                <div className="mb-3">
                  <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-wider text-slate-500"><Hash size={13} /> Kênh điểm danh</div>
                  <p className="mt-1 truncate text-sm font-black text-sky-100">{selectedAttendance.config ? (selectedAttendance.config.discordChannelName || selectedAttendance.config.discordChannelId) : 'Chưa cấu hình'}</p>
                </div>
                <div className="flex gap-2">
                  <input value={channelId} onChange={event => setChannelId(event.target.value)} aria-label="Discord channel id" className="min-w-0 flex-1 rounded-xl border border-slate-700/80 bg-slate-950/60 px-3 py-2 text-sm font-bold text-slate-100 outline-none transition-colors placeholder:text-slate-600 focus:border-sky-400/70" placeholder="Discord channel id" />
                  <button type="button" onClick={() => onSetChannel(channelId, attendanceType)} disabled={actionLoading || !channelId.trim()} className="app-button-primary inline-flex min-h-10 items-center justify-center gap-2 rounded-xl px-3 text-xs font-black disabled:cursor-not-allowed disabled:opacity-50"><Save size={14} /> Lưu</button>
                </div>
              </section>
              {attendanceType === 'GVG' ? (
                <section className="rounded-2xl border border-slate-800/80 bg-slate-900/35 p-3">
                  <div className="mb-3">
                    <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-wider text-slate-500"><ShieldCheck size={13} /> Dữ liệu bang chiến</div>
                    <p className="mt-1 text-xs font-bold leading-5 text-slate-400">Xem lịch sử đã chốt hoặc xóa dữ liệu theo tháng.</p>
                  </div>
                  <div className="grid gap-2 sm:grid-cols-2">
                    <button type="button" onClick={() => setGvgHistoryModalOpen(true)} className="app-button-secondary inline-flex min-h-10 items-center justify-center gap-2 rounded-xl px-3 text-xs font-black"><CalendarDays size={14} /> Lịch sử chốt</button>
                    <button type="button" onClick={() => setDeleteGvgModalOpen(true)} className="app-button-danger inline-flex min-h-10 items-center justify-center gap-2 rounded-xl px-3 text-xs font-black"><Trash2 size={14} /> Xóa dữ liệu</button>
                  </div>
                  {gvgHistoryError ? <div className="mt-3 rounded-lg border border-amber-500/30 bg-amber-500/10 px-2.5 py-1.5 text-[11px] font-bold text-amber-200">{gvgHistoryError}</div> : null}
                </section>
              ) : null}
            </div>
          </div>
        </div>
      )}

      {deleteGvgModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 p-3 backdrop-blur-sm lg:p-6" onClick={() => setDeleteGvgModalOpen(false)}>
          <div className="w-full max-w-md rounded-2xl border border-slate-700 bg-slate-950 shadow-2xl" onClick={event => event.stopPropagation()}>
            <div className="flex items-center justify-between gap-3 border-b border-slate-800 px-5 py-4">
              <div>
                <h2 className="text-xl font-black text-white">Xóa dữ liệu chốt bang chiến</h2>
                <p className="text-sm text-slate-500">Chọn tháng cần xóa dữ liệu đã chốt.</p>
              </div>
              <button onClick={() => setDeleteGvgModalOpen(false)} className="app-button-secondary rounded-xl p-2">
                <X size={18} />
              </button>
            </div>
            <div className="space-y-4 p-5">
              <AppMonthPicker label="Tháng cần xóa" value={deleteGvgMonth} onChange={setDeleteGvgMonth} />
              <div className="rounded-xl border border-red-500/25 bg-red-500/10 px-3 py-2 text-xs font-bold leading-5 text-red-200">
                Thao tác này chỉ xóa dữ liệu chốt tham gia bang chiến của tháng đã chọn, không xóa thành viên hoặc điểm danh.
              </div>
              <div className="flex justify-end gap-2">
                <button type="button" onClick={() => setDeleteGvgModalOpen(false)} className="app-button-secondary rounded-xl px-3 py-2 text-sm font-bold">Hủy</button>
                <button
                  type="button"
                  onClick={() => void deleteGvgParticipationMonth()}
                  disabled={deletingGvgMonth || !deleteGvgMonth}
                  className="app-button-danger inline-flex items-center justify-center gap-2 rounded-xl px-3 py-2 text-sm font-black disabled:opacity-50"
                >
                  <Trash2 size={15} />
                  {deletingGvgMonth ? 'Đang xóa...' : 'Xóa dữ liệu'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {gvgHistoryModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-3 backdrop-blur-sm lg:p-6" onClick={() => setGvgHistoryModalOpen(false)}>
          <div className="max-h-[92vh] w-full max-w-4xl overflow-y-auto rounded-2xl border border-slate-700 bg-slate-950 shadow-2xl custom-scrollbar" onClick={event => event.stopPropagation()}>
            <div className="sticky top-0 z-10 flex items-center justify-between gap-3 border-b border-slate-800 bg-slate-950/95 px-6 py-5 backdrop-blur">
              <div>
                <h2 className="text-xl font-black text-white">Tất cả lịch sử chốt tham gia</h2>
                <p className="text-sm text-slate-500">Hiển thị theo từng trang, chỉ tải thêm khi cần.</p>
              </div>
              <button onClick={() => setGvgHistoryModalOpen(false)} className="app-button-secondary rounded-xl p-2">
                <X size={18} />
              </button>
            </div>
            <div className="space-y-3 p-5">
              {gvgHistoryError ? (
                <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-200">{gvgHistoryError}</div>
              ) : null}
              {gvgHistorySessions.length ? gvgHistorySessions.map(session => (
                <GvgHistoryRow key={session.id} session={session} onOpen={() => setSelectedGvgHistorySession(session)} />
              )) : (
                <div className="rounded-xl border border-dashed border-slate-700/70 px-3 py-8 text-center text-sm text-slate-500">
                  {gvgHistoryLoading ? 'Đang tải lịch sử chốt...' : 'Chưa có lịch sử chốt.'}
                </div>
              )}
              {gvgHistoryHasMore ? (
                <button
                  onClick={() => void loadGvgHistory(false)}
                  disabled={gvgHistoryLoading}
                  className="app-button-secondary w-full rounded-xl px-4 py-2 text-sm font-black"
                >
                  {gvgHistoryLoading ? 'Đang tải...' : 'Tải thêm lịch sử'}
                </button>
              ) : null}
            </div>
          </div>
        </div>
      )}

      {selectedGvgHistorySession && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 p-3 backdrop-blur-sm lg:p-6" onClick={() => setSelectedGvgHistorySession(null)}>
          <div className="max-h-[92vh] w-full max-w-5xl overflow-y-auto rounded-2xl border border-slate-700 bg-slate-950 shadow-2xl custom-scrollbar" onClick={event => event.stopPropagation()}>
            <div className="sticky top-0 z-10 flex items-center justify-between gap-3 border-b border-slate-800 bg-slate-950/95 px-6 py-5 backdrop-blur">
              <div className="min-w-0">
                <h2 className="truncate text-xl font-black text-white">Bang chiến {formatDate(selectedGvgHistorySession.battleDate)}</h2>
                <p className="text-sm text-slate-500">Chi tiết danh sách đã chốt và ghi chú.</p>
              </div>
              <button onClick={() => setSelectedGvgHistorySession(null)} className="app-button-secondary rounded-xl p-2">
                <X size={18} />
              </button>
            </div>
            <div className="p-5 lg:p-6">
              <GvgHistoryDetailsPanel session={selectedGvgHistorySession} members={members} />
            </div>
          </div>
        </div>
      )}

      {activeDetailsOpen && selectedAttendance.activeSession && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-3 backdrop-blur-sm lg:p-6" onClick={() => setActiveDetailsOpen(false)}>
          <div className="max-h-[96vh] w-full max-w-[96vw] overflow-y-auto rounded-2xl border border-slate-700 bg-slate-950 shadow-2xl custom-scrollbar" onClick={event => event.stopPropagation()}>
            <div className="sticky top-0 z-10 flex items-center justify-between gap-3 border-b border-slate-800 bg-slate-950/95 px-6 py-5 backdrop-blur">
              <div className="min-w-0">
                <h2 className="truncate text-xl font-black text-white">{selectedAttendance.activeSession.headerText || `Điểm danh ${attendanceLabel}`}</h2>
                <p className="text-sm text-slate-500">Cơ cấu phái, bộ lọc và danh sách điểm danh đang mở.</p>
              </div>
              <button onClick={() => setActiveDetailsOpen(false)} className="app-button-secondary rounded-xl p-2">
                <X size={18} />
              </button>
            </div>
            <div className="p-5 lg:p-6">
              <SessionDetailsPanel session={selectedAttendance.activeSession} members={members} />
            </div>
          </div>
        </div>
      )}

      {isGvgModalOpen && (
        <GvgParticipationModal
          members={members}
          attendanceSessions={gvgParticipationSourceSessions}
          onClose={() => setIsGvgModalOpen(false)}
          onSaved={() => {
            setIsGvgModalOpen(false);
            void loadGvgHistory(true);
          }}
        />
      )}

      {setupModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm" onClick={() => setSetupModal(null)}>
          <div className="w-full max-w-lg rounded-2xl border border-slate-700 bg-slate-950 shadow-2xl" onClick={event => event.stopPropagation()}>
            <div className="flex items-center justify-between gap-3 border-b border-slate-800 px-5 py-4">
              <div>
                <h2 className="text-xl font-black text-white">Mở điểm danh {attendanceLabel}</h2>
                <p className="text-sm text-slate-500">Nhập tiêu đề hiển thị trên phiên điểm danh {attendanceLabel} mới.</p>
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
                  placeholder={`Điểm danh ${attendanceLabel}`}
                  autoFocus
                />
              </div>
              <div className="flex justify-end gap-2">
                <button onClick={() => setSetupModal(null)} className="app-button-secondary rounded-xl px-4 py-2 text-sm font-bold">
                  Hủy
                </button>
                <button
                  onClick={() => {
                    onOpenSession(headerText, attendanceType);
                    setSetupModal(null);
                  }}
                  disabled={actionLoading || !!selectedAttendance.activeSession || !selectedAttendance.config}
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
