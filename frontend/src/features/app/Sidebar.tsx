/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { ClipboardCheck, Users, LayoutGrid, UserCircle, LogOut } from 'lucide-react';
import { AppStateResponse, DiscordUser } from '../../services/discordApi.ts';
import { cn } from '../../lib/utils.ts';

type Tab = 'dashboard' | 'teams' | 'attendance';

interface SidebarProps {
  activeTab: Tab;
  onTabChange: (tab: Tab) => void;
  currentUser: DiscordUser | null;
  onLogout: () => void;
  currentGuild: AppStateResponse['guild'];
  canManageAttendance: boolean;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  onTabChange,
  currentUser,
  onLogout,
  currentGuild,
  canManageAttendance,
}) => {
  const guildIconUrl = currentGuild?.icon
    ? `https://cdn.discordapp.com/icons/${currentGuild.discordGuildId}/${currentGuild.icon}.png?size=96`
    : null;

  const navItems: { id: Tab; label: string; icon: React.ReactNode }[] = [
    {
      id: 'dashboard',
      label: 'Thông tin',
      icon: <Users size={20} />,
    },
    {
      id: 'teams',
      label: 'Đội Hình',
      icon: <LayoutGrid size={20} />,
    },
    ...(canManageAttendance ? [{
      id: 'attendance' as const,
      label: 'Điểm danh',
      icon: <ClipboardCheck size={20} />,
    }] : []),
  ];

  return (
    <aside className="w-16 border-r border-slate-800/80 bg-slate-950/55 flex flex-col h-full shrink-0 relative z-40 backdrop-blur-md">
      <div className="h-14 flex items-center justify-center border-b border-slate-800/80">
        <div className="w-10 h-10 rounded-xl bg-slate-800 shadow-lg shadow-slate-950/35 flex items-center justify-center overflow-hidden border border-slate-700/70">
          {guildIconUrl ? (
            <img
              src={guildIconUrl}
              alt={currentGuild?.name || 'Discord server'}
              className="h-full w-full object-cover"
              referrerPolicy="no-referrer"
            />
          ) : (
            <span className="text-sm font-black text-slate-300">
              {currentGuild?.name?.[0]?.toUpperCase() || 'G'}
            </span>
          )}
        </div>
      </div>

      <nav className="flex-1 py-4 flex flex-col gap-2 px-2">
        {navItems.map(item => (
          <button
            key={item.id}
            onClick={() => onTabChange(item.id)}
            className={cn(
              'w-full aspect-square rounded-xl flex items-center justify-center transition-all',
              activeTab === item.id
                ? 'bg-sky-500/90 text-white shadow-lg shadow-sky-950/30'
                : 'text-slate-400 hover:bg-slate-800/80 hover:text-slate-100'
            )}
          >
            {item.icon}
          </button>
        ))}
      </nav>

      <div className="border-t border-slate-800/80 p-3">
        {currentUser ? (
          <div className="flex flex-col items-center gap-2">
            <div className="w-10 h-10 rounded-full bg-slate-700 overflow-hidden flex items-center justify-center border-2 border-emerald-500">
              {currentUser.avatar ? (
                <img
                  src={`https://cdn.discordapp.com/avatars/${currentUser.id}/${currentUser.avatar}.png?size=64`}
                  alt=""
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <span className="text-sm font-bold text-slate-400">
                  {currentUser.username[0]?.toUpperCase()}
                </span>
              )}
            </div>
            <button
              onClick={onLogout}
              className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-all"
              title="Đăng xuất"
            >
              <LogOut size={16} />
            </button>
          </div>
        ) : (
          <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center">
            <UserCircle size={20} className="text-slate-600" />
          </div>
        )}
      </div>
    </aside>
  );
};