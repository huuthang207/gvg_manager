import React from 'react';
import { Archive, PlusCircle, RotateCcw } from 'lucide-react';

interface LineupEntryMenuProps {
  hasCurrentLineup: boolean;
  canCreateLineup: boolean;
  canRestoreSnapshots: boolean;
  snapshotCount: number;
  snapshotsLoading: boolean;
  onCreateNew: () => void;
  onUseSaved: () => void;
}

export const LineupEntryMenu: React.FC<LineupEntryMenuProps> = ({
  hasCurrentLineup,
  canCreateLineup,
  canRestoreSnapshots,
  snapshotCount,
  snapshotsLoading,
  onCreateNew,
  onUseSaved,
}) => {
  const restoreDisabled = !canRestoreSnapshots || (!snapshotsLoading && snapshotCount === 0);

  return (
    <main className="h-full min-h-0 flex-1 overflow-y-auto bg-slate-950/15 p-4 custom-scrollbar md:p-6">
      <div className="mx-auto flex min-h-full max-w-5xl flex-col justify-center py-8">
        <div className="mb-6 text-center">
          <p className="text-[11px] font-black uppercase tracking-[0.28em] text-sky-300">Đội Hình</p>
          <h2 className="mt-3 text-2xl font-black uppercase tracking-[0.18em] text-white">Bạn muốn bắt đầu như thế nào?</h2>
          <p className="mx-auto mt-3 max-w-2xl text-sm text-slate-400">
            Tạo một đội hình mới từ đầu hoặc khôi phục lại một đội hình đã lưu trước đó.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <button
            onClick={onCreateNew}
            disabled={!canCreateLineup}
            className="group rounded-2xl border border-sky-400/25 bg-slate-900/60 p-6 text-left shadow-xl shadow-slate-950/20 transition-all hover:-translate-y-0.5 hover:border-sky-300/45 hover:bg-sky-500/10 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0"
          >
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-sky-400/30 bg-sky-500/15 text-sky-200 transition-colors group-hover:bg-sky-500/25">
                <PlusCircle size={22} />
              </div>
              <div className="min-w-0">
                <h3 className="text-base font-black uppercase tracking-[0.16em] text-white">Tạo đội hình mới</h3>
                <p className="mt-2 text-sm leading-6 text-slate-300">Thiết lập số đoàn, số đội rồi bắt đầu sắp xếp thành viên từ đầu.</p>
                {hasCurrentLineup && (
                  <p className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-amber-500/25 bg-amber-500/10 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-amber-300">
                    <RotateCcw size={11} />
                    Sẽ thay thế đội hình hiện tại
                  </p>
                )}
              </div>
            </div>
          </button>

          <button
            onClick={onUseSaved}
            disabled={restoreDisabled}
            className="group rounded-2xl border border-emerald-400/25 bg-slate-900/60 p-6 text-left shadow-xl shadow-slate-950/20 transition-all hover:-translate-y-0.5 hover:border-emerald-300/45 hover:bg-emerald-500/10 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0"
          >
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-emerald-400/30 bg-emerald-500/15 text-emerald-200 transition-colors group-hover:bg-emerald-500/25">
                <Archive size={22} />
              </div>
              <div className="min-w-0">
                <h3 className="text-base font-black uppercase tracking-[0.16em] text-white">Dùng đội hình đã lưu</h3>
                <p className="mt-2 text-sm leading-6 text-slate-300">Chọn một bản lưu để khôi phục lại đội hình và kỹ năng đã lưu.</p>
                <p className="mt-3 inline-flex rounded-full border border-emerald-500/25 bg-emerald-500/10 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-emerald-300">
                  {snapshotsLoading ? 'Đang tải bản lưu...' : `${snapshotCount} bản lưu`}
                </p>
              </div>
            </div>
          </button>
        </div>
      </div>
    </main>
  );
};
