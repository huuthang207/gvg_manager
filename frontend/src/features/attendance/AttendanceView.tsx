import React, { useMemo, useState } from 'react';
import { CalendarDays, CheckCircle2, CircleHelp, ClipboardCheck, Play, RefreshCw, Save, Square, Trash2, X, XCircle } from 'lucide-react';
import { deleteAttendanceHistorySession, getAttendanceHistory, getAttendanceSession } from '../../services/discordApi.ts';
import type { AttendanceChoice, AttendanceSession, AttendanceState, AttendanceVote } from '../../shared/types/auth.ts';
import { useSystemDialog } from '../app/SystemDialogProvider.tsx';

const choiceMeta: Record<AttendanceChoice, { label: string; icon: React.ReactNode; className: string }> = {
  GO: { label: 'Tham gia', icon: <CheckCircle2 size={16} />, className: 'text-emerald-300 bg-emerald-500/10 border-emerald-500/20' },
  MAYBE: { label: 'Dự bị', icon: <CircleHelp size={16} />, className: 'text-amber-300 bg-amber-500/10 border-amber-500/20' },
  NOGO: { label: 'Không tham gia', icon: <XCircle size={16} />, className: 'text-red-300 bg-red-500/10 border-red-500/20' },
};

const classAccentColors = ['text-sky-300', 'text-violet-300', 'text-rose-300', 'text-amber-300', 'text-emerald-300', 'text-cyan-300', 'text-orange-300'];

function formatDate(value: string | null) {
  if (!value) return '-';
  return new Date(value).toLocaleString('vi-VN');
}

function getVoteName(vote: AttendanceVote) {
  return vote.snapshotIngameName || vote.member.ingameName || vote.member.displayName || vote.member.username;
}

function getVoteClass(vote: AttendanceVote) {
  return vote.snapshotClassType || vote.member.classType || 'Unknown';
}

function ChoiceSummaryCard({ choice, count }: { choice: AttendanceChoice; count: number }) {
  const meta = choiceMeta[choice];
  return (
    <div className={`rounded-2xl border px-4 py-3 ${meta.className}`}>
      <div className="flex items-center gap-2 text-sm font-bold">
        {meta.icon}
        {meta.label}
      </div>
      <div className="mt-2 text-2xl font-black text-white">{count}</div>
    </div>
  );
}

function ClassSummary({ votes }: { votes: AttendanceVote[] }) {
  const classCounts = useMemo(() => {
    const counts = new Map<string, number>();
    votes.forEach(vote => {
      const classType = getVoteClass(vote);
      counts.set(classType, (counts.get(classType) || 0) + 1);
    });
    return [...counts.entries()].sort(([a], [b]) => a.localeCompare(b, 'vi'));
  }, [votes]);

  return (
    <section className="app-surface rounded-2xl p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h3 className="text-sm font-black text-slate-100">Số lượng theo phái đã vote</h3>
        <span className="rounded-full border border-slate-700 bg-slate-900 px-2 py-1 text-xs font-bold text-slate-300">
          Tổng {votes.length}
        </span>
      </div>
      {classCounts.length ? (
        <div className="grid grid-cols-2 gap-2 md:grid-cols-3 xl:grid-cols-4">
          {classCounts.map(([classType, count], index) => (
            <div key={classType} className="rounded-xl border border-slate-800 bg-slate-950/45 px-3 py-2">
              <div className={`truncate text-xs font-black ${classAccentColors[index % classAccentColors.length]}`}>{classType}</div>
              <div className="mt-1 text-2xl font-black text-white">{count}</div>
            </div>
          ))}
        </div>
      ) : (
        <div className="rounded-xl border border-dashed border-slate-700/70 px-3 py-6 text-center text-sm text-slate-500">
          Chưa có vote nào.
        </div>
      )}
    </section>
  );
}

