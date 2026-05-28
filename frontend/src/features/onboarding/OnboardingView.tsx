import React from 'react';
import type { AppStateResponse, SystemAdminRole } from '../../services/discordApi.ts';
import type { AccessibleGuild } from '../../shared/types/guild.ts';
import { useGuildOnboarding } from './useGuildOnboarding.ts';

interface OnboardingViewProps {
  currentGuild: AppStateResponse['guild'] | null;
  accessibleGuilds: AccessibleGuild[];
  blockedReason: string | null;
  systemAdminRole: SystemAdminRole | null;
  switchingGuild: boolean;
  applyAppState: (state: AppStateResponse) => Promise<void>;
  loadAppState: () => Promise<AppStateResponse>;
  loadAccessibleGuilds: () => Promise<void>;
  onGuildSwitch: (guildId: string) => Promise<void>;
  onOpenAdmin: () => void;
  onOpenDashboard: () => void;
  onOpenSettings: () => void;
  onOpenAttendance: () => void;
  onLogout: () => void;
  onConnected: (state: AppStateResponse) => void;
}

const checklist = [
  { key: 'roleConfigComplete', label: 'Role môn phái', description: 'Map role Discord sang các môn phái để đồng bộ thành viên.', action: 'Cấu hình members' },
  { key: 'requiredRolesConfigured', label: 'Role thành viên cần import', description: 'Chọn role bắt buộc để lọc danh sách bang viên.', action: 'Cấu hình members' },
  { key: 'accessRolesConfigured', label: 'Role truy cập app', description: 'Thiết lập role manager/member được phép dùng GvG Manager.', action: 'Cấu hình quyền' },
  { key: 'attendanceChannelConfigured', label: 'Kênh điểm danh', description: 'Chọn kênh Discord để bot gửi phiên điểm danh GvG.', action: 'Mở điểm danh' },
] as const;

