import React, { useEffect, useMemo, useState } from 'react';
import { CalendarDays, ChevronLeft, ChevronRight, X } from 'lucide-react';
import { cn } from '../../lib/utils.ts';

const weekDays = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];

function getTodayInputDate() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

function parseDateValue(value: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) return null;
  return { year, month, day };
}

function formatDateValue(value: string) {
  const parsed = parseDateValue(value);
  if (!parsed) return 'Chọn ngày';
  return `${String(parsed.day).padStart(2, '0')} / ${String(parsed.month).padStart(2, '0')} / ${parsed.year}`;
}

function toDateValue(year: number, month: number, day: number) {
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function getDaysInMonth(year: number, month: number) {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

function getMondayStartOffset(year: number, month: number) {
  const day = new Date(Date.UTC(year, month - 1, 1)).getUTCDay();
  return (day + 6) % 7;
}

export function AppDatePicker({
  label,
  value,
  onChange,
  disabled,
  minYear = 2020,
  maxYear = 2035,
}: {
  label?: string;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  minYear?: number;
  maxYear?: number;
}) {
  const selected = parseDateValue(value) || parseDateValue(getTodayInputDate())!;
  const todayValue = getTodayInputDate();
  const [open, setOpen] = useState(false);
  const [draftYear, setDraftYear] = useState(selected.year);
  const [draftMonth, setDraftMonth] = useState(selected.month);
  const [draftDay, setDraftDay] = useState(selected.day);

  useEffect(() => {
    if (!open) return;
    const latest = parseDateValue(value) || parseDateValue(getTodayInputDate())!;
    setDraftYear(latest.year);
    setDraftMonth(latest.month);
    setDraftDay(latest.day);
  }, [open, value]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open]);

  const days = useMemo(() => {
    const offset = getMondayStartOffset(draftYear, draftMonth);
    const count = getDaysInMonth(draftYear, draftMonth);
    return [...Array(offset).fill(null), ...Array.from({ length: count }, (_, index) => index + 1)];
  }, [draftMonth, draftYear]);

  const changeMonth = (delta: number) => {
    const next = new Date(Date.UTC(draftYear, draftMonth - 1 + delta, 1));
    const nextYear = Math.min(Math.max(next.getUTCFullYear(), minYear), maxYear);
    const nextMonth = nextYear === minYear && next.getUTCFullYear() < minYear
      ? 1
      : nextYear === maxYear && next.getUTCFullYear() > maxYear
        ? 12
        : next.getUTCMonth() + 1;
    setDraftYear(nextYear);
    setDraftMonth(nextMonth);
    setDraftDay(day => Math.min(day, getDaysInMonth(nextYear, nextMonth)));
  };

  const apply = () => {
    onChange(toDateValue(draftYear, draftMonth, draftDay));
    setOpen(false);
  };

  const canGoPrev = draftYear > minYear || draftMonth > 1;
  const canGoNext = draftYear < maxYear || draftMonth < 12;

  return (
    <div className="relative">
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen(true)}
        aria-label={label || 'Chọn ngày'}
        className="flex w-full items-center justify-between gap-3 rounded-xl border border-slate-700/80 bg-slate-950/60 px-3 py-2 text-left shadow-sm shadow-slate-950/15 transition-colors hover:border-sky-400/60 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-400/70 disabled:cursor-not-allowed disabled:opacity-50"
      >
        <span className="min-w-0">
          {label ? <span className="mb-0.5 block text-[10px] font-black uppercase tracking-wider text-slate-500">{label}</span> : null}
          <span className="block truncate text-sm font-black text-slate-100">{formatDateValue(value)}</span>
        </span>
        <CalendarDays size={16} className="shrink-0 text-sky-300" />
      </button>

      {open ? (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/50 p-3 backdrop-blur-sm" onClick={() => setOpen(false)}>
          <div className="w-full max-w-md rounded-2xl border border-slate-700 bg-slate-950 shadow-2xl" onClick={event => event.stopPropagation()}>
            <div className="flex items-center justify-between gap-3 border-b border-slate-800 px-4 py-3">
              <div>
                <h3 className="text-base font-black text-white">Chọn ngày</h3>
                <p className="text-xs font-bold text-slate-500">Chọn ngày rồi bấm Áp dụng.</p>
              </div>
              <button type="button" onClick={() => setOpen(false)} className="app-button-secondary rounded-lg p-2" aria-label="Đóng chọn ngày">
                <X size={16} />
              </button>
            </div>
            <div className="space-y-4 p-4">
              <div className="flex items-center justify-between gap-3 rounded-xl border border-slate-800/80 bg-slate-950/45 px-2 py-1.5">
                <button type="button" onClick={() => changeMonth(-1)} disabled={!canGoPrev} className="app-button-secondary rounded-lg p-2 disabled:opacity-50" aria-label="Tháng trước">
                  <ChevronLeft size={16} />
                </button>
                <div className="text-lg font-black text-slate-100 tabular-nums">Tháng {String(draftMonth).padStart(2, '0')} / {draftYear}</div>
                <button type="button" onClick={() => changeMonth(1)} disabled={!canGoNext} className="app-button-secondary rounded-lg p-2 disabled:opacity-50" aria-label="Tháng sau">
                  <ChevronRight size={16} />
                </button>
              </div>
              <div className="grid grid-cols-7 gap-1.5 text-center">
                {weekDays.map(day => <div key={day} className="py-1 text-[10px] font-black uppercase tracking-wider text-slate-500">{day}</div>)}
                {days.map((day, index) => day ? (() => {
                  const dateValue = toDateValue(draftYear, draftMonth, day);
                  const active = draftDay === day;
                  const today = dateValue === todayValue;
                  return (
                    <button
                      key={dateValue}
                      type="button"
                      onClick={() => setDraftDay(day)}
                      aria-label={`Chọn ngày ${day} tháng ${draftMonth} năm ${draftYear}`}
                      className={cn(
                        'rounded-lg border px-2 py-2 text-sm font-black transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-400/70',
                        active
                          ? 'border-sky-400/60 bg-sky-500/20 text-sky-100'
                          : today
                            ? 'border-emerald-400/40 bg-emerald-500/10 text-emerald-200 hover:bg-emerald-500/20'
                            : 'border-slate-800/80 bg-slate-950/45 text-slate-300 hover:border-slate-600 hover:bg-slate-900/80',
                      )}
                    >
                      {day}
                    </button>
                  );
                })() : <div key={`blank-${index}`} />)}
              </div>
              <div className="flex justify-end gap-2 border-t border-slate-800 pt-3">
                <button type="button" onClick={() => setOpen(false)} className="app-button-secondary rounded-xl px-3 py-2 text-sm font-bold">Hủy</button>
                <button type="button" onClick={apply} className="app-button-primary rounded-xl px-3 py-2 text-sm font-black">Áp dụng</button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