function VoteList({ title, votes, choice }: { title: string; votes: AttendanceVote[]; choice: AttendanceChoice }) {
  const meta = choiceMeta[choice];
  return (
    <section className="app-surface rounded-2xl p-4">
      <div className="flex items-center justify-between gap-3 mb-3">
        <h3 className="text-sm font-black text-slate-100">{title}</h3>
        <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-1 text-xs font-bold ${meta.className}`}>
          {meta.icon}
          {votes.length}
        </span>
      </div>
      {votes.length ? (
        <div className="space-y-2">
          {votes.map((vote, index) => (
            <div key={vote.id} className="flex items-center justify-between gap-3 rounded-xl bg-slate-950/45 px-3 py-2 text-sm">
              <div className="min-w-0">
                <span className="text-slate-500 font-mono mr-2">#{index + 1}</span>
                <span className="font-bold text-slate-100">{getVoteName(vote)}</span>
                <span className="ml-2 inline-flex rounded-full border border-slate-700 bg-slate-900 px-2 py-0.5 text-[11px] font-bold text-sky-200">
                  {getVoteClass(vote)}
                </span>
              </div>
              <span className="text-xs text-slate-500 shrink-0">{formatDate(vote.updatedAt)}</span>
            </div>
          ))}
        </div>
      ) : (
        <div className="rounded-xl border border-dashed border-slate-700/70 px-3 py-6 text-center text-sm text-slate-500">
          Chưa có dữ liệu.
        </div>
      )}
    </section>
  );
}

function SessionDetail({
  session,
}: {
  session: AttendanceSession;
}) {
  const groupedVotes = useMemo(() => ({
    GO: session.votes.filter(vote => vote.choice === 'GO'),
    MAYBE: session.votes.filter(vote => vote.choice === 'MAYBE'),
    NOGO: session.votes.filter(vote => vote.choice === 'NOGO'),
  }), [session.votes]);
  const sortedVotesByClass = useMemo(() => (
    [...session.votes].sort((a, b) => {
      const classCompare = getVoteClass(a).localeCompare(getVoteClass(b), 'vi');
      if (classCompare !== 0) return classCompare;
      return getVoteName(a).localeCompare(getVoteName(b), 'vi');
    })
  ), [session.votes]);

  return (
    <div className="space-y-4">
      <div className="app-surface rounded-2xl p-5">
        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-sky-500/20 bg-sky-500/10 px-3 py-1 text-xs font-bold text-sky-200 mb-3">
              <ClipboardCheck size={14} />
              {session.status === 'OPEN' ? 'Đang mở' : 'Đã đóng'}
            </div>
            <h2 className="text-2xl font-black text-white">{session.headerText || 'Điểm danh Bang Chiến'}</h2>
            <div className="mt-2 text-sm text-slate-400 flex flex-wrap gap-x-4 gap-y-1">
              <span>Mở: {formatDate(session.openedAt)}</span>
              <span>Cập nhật: {formatDate(session.lastVoteAt || session.updatedAt)}</span>
              {session.discordChannelId ? <span>Kênh: {session.discordChannelId}</span> : null}
            </div>
          </div>
          <div className="space-y-3 min-w-full lg:min-w-[360px]">
            <div className="grid grid-cols-3 gap-3">
              <ChoiceSummaryCard choice="GO" count={session.summary.go} />
              <ChoiceSummaryCard choice="MAYBE" count={session.summary.maybe} />
              <ChoiceSummaryCard choice="NOGO" count={session.summary.nogo} />
            </div>
          </div>
        </div>
      </div>

      <ClassSummary votes={sortedVotesByClass} />

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <VoteList title="Danh sách tham gia" choice="GO" votes={groupedVotes.GO} />
        <VoteList title="Danh sách dự bị" choice="MAYBE" votes={groupedVotes.MAYBE} />
        <VoteList title="Danh sách không tham gia" choice="NOGO" votes={groupedVotes.NOGO} />
      </div>
    </div>
  );
}

export function AttendanceView({
  attendance,
  actionLoading,
  onSetChannel,
  onOpenSession,
  onCloseSession,
  onRefreshSession,
}: {
  attendance: AttendanceState;
  actionLoading: boolean;
  onSetChannel: (discordChannelId: string) => void;
  onOpenSession: (headerText: string) => void;
  onCloseSession: () => void;
  onRefreshSession: () => void;
}) {
  const { confirm } = useSystemDialog();
  const [historySessions, setHistorySessions] = useState<AttendanceSession[]>(attendance.recentSessions);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState('');
  const [selectedHistorySession, setSelectedHistorySession] = useState<AttendanceSession | null>(null);
  const [selectedHistoryLoading, setSelectedHistoryLoading] = useState(false);
  const [selectedHistoryError, setSelectedHistoryError] = useState('');
  const [deletingSessionId, setDeletingSessionId] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState('');
  const [channelId, setChannelId] = useState(attendance.config?.discordChannelId || '');
  const [headerText, setHeaderText] = useState('');
  const historyList = historySessions.filter(session => session.id !== attendance.activeSession?.id);

  React.useEffect(() => {
    setChannelId(attendance.config?.discordChannelId || '');
  }, [attendance.config?.discordChannelId]);

  React.useEffect(() => {
    setHistorySessions(attendance.recentSessions);
    setHistoryLoading(true);
    setHistoryError('');
    getAttendanceHistory(20)
      .then(result => setHistorySessions(result.sessions))
      .catch(() => setHistoryError('Không thể tải lịch sử điểm danh.'))
      .finally(() => setHistoryLoading(false));
  }, [attendance.recentSessions]);

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

  const deleteHistorySession = async (session: AttendanceSession) => {
    const confirmed = await confirm({
      message: `Xóa lịch sử điểm danh "${session.headerText || 'Điểm danh Bang Chiến'}"?`,
      variant: 'danger',
      confirmLabel: 'Xóa',
    });
    if (!confirmed) return;

    setDeletingSessionId(session.id);
    setDeleteError('');
    try {
      await deleteAttendanceHistorySession(session.id);
      setHistorySessions(prev => prev.filter(item => item.id !== session.id));
      if (selectedHistorySession?.id === session.id) {
        setSelectedHistorySession(null);
      }
    } catch {
      setDeleteError('Không thể xóa lịch sử điểm danh.');
    } finally {
      setDeletingSessionId(null);
    }
  };

  return (
    <main className="flex-1 overflow-auto custom-scrollbar p-6 space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-white">Điểm danh Bang Chiến</h1>
          <p className="mt-1 text-sm text-slate-400">Theo dõi phiên điểm danh từ web, Discord bot và lịch sử gần đây.</p>
        </div>
        <div className="rounded-2xl border border-slate-800 bg-slate-950/50 px-4 py-3 text-sm text-slate-300">
          Kênh điểm danh:{' '}
          <span className="font-bold text-slate-100">{attendance.config?.discordChannelId || 'Chưa cấu hình'}</span>
        </div>
      </div>

      <section className="app-surface rounded-2xl p-5 space-y-4">
          <div className="grid grid-cols-1 xl:grid-cols-[1fr_1.2fr] gap-4">
            <div className="space-y-2">
              <label className="text-xs font-black uppercase tracking-wider text-slate-500">Discord channel id</label>
              <div className="flex gap-2">
                <input
                  value={channelId}
                  onChange={event => setChannelId(event.target.value)}
                  className="flex-1 rounded-xl border border-slate-700 bg-slate-950/60 px-3 py-2 text-sm text-slate-100 outline-none focus:border-sky-500"
                  placeholder="Ví dụ: 123456789012345678"
                />
                <button
                  onClick={() => onSetChannel(channelId)}
                  disabled={actionLoading || !channelId.trim()}
                  className="app-button-primary inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold disabled:opacity-50"
                >
                  <Save size={16} />
                  Lưu
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-black uppercase tracking-wider text-slate-500">Mở phiên điểm danh</label>
              <div className="flex gap-2">
                <input
                  value={headerText}
                  onChange={event => setHeaderText(event.target.value)}
                  className="flex-1 rounded-xl border border-slate-700 bg-slate-950/60 px-3 py-2 text-sm text-slate-100 outline-none focus:border-sky-500"
                  placeholder="Điểm danh Bang Chiến"
                  disabled={!!attendance.activeSession}
                />
                <button
                  onClick={() => onOpenSession(headerText)}
                  disabled={actionLoading || !!attendance.activeSession || !attendance.config}
                  className="app-button-primary inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold disabled:opacity-50"
                >
                  <Play size={16} />
                  Mở
                </button>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              onClick={onRefreshSession}
              disabled={actionLoading || !attendance.activeSession}
              className="app-button-secondary inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold disabled:opacity-50"
            >
              <RefreshCw size={16} />
              Refresh
            </button>
            <button
              onClick={onCloseSession}
              disabled={actionLoading || !attendance.activeSession}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold border border-red-500/30 bg-red-500/10 text-red-200 hover:bg-red-500/20 disabled:opacity-50"
            >
              <Square size={16} />
              Đóng phiên
            </button>
          </div>
      </section>

      {attendance.activeSession ? (
        <SessionDetail session={attendance.activeSession} />
      ) : (
        <div className="app-surface rounded-2xl p-10 text-center">
          <ClipboardCheck size={42} className="mx-auto text-slate-500 mb-3" />
          <h2 className="text-xl font-black text-white">Chưa có phiên điểm danh đang mở</h2>
          <p className="mt-2 text-sm text-slate-400">Mở phiên mới từ web hoặc dùng lệnh Discord /diemdanhbangchien open.</p>
        </div>
      )}

      <section className="app-surface rounded-2xl p-5">
        <div className="flex items-center gap-2 mb-4">
          <CalendarDays size={18} className="text-slate-400" />
          <h2 className="text-lg font-black text-white">Lịch sử điểm danh</h2>
          {historyLoading ? <span className="text-xs text-slate-500">Đang tải...</span> : null}
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
          <div className="space-y-2">
            {historyList.map(session => (
              <div key={session.id} className="flex items-center gap-2 rounded-xl bg-slate-950/45 p-2 transition-colors hover:bg-slate-900/80">
                <button
                  onClick={() => openHistorySession(session.id)}
                  className="min-w-0 flex-1 flex items-center justify-between gap-3 px-2 py-1 text-left"
                >
                  <div className="min-w-0">
                    <div className="font-bold text-slate-100 truncate">{session.headerText || 'Điểm danh Bang Chiến'}</div>
                    <div className="text-xs text-slate-500">{formatDate(session.openedAt)} - {formatDate(session.closedAt)}</div>
                  </div>
                  <div className="flex items-center gap-2 text-xs font-bold shrink-0">
                    <span className="text-emerald-300">GO {session.summary.go}</span>
                    <span className="text-amber-300">MAYBE {session.summary.maybe}</span>
                    <span className="text-red-300">NOGO {session.summary.nogo}</span>
                  </div>
                </button>
                <button
                  onClick={() => void deleteHistorySession(session)}
                  disabled={deletingSessionId === session.id}
                  className="rounded-lg border border-red-500/30 bg-red-500/10 p-2 text-red-300 transition-colors hover:bg-red-500/20 disabled:opacity-50"
                  title="Xóa lịch sử điểm danh"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-xl border border-dashed border-slate-700/70 px-3 py-8 text-center text-sm text-slate-500">
            Chưa có lịch sử điểm danh.
          </div>
        )}
      </section>

      {(selectedHistorySession || selectedHistoryLoading || selectedHistoryError) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm" onClick={() => setSelectedHistorySession(null)}>
          <div className="max-h-[90vh] w-full max-w-6xl overflow-y-auto rounded-2xl border border-slate-700 bg-slate-950 p-5 shadow-2xl custom-scrollbar" onClick={event => event.stopPropagation()}>
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <h2 className="text-xl font-black text-white">Chi tiết lịch sử điểm danh</h2>
                <p className="text-sm text-slate-500">Xem lại kết quả và danh sách vote của phiên đã chọn.</p>
              </div>
              <button
                onClick={() => setSelectedHistorySession(null)}
                className="rounded-xl border border-slate-700 bg-slate-900 p-2 text-slate-400 transition-colors hover:text-slate-100"
              >
                <X size={18} />
              </button>
            </div>
            {selectedHistoryLoading ? (
              <div className="rounded-xl border border-slate-800 bg-slate-900/60 px-4 py-10 text-center text-sm text-slate-400">
                Đang tải chi tiết...
              </div>
            ) : selectedHistoryError ? (
              <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-10 text-center text-sm text-red-200">
                {selectedHistoryError}
              </div>
            ) : selectedHistorySession ? (
              <SessionDetail session={selectedHistorySession} />
            ) : null}
          </div>
        </div>
      )}
    </main>
  );
}
