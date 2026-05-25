import React, { useEffect, useState } from 'react';
import { CalendarDays, ChevronLeft, ChevronRight, X } from 'lucide-react';
import { cn } from '../../lib/utils.ts';

const monthLabels = Array.from({ length: 12 }, (_, index) => `T${index + 1}`);

function getCurrentMonthValue() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

function parseMonthValue(value: string) {
  const match = /^(\d{4})-(\d{2})$/.exec(value);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  if (month < 1 || month > 12) return null;
  return { year, month };
}

function formatMonthValue(value: string) {
  const parsed = parseMonthValue(value);
  if (!parsed) return 'Chọn tháng';
  return `${String(parsed.month).padStart(2, '0')} / ${parsed.year}`;
}

export function AppMonthPickerPanel({
  value,
  onChange,
  onCancel,
  minYear = 2020,
  maxYear = 2035,
}: {
  value: string;
  onChange: (value: string) => void;
  onCancel?: () => void;
  minYear?: number;
  maxYear?: number;
}) {
  const selected = parseMonthValue(value) || parseMonthValue(getCurrentMonthValue())!;
  const [draftYear, setDraftYear] = useState(selected.year);
  const [draftMonth, setDraftMonth] = useState(selected.month);

  useEffect(() => {
    const latest = parseMonthValue(value) || parseMonthValue(getCurrentMonthValue())!;
    setDraftYear(latest.year);
    setDraftMonth(latest.month);
  }, [value]);

  const apply = () => onChange(`${draftYear}-${String(draftMonth).padStart(2, '0')}`);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3 rounded-xl border border-slate-800/80 bg-slate-950/45 px-2 py-1.5">
        <button
          type="button"
          onClick={() => setDraftYear(year => Math.max(year - 1, minYear))}
          disabled={draftYear <= minYear}
          className="app-button-secondary rounded-lg p-2 disabled:opacity-50"
          aria-label="Năm trước"
        >
          <ChevronLeft size={16} />
        </button>
        <div className="text-lg font-black text-slate-100 tabular-nums">{draftYear}</div>
        <button
          type="button"
          onClick={() => setDraftYear(year => Math.min(year + 1, maxYear))}
          disabled={draftYear >= maxYear}
          className="app-button-secondary rounded-lg p-2 disabled:opacity-50"
          aria-label="Năm sau"
        >
          <ChevronRight size={16} />
        </button>
      </div>
      <div className="grid grid-cols-4 gap-2">
        {monthLabels.map((monthLabel, index) => {
          const month = index + 1;
          const active = draftMonth === month;
          return (
            <button
              key={month}
              type="button"
              onClick={() => setDraftMonth(month)}
              aria-label={`Chọn tháng ${month} năm ${draftYear}`}
              className={cn(
                'rounded-xl border px-3 py-2 text-sm font-black transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-400/70',
                active
                  ? 'border-sky-400/60 bg-sky-500/20 text-sky-100'
                  : 'border-slate-800/80 bg-slate-950/45 text-slate-300 hover:border-slate-600 hover:bg-slate-900/80',
              )}
            >
              {monthLabel}
            </button>
          );
        })}
      </div>
      <div className="flex justify-end gap-2 border-t border-slate-800 pt-3">
        {onCancel ? <button type="button" onClick={onCancel} className="app-button-secondary rounded-xl px-3 py-2 text-sm font-bold">Hủy</button> : null}
        <button type="button" onClick={apply} className="app-button-primary rounded-xl px-3 py-2 text-sm font-black">Áp dụng</button>
      </div>
    </div>
  );
}

export function AppMonthPicker({
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
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open]);

  return (
    <div className="relative">
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen(true)}
        aria-label={label || 'Chọn tháng'}
        className="flex w-full items-center justify-between gap-3 rounded-xl border border-slate-700/80 bg-slate-950/60 px-3 py-2 text-left shadow-sm shadow-slate-950/15 transition-colors hover:border-sky-400/60 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-400/70 disabled:cursor-not-allowed disabled:opacity-50"
      >
        <span className="min-w-0">
          {label ? <span className="mb-0.5 block text-[10px] font-black uppercase tracking-wider text-slate-500">{label}</span> : null}
          <span className="block truncate text-sm font-black text-slate-100">{formatMonthValue(value)}</span>
        </span>
        <CalendarDays size={16} className="shrink-0 text-sky-300" />
      </button>

      {open ? (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/50 p-3 backdrop-blur-sm" onClick={() => setOpen(false)}>
          <div className="w-full max-w-sm rounded-2xl border border-slate-700 bg-slate-950 shadow-2xl" onClick={event => event.stopPropagation()}>
            <div className="flex items-center justify-between gap-3 border-b border-slate-800 px-4 py-3">
              <div>
                <h3 className="text-base font-black text-white">Chọn tháng</h3>
                <p className="text-xs font-bold text-slate-500">Chọn tháng rồi bấm Áp dụng.</p>
              </div>
              <button type="button" onClick={() => setOpen(false)} className="app-button-secondary rounded-lg p-2" aria-label="Đóng chọn tháng">
                <X size={16} />
              </button>
            </div>
            <div className="p-4">
              <AppMonthPickerPanel
                value={value}
                onChange={nextValue => {
                  onChange(nextValue);
                  setOpen(false);
                }}
                onCancel={() => setOpen(false)}
                minYear={minYear}
                maxYear={maxYear}
              />
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
