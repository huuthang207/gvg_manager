import { Lock, LockOpen, ShieldAlert } from 'lucide-react';
import type { AppStateResponse } from '../../services/apiTypes.ts';
import type { Tab } from './activeTabStorage.ts';

interface AppHeaderProps {
  activeTab: Tab;
  canManageLineup: boolean;
  lineupLock: AppStateResponse['lineupLock'];
  lineupLockActionLoading: boolean;
  onAcquireLineupLock: () => void;
  onReleaseLineupLock: () => void;
  onOverrideLineupLock: () => void;
}

export function AppHeader({
  activeTab,
  canManageLineup,
  lineupLock,
  lineupLockActionLoading,
  onAcquireLineupLock,
  onReleaseLineupLock,
  onOverrideLineupLock,
}: AppHeaderProps) {
  return (
    <header className="h-14 flex items-center justify-between border-b border-slate-800/80 bg-slate-950/45 px-6 backdrop-blur-md z-10 shrink-0">
      <div className="flex items-center gap-4">
        <h1 className="text-lg font-bold text-white">
          {activeTab === 'dashboard' ? 'Quản Lý Thành Viên' : activeTab === 'teams' ? 'Sắp Xếp Đội Hình' : 'Điểm Danh Bang Chiến'}
        </h1>
      </div>

      <div className="flex items-center gap-3">
        {activeTab === 'teams' && canManageLineup && (
          <div className="flex items-center gap-1.5">
            <div
              className={`flex min-w-0 items-center gap-2 rounded-lg border px-2.5 py-1.5 ${lineupLock?.isHeldByMe ? 'border-emerald-400/25 bg-emerald-500/10 text-emerald-200' : lineupLock ? 'border-amber-400/25 bg-amber-500/10 text-amber-200' : 'border-sky-400/25 bg-sky-500/10 text-sky-200'}`}
              title={lineupLock?.isHeldByMe ? 'Người khác vẫn có thể xem cập nhật realtime nhưng không thể thay đổi.' : lineupLock ? 'Đội hình đang được khóa bởi người khác.' : 'Bấm bắt đầu để khóa quyền thay đổi đội hình cho phiên của bạn.'}
            >
              {lineupLock?.isHeldByMe ? <LockOpen size={14} className="shrink-0" /> : lineupLock ? <Lock size={14} className="shrink-0" /> : <ShieldAlert size={14} className="shrink-0" />}
              <span className="max-w-44 truncate text-[11px] font-black uppercase tracking-wider">
                {lineupLock?.isHeldByMe ? 'Đang chỉnh sửa' : lineupLock ? `Khóa bởi ${lineupLock.holderName}` : 'Chế độ xem'}
              </span>
            </div>

            {lineupLock?.isHeldByMe ? (
              <button
                onClick={onReleaseLineupLock}
                disabled={lineupLockActionLoading}
                className="rounded-lg border border-emerald-400/30 bg-emerald-500/12 px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider text-emerald-200 transition-colors hover:border-emerald-300/50 hover:bg-emerald-500/18 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Kết thúc
              </button>
            ) : (
              <>
                <button
                  onClick={onAcquireLineupLock}
                  disabled={lineupLockActionLoading || !!lineupLock}
                  className="rounded-lg border border-sky-400/30 bg-sky-500/12 px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider text-sky-200 transition-colors hover:border-sky-300/50 hover:bg-sky-500/18 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Bắt đầu
                </button>
                {lineupLock?.canOverride && (
                  <button
                    onClick={onOverrideLineupLock}
                    disabled={lineupLockActionLoading}
                    className="rounded-lg border border-amber-400/30 bg-amber-500/12 px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider text-amber-200 transition-colors hover:border-amber-300/50 hover:bg-amber-500/18 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Chiếm quyền
                  </button>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </header>
  );
}