export function OnboardingView({
  currentGuild,
  accessibleGuilds,
  blockedReason,
  systemAdminRole,
  switchingGuild,
  applyAppState,
  loadAppState,
  loadAccessibleGuilds,
  onGuildSwitch,
  onOpenAdmin,
  onOpenDashboard,
  onOpenSettings,
  onOpenAttendance,
  onLogout,
  onConnected,
}: OnboardingViewProps) {
  const {
    manageableGuilds,
    connectedGuilds,
    availableLoading,
    actionLoading,
    error,
    botRequired,
    onboardingState,
    onboardingStateLoading,
    loadAvailableGuilds,
    connect,
    retryBotRequiredGuild,
    complete,
    clearBotRequired,
  } = useGuildOnboarding({ currentGuild, applyAppState, loadAccessibleGuilds, loadAppState, onConnected });

  const incompleteItems = onboardingState
    ? checklist.filter(item => !onboardingState[item.key])
    : [];
  const setupComplete = Boolean(onboardingState && incompleteItems.length === 0);
  const hasAccessibleGuilds = accessibleGuilds.length > 0;
  const showChecklist = Boolean(currentGuild && !currentGuild.onboardingCompletedAt);

  const handleItemAction = (key: typeof checklist[number]['key']) => {
    if (key === 'attendanceChannelConfigured') {
      onOpenAttendance();
      return;
    }
    onOpenSettings();
  };

  return (
    <div className="app-shell min-h-screen overflow-y-auto text-slate-100 p-6 font-sans">
      <div className="mx-auto flex min-h-[calc(100vh-3rem)] w-full max-w-6xl flex-col justify-center gap-6">
        <header className="rounded-3xl border border-slate-800/90 bg-slate-950/70 p-6 shadow-2xl shadow-slate-950/30">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.35em] text-amber-300">Guild onboarding</p>
              <h1 className="mt-3 text-3xl font-black tracking-tight text-white">Kết nối Discord server</h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">
                Chọn server bạn quản lý, thêm bot nếu cần, rồi hoàn tất các bước cấu hình để bắt đầu dùng GvG Manager.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {systemAdminRole && (
                <button onClick={onOpenAdmin} className="rounded-xl bg-violet-500 px-4 py-3 text-xs font-black uppercase tracking-widest text-white transition-colors hover:bg-violet-400">
                  Admin Console
                </button>
              )}
              <button onClick={onLogout} className="rounded-xl bg-slate-800 px-4 py-3 text-xs font-bold text-slate-200 transition-colors hover:bg-slate-700">
                Đăng xuất
              </button>
            </div>
          </div>
        </header>

        {(error || blockedReason) && (
          <div className="rounded-2xl border border-amber-400/30 bg-amber-950/20 px-4 py-3 text-sm text-amber-100">
            {error || blockedReason}
          </div>
        )}

        {showChecklist ? (
          <section className="grid gap-6 lg:grid-cols-[1fr_360px]">
            <div className="rounded-3xl border border-slate-800/90 bg-slate-950/70 p-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.3em] text-emerald-300">Server đã kết nối</p>
                  <h2 className="mt-2 text-2xl font-black text-white">{currentGuild?.name}</h2>
                  <p className="mt-2 text-sm text-slate-400">Hoàn tất checklist để ẩn màn hình onboarding cho server này.</p>
                </div>
                <button onClick={onOpenDashboard} className="rounded-xl bg-slate-800 px-4 py-2 text-xs font-bold text-slate-200 hover:bg-slate-700">
                  Vào app
                </button>
              </div>

              <div className="mt-6 space-y-3">
                {onboardingStateLoading && <p className="text-sm text-slate-400">Đang tải checklist...</p>}
                {checklist.map(item => {
                  const done = Boolean(onboardingState?.[item.key]);
                  return (
                    <div key={item.key} className={`rounded-2xl border p-4 ${done ? 'border-emerald-400/30 bg-emerald-950/15' : 'border-slate-800 bg-slate-900/60'}`}>
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className={`h-2.5 w-2.5 rounded-full ${done ? 'bg-emerald-300' : 'bg-amber-300'}`} />
                            <h3 className="font-black text-white">{item.label}</h3>
                          </div>
                          <p className="mt-1 text-sm text-slate-400">{item.description}</p>
                        </div>
                        {!done && (
                          <button onClick={() => handleItemAction(item.key)} className="rounded-xl bg-amber-500 px-4 py-2 text-xs font-black uppercase tracking-widest text-slate-950 hover:bg-amber-400">
                            {item.action}
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="mt-6 flex flex-wrap gap-3">
                <button
                  onClick={complete}
                  disabled={actionLoading || onboardingStateLoading || !setupComplete}
                  className="rounded-xl bg-emerald-500 px-5 py-3 text-xs font-black uppercase tracking-widest text-slate-950 transition-colors hover:bg-emerald-400 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-400"
                >
                  Hoàn tất onboarding
                </button>
                {!setupComplete && <p className="self-center text-xs text-slate-500">Cần hoàn tất các mục còn thiếu trước khi đóng onboarding.</p>}
              </div>
            </div>

            <aside className="rounded-3xl border border-slate-800/90 bg-slate-950/70 p-6">
              <p className="text-xs font-black uppercase tracking-[0.3em] text-slate-500">Gợi ý</p>
              <ul className="mt-4 space-y-3 text-sm text-slate-400">
                <li>• Nếu vừa sửa cấu hình, quay lại đây sau khi lưu để checklist tự refresh khi app state cập nhật.</li>
                <li>• Bạn vẫn có thể vào app trong lúc cấu hình, nhưng onboarding sẽ còn hiện cho tới khi hoàn tất.</li>
                <li>• Billing/subscription được tạo tự động khi server được kết nối.</li>
              </ul>
            </aside>
          </section>
        ) : (
          <section className="grid gap-6 lg:grid-cols-[1fr_360px]">
            <div className="rounded-3xl border border-slate-800/90 bg-slate-950/70 p-6">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.3em] text-slate-500">Server khả dụng</p>
                  <h2 className="mt-2 text-2xl font-black text-white">Chọn server để kết nối</h2>
                </div>
                <button onClick={loadAvailableGuilds} disabled={availableLoading} className="rounded-xl bg-slate-800 px-4 py-2 text-xs font-bold text-slate-200 hover:bg-slate-700 disabled:opacity-60">
                  {availableLoading ? 'Đang tải...' : 'Tải lại'}
                </button>
              </div>

              <div className="mt-6 space-y-3">
                {availableLoading && <p className="text-sm text-slate-400">Đang tải danh sách server Discord...</p>}
                {!availableLoading && manageableGuilds.length === 0 && (
                  <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 text-sm text-slate-400">
                    Không tìm thấy server Discord nào bạn có quyền owner hoặc Manage Server. Hãy kiểm tra quyền Discord hoặc liên hệ system admin.
                  </div>
                )}
                {manageableGuilds.map(guild => (
                  <div key={guild.discordGuildId} className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="truncate font-black text-white">{guild.name}</h3>
                          {guild.owner && <span className="rounded-full bg-violet-500/15 px-2 py-1 text-[10px] font-black uppercase tracking-widest text-violet-200">Owner</span>}
                          {guild.isConnected && <span className="rounded-full bg-emerald-500/15 px-2 py-1 text-[10px] font-black uppercase tracking-widest text-emerald-200">Đã kết nối</span>}
                          {!guild.botPresent && <span className="rounded-full bg-amber-500/15 px-2 py-1 text-[10px] font-black uppercase tracking-widest text-amber-200">Thiếu bot</span>}
                        </div>
                        <p className="mt-1 text-xs text-slate-500">Discord ID: {guild.discordGuildId}</p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {guild.localGuildId && hasAccessibleGuilds && accessibleGuilds.some(item => item.id === guild.localGuildId) && (
                          <button onClick={() => onGuildSwitch(guild.localGuildId!)} disabled={switchingGuild} className="rounded-xl bg-slate-800 px-4 py-2 text-xs font-bold text-slate-200 hover:bg-slate-700 disabled:opacity-60">
                            Chọn server
                          </button>
                        )}
                        <button onClick={() => connect(guild)} disabled={actionLoading} className="rounded-xl bg-amber-500 px-4 py-2 text-xs font-black uppercase tracking-widest text-slate-950 hover:bg-amber-400 disabled:opacity-60">
                          {guild.botPresent ? 'Kết nối' : 'Thêm bot'}
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <aside className="space-y-4">
              {botRequired && (
                <div className="rounded-3xl border border-amber-400/30 bg-amber-950/20 p-6">
                  <p className="text-xs font-black uppercase tracking-[0.3em] text-amber-300">Cần thêm bot</p>
                  <h3 className="mt-2 text-xl font-black text-white">{botRequired.guild.name}</h3>
                  <p className="mt-2 text-sm text-amber-100/80">Mở link invite, thêm bot vào server, rồi quay lại bấm thử lại.</p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {botRequired.inviteUrl && (
                      <a href={botRequired.inviteUrl} target="_blank" rel="noreferrer" className="rounded-xl bg-amber-500 px-4 py-2 text-xs font-black uppercase tracking-widest text-slate-950 hover:bg-amber-400">
                        Mở invite
                      </a>
                    )}
                    <button onClick={retryBotRequiredGuild} disabled={actionLoading} className="rounded-xl bg-slate-800 px-4 py-2 text-xs font-bold text-slate-200 hover:bg-slate-700 disabled:opacity-60">
                      Thử lại
                    </button>
                    <button onClick={clearBotRequired} className="rounded-xl px-4 py-2 text-xs font-bold text-slate-400 hover:text-slate-200">
                      Đóng
                    </button>
                  </div>
                </div>
              )}

              <div className="rounded-3xl border border-slate-800/90 bg-slate-950/70 p-6">
                <p className="text-xs font-black uppercase tracking-[0.3em] text-slate-500">Server đã kết nối</p>
                {connectedGuilds.length === 0 ? (
                  <p className="mt-4 text-sm text-slate-400">Chưa có server nào trong danh sách Discord của bạn được kết nối.</p>
                ) : (
                  <div className="mt-4 space-y-2">
                    {connectedGuilds.map(guild => (
                      <div key={guild.discordGuildId} className="rounded-xl bg-slate-900/60 px-3 py-2 text-sm text-slate-300">
                        {guild.name}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </aside>
          </section>
        )}
      </div>
    </div>
  );
}
