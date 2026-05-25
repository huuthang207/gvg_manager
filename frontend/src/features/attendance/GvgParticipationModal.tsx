import React, { useEffect, useState } from 'react';
import { CalendarDays, Loader2, Search, ShieldCheck, Users, X } from 'lucide-react';
import { finalizeGvgParticipationSession, getGvgParticipationSessions } from '../../services/discordApi.ts';
import type { GvgParticipationSession } from '../../services/discordApi.ts';
import { getErrorMessage } from '../../lib/error.ts';
import { cn } from '../../lib/utils.ts';
import { AppDatePicker } from '../../components/ui/AppDatePicker.tsx';
import { AppSelect } from '../../components/ui/AppSelect.tsx';
import type { AttendanceSession } from '../../shared/types/auth.ts';
import type { Member } from '../../shared/types/member.ts';

function formatInputDate(iso: string | null | undefined) {
  if (!iso) return '';
  return iso.slice(0, 10);
}

function getNextSaturdayInputDate() {
  const now = new Date();
  const date = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
  const days = (6 - date.getUTCDay() + 7) % 7;
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

interface GvgParticipationModalProps {
  members: Member[];
  attendanceSessions: AttendanceSession[];
  onClose: () => void;
  onSaved: () => void;
}

export const GvgParticipationModal: React.FC<GvgParticipationModalProps> = ({ members, attendanceSessions, onClose, onSaved }) => {
  const [battleDate, setBattleDate] = useState(getNextSaturdayInputDate);
  const [battleCount, setBattleCount] = useState<1 | 2>(1);
  const [selectedBattlesByMember, setSelectedBattlesByMember] = useState<Record<string, number[]>>({});
  const [note, setNote] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [historySessions, setHistorySessions] = useState<GvgParticipationSession[]>([]);
  const [selectedAttendanceSessionId, setSelectedAttendanceSessionId] = useState(() => attendanceSessions[0]?.id || '');
  const [memberSearchTerm, setMemberSearchTerm] = useState('');
  const activeMembers = members.filter(member => member.active !== false);
  const selectedAttendanceSession = attendanceSessions.find(session => session.id === selectedAttendanceSessionId) || null;
  const existingSessionForDate = historySessions.find(session => formatInputDate(session.battleDate) === battleDate) || null;
  const isEditingFinalizedSession = !!existingSessionForDate;
  const attendanceGoMemberIds = new Set(selectedAttendanceSession?.votes.filter(vote => vote.choice === 'GO').map(vote => vote.memberId) ?? []);
  const attendanceMaybeMemberIds = new Set(selectedAttendanceSession?.votes.filter(vote => vote.choice === 'MAYBE').map(vote => vote.memberId) ?? []);
  const selectableAttendanceGoMemberIds = activeMembers.filter(member => attendanceGoMemberIds.has(member.id)).map(member => member.id);
  const selectableAttendanceMaybeMemberIds = activeMembers.filter(member => attendanceMaybeMemberIds.has(member.id)).map(member => member.id);
  const memberSearchQuery = memberSearchTerm.trim().toLowerCase();
  const filteredActiveMembers = memberSearchQuery
    ? activeMembers.filter(member => [member.ingameName, member.name, member.discordUsername, member.discordDisplayName, member.classType]
      .filter(Boolean)
      .some(value => value!.toLowerCase().includes(memberSearchQuery)))
    : activeMembers;
  const effectiveBattleCount = battleCount;
  const fullBattleNumbers = Array.from({ length: effectiveBattleCount }, (_, index) => index + 1);
  const selectedBattleLists: number[][] = Object.values(selectedBattlesByMember);
  const selectedMemberCount = Object.keys(selectedBattlesByMember).length;
  const selectedBattleTotal = selectedBattleLists.reduce((sum, battleNumbers) => sum + battleNumbers.length, 0);
  const battleOneCount = selectedBattleLists.filter(battleNumbers => battleNumbers.includes(1)).length;
  const battleTwoCount = selectedBattleLists.filter(battleNumbers => battleNumbers.includes(2)).length;
  const selectedRatio = activeMembers.length ? Math.round((selectedMemberCount / activeMembers.length) * 100) : 0;
  const selectedSummary = effectiveBattleCount === 1
    ? `${selectedMemberCount}/${activeMembers.length} thành viên`
    : `${selectedMemberCount}/${activeMembers.length} TV · ${selectedBattleTotal} lượt`;

  useEffect(() => {
    let active = true;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const history = await getGvgParticipationSessions(50);
        if (!active) return;
        setHistorySessions(history.sessions);
      } catch (err) {
        if (active) setError(getErrorMessage(err, 'Không thể cập nhật dữ liệu bang chiến.'));
      } finally {
        if (active) setLoading(false);
      }
    }
    void load();
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (loading) return;

    if (!existingSessionForDate) {
      setSelectedBattlesByMember({});
      setNote('');
      setBattleCount(1);
      return;
    }

    const restoredSelections: Record<string, number[]> = {};
    existingSessionForDate.entries.forEach(entry => {
      const battleNumbers = entry.battleNumbers.length
        ? entry.battleNumbers
        : Array.from({ length: Math.min(Math.max(entry.count, 0), Math.max(existingSessionForDate.battleCount, 0)) }, (_, index) => index + 1);
      if (battleNumbers.length) restoredSelections[entry.memberId] = battleNumbers;
    });
    setSelectedBattlesByMember(restoredSelections);
    setNote(existingSessionForDate.note || '');
    setBattleCount(existingSessionForDate.battleCount === 2 ? 2 : 1);
  }, [battleDate, existingSessionForDate, loading]);

  const toggleMember = (memberId: string) => {
    setSelectedBattlesByMember(current => {
      const next = { ...current };
      if (next[memberId]?.length) delete next[memberId];
      else next[memberId] = fullBattleNumbers;
      return next;
    });
  };

  const toggleMemberBattle = (memberId: string, battleNumber: number) => {
    setSelectedBattlesByMember(current => {
      const currentBattles = current[memberId] || [];
      const nextBattles = currentBattles.includes(battleNumber)
        ? currentBattles.filter(value => value !== battleNumber)
        : [...currentBattles, battleNumber].sort((a, b) => a - b);
      const next = { ...current };
      if (nextBattles.length) next[memberId] = nextBattles;
      else delete next[memberId];
      return next;
    });
  };

  const createFullBattleSelections = (memberIds: string[]) => Object.fromEntries(memberIds.map(id => [id, fullBattleNumbers])) as Record<string, number[]>;
  const selectAllMembers = () => setSelectedBattlesByMember(createFullBattleSelections(activeMembers.map(member => member.id)));
  const clearSelectedMembers = () => setSelectedBattlesByMember({});
  const selectAttendanceGoMembers = () => setSelectedBattlesByMember(createFullBattleSelections(selectableAttendanceGoMemberIds));
  const selectAttendanceMaybeMembers = () => setSelectedBattlesByMember(createFullBattleSelections(selectableAttendanceMaybeMemberIds));
  const getAttendanceSessionLabel = (session: AttendanceSession) => {
    const status = session.status === 'OPEN' ? 'Đang mở' : 'Đã đóng';
    const title = session.headerText || 'Điểm danh Bang Chiến';
    return `${status} · ${title} · ${formatInputDate(session.openedAt)} · Tham gia ${session.summary.go} · Dự bị ${session.summary.maybe}`;
  };

  const handleFinalize = async () => {
    setSaving(true);
    setError(null);
    try {
      const participations = (Object.entries(selectedBattlesByMember) as Array<[string, number[]]>)
        .filter(([, battleNumbers]) => battleNumbers.length > 0)
        .map(([memberId, battleNumbers]) => ({ memberId, battleNumbers }));
      await finalizeGvgParticipationSession({
        battleDate,
        battleCount,
        participations,
        note,
      });
      onSaved();
    } catch (err) {
      setError(getErrorMessage(err, 'Không thể cập nhật dữ liệu bang chiến.'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-3 backdrop-blur-md lg:p-6" onClick={onClose}>
      <div
        className="flex max-h-[90vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl border border-slate-800/90 bg-slate-950 shadow-2xl shadow-slate-950/60"
        onClick={event => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="gvg-participation-title"
      >
        <div className="flex items-center justify-between gap-3 border-b border-slate-800/80 bg-gradient-to-r from-slate-900/95 to-slate-950/90 px-4 py-3">
          <div className="flex min-w-0 items-center gap-2.5">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-sky-400/25 bg-sky-500/10 text-sky-200">
              <ShieldCheck size={17} />
            </span>
            <div className="min-w-0">
              <h3 id="gvg-participation-title" className="truncate text-base font-black text-white">{isEditingFinalizedSession ? 'Sửa phiên bang chiến đã chốt' : 'Chốt tham gia bang chiến'}</h3>
              <p className="mt-0.5 truncate text-xs font-bold text-slate-500">Đồng bộ danh sách tham gia thực tế sau trận.</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Đóng popup chốt tham gia"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-slate-700/80 bg-slate-950/45 text-slate-400 transition-colors hover:border-slate-500 hover:bg-slate-900 hover:text-slate-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-400/70"
          >
            <X size={16} />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-2.5 custom-scrollbar lg:p-3">
          <div className="space-y-2.5">
            {error && <div className="rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm font-bold text-red-200">{error}</div>}
            {isEditingFinalizedSession && (
              <div className="rounded-2xl border border-amber-400/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
                <div className="font-black">Đang sửa phiên đã chốt</div>
                <div className="mt-1 text-xs font-bold text-amber-200/85">Lưu lại sẽ thay thế số trận và danh sách T1/T2 của ngày này.</div>
              </div>
            )}
            {loading && (
              <div className="flex items-center gap-2 rounded-2xl border border-sky-500/25 bg-sky-500/10 px-4 py-3 text-sm font-bold text-sky-100">
                <Loader2 size={16} className="animate-spin" />
                Đang tải cấu hình bang chiến...
              </div>
            )}

            <div className="grid gap-2.5 xl:grid-cols-[260px_minmax(0,1fr)]">
              <aside className="space-y-2">
                <section className="rounded-xl border border-slate-800/80 bg-slate-900/35 p-2.5">
                  <div className="mb-2 flex items-center gap-2">
                    <CalendarDays size={15} className="shrink-0 text-sky-300" />
                    <h4 className="text-xs font-black uppercase tracking-wider text-slate-300">Ngày chốt</h4>
                  </div>
                  <div className="space-y-2">
                    <AppDatePicker label="Ngày bang chiến" value={battleDate} onChange={setBattleDate} />
                    {isEditingFinalizedSession && (
                      <div className="rounded-lg border border-amber-400/25 bg-amber-500/10 px-2.5 py-1.5 text-[11px] font-black uppercase tracking-wider text-amber-200">
                        Đang sửa phiên đã chốt
                      </div>
                    )}
                    <AppSelect value={battleCount} onChange={event => {
                      const nextBattleCount = Number(event.target.value) === 2 ? 2 : 1;
                      setBattleCount(nextBattleCount);
                      if (nextBattleCount === 1) {
                        setSelectedBattlesByMember(current => Object.fromEntries(
                          (Object.entries(current) as Array<[string, number[]]>)
                            .map(([memberId, battleNumbers]) => [memberId, battleNumbers.filter(value => value === 1)] as const)
                            .filter(([, battleNumbers]) => battleNumbers.length > 0),
                        ));
                      }
                    }}>
                      <option value={1}>1 trận</option>
                      <option value={2}>2 trận</option>
                    </AppSelect>
                    <p className="text-[11px] font-bold leading-4 text-slate-500">
                      Đổi từ 2 trận về 1 trận sẽ chỉ giữ lựa chọn T1; các lựa chọn chỉ có T2 sẽ không còn được tính.
                    </p>
                  </div>
                </section>

                <label className="block app-surface-soft rounded-xl border border-slate-800/80 p-2.5">
                  <span className="mb-1.5 block text-xs font-black uppercase tracking-wider text-slate-500">Ghi chú</span>
                  <textarea value={note} onChange={event => setNote(event.target.value)} placeholder="Ghi chú" rows={2} className="w-full resize-none rounded-lg border border-slate-700 bg-slate-950/60 px-2.5 py-1.5 text-sm text-slate-100 outline-none transition-colors placeholder:text-slate-600 focus:border-sky-400/70" />
                </label>
              </aside>

              <section className="app-surface-soft min-w-0 overflow-hidden rounded-2xl border border-slate-800/80">
                <div className="border-b border-slate-800/80 px-3 py-2.5 sm:px-4">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <Users size={16} className="shrink-0 text-sky-300" />
                      <h4 className="text-sm font-black text-slate-100">Thành viên</h4>
                    </div>
                    <span className="w-fit rounded-full border border-sky-400/25 bg-sky-500/10 px-2.5 py-0.5 text-xs font-black text-sky-200">{selectedSummary}</span>
                  </div>
                  <div className="mt-2 h-1 overflow-hidden rounded-full bg-slate-800/80">
                    <div className="h-full rounded-full bg-sky-400 transition-all" style={{ width: `${selectedRatio}%` }} />
                  </div>
                </div>

                <div className="space-y-2 border-b border-slate-800/80 bg-slate-950/20 px-3 py-2 sm:px-4">
                  <div className="grid gap-2 xl:grid-cols-[minmax(0,1fr)_auto_auto]">
                    <AppSelect
                      value={selectedAttendanceSessionId}
                      onChange={event => setSelectedAttendanceSessionId(event.target.value)}
                      disabled={!attendanceSessions.length}
                    >
                      {attendanceSessions.length ? attendanceSessions.map(session => (
                        <option key={session.id} value={session.id}>{getAttendanceSessionLabel(session)}</option>
                      )) : (
                        <option value="">Chưa có phiên điểm danh</option>
                      )}
                    </AppSelect>
                    <button
                      type="button"
                      onClick={selectAttendanceGoMembers}
                      disabled={!selectableAttendanceGoMemberIds.length}
                      className="app-button-primary rounded-xl px-2.5 py-1.5 text-xs font-black disabled:opacity-50"
                    >
                      Tham gia ({selectableAttendanceGoMemberIds.length})
                    </button>
                    <button
                      type="button"
                      onClick={selectAttendanceMaybeMembers}
                      disabled={!selectableAttendanceMaybeMemberIds.length}
                      className="app-button-secondary rounded-xl px-2.5 py-1.5 text-xs font-black disabled:opacity-50"
                    >
                      Dự bị ({selectableAttendanceMaybeMemberIds.length})
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button type="button" onClick={selectAllMembers} className="app-button-secondary rounded-xl px-2.5 py-1.5 text-xs font-black">
                      Tất cả
                    </button>
                    <button type="button" onClick={clearSelectedMembers} className="app-button-secondary rounded-xl px-2.5 py-1.5 text-xs font-black">
                      Bỏ chọn
                    </button>
                  </div>
                  <div className="relative">
                    <Search size={14} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500" />
                    <input
                      value={memberSearchTerm}
                      onChange={event => setMemberSearchTerm(event.target.value)}
                      placeholder="Tìm tên hoặc phái..."
                      className="w-full rounded-lg border border-slate-700 bg-slate-950/60 py-1.5 pl-8 pr-2.5 text-xs font-medium text-slate-100 outline-none transition-colors placeholder:text-slate-600 focus:border-sky-400/70"
                    />
                  </div>
                </div>

                <div className="grid max-h-[330px] gap-1 overflow-y-auto p-2 custom-scrollbar sm:grid-cols-2">
                  {filteredActiveMembers.length ? filteredActiveMembers.map(member => {
                    const selectedBattles = selectedBattlesByMember[member.id] || [];
                    const selected = selectedBattles.length > 0;
                    return (
                      <div
                        key={member.id}
                        className={cn(
                          'group flex items-center gap-1.5 rounded-lg border px-2 py-1 text-xs transition-colors',
                          selected
                            ? 'border-sky-400/40 bg-sky-500/10 text-slate-50'
                            : 'border-slate-800/80 bg-slate-950/20 text-slate-200 hover:bg-slate-900/70',
                        )}
                      >
                        <input type="checkbox" checked={selected} onChange={() => toggleMember(member.id)} className="h-3.5 w-3.5 shrink-0 accent-sky-500" />
                        <button type="button" onClick={() => toggleMember(member.id)} className="min-w-0 flex-1 truncate text-left font-bold leading-4">
                          {member.ingameName || member.name}
                        </button>
                        <span className="shrink-0 rounded-full border border-slate-700 bg-slate-900 px-1.5 py-0 text-[9px] font-black leading-4 text-slate-400 group-hover:text-slate-300">{member.classType}</span>
                        {effectiveBattleCount === 2 ? (
                          <div className="ml-1 flex shrink-0 gap-1">
                            {[1, 2].map(battleNumber => {
                              const active = selectedBattles.includes(battleNumber);
                              return (
                                <button
                                  key={battleNumber}
                                  type="button"
                                  onClick={() => toggleMemberBattle(member.id, battleNumber)}
                                  className={cn(
                                    'rounded border px-1.5 py-0 text-[10px] font-black leading-4 transition-colors',
                                    active
                                      ? 'border-sky-400/60 bg-sky-500/20 text-sky-100'
                                      : 'border-slate-700 bg-slate-950/50 text-slate-500 hover:text-slate-200',
                                  )}
                                >
                                  T{battleNumber}
                                </button>
                              );
                            })}
                          </div>
                        ) : null}
                      </div>
                    );
                  }) : (
                    <div className="col-span-full rounded-lg border border-dashed border-slate-700 px-3 py-5 text-center text-xs font-bold text-slate-500">
                      Không tìm thấy thành viên phù hợp.
                    </div>
                  )}
                </div>
              </section>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-2 border-t border-slate-800/80 bg-slate-950/60 px-4 py-2.5 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-xs font-bold text-slate-500">
            <span className="text-slate-300">{selectedSummary}</span>
            <span className="mx-2 text-slate-700">•</span>
            <span>{isEditingFinalizedSession ? 'Cập nhật phiên đã chốt' : 'Tạo phiên mới'}</span>
            <span className="mx-2 text-slate-700">•</span>
            <span>{effectiveBattleCount === 2 ? `T1: ${battleOneCount} · T2: ${battleTwoCount}` : `Ngày ${battleDate || '—'} · ${battleCount ?? '—'} trận`}</span>
          </div>
          <div className="flex justify-end gap-3">
            <button type="button" onClick={onClose} className="app-button-secondary rounded-xl px-3 py-1.5 text-sm font-bold">Hủy</button>
            <button type="button" disabled={saving || loading} onClick={handleFinalize} className="app-button-primary rounded-xl px-3 py-1.5 text-sm font-bold disabled:opacity-50">{saving ? 'Đang lưu...' : isEditingFinalizedSession ? 'Cập nhật phiên đã chốt' : 'Chốt tham gia'}</button>
          </div>
        </div>
      </div>
    </div>
  );
};
