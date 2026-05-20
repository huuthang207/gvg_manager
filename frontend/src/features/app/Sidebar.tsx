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
        <div className="w-10 h-10 rounded-xl bg-indigo-500/90 shadow-lg shadow-indigo-950/35 flex items-center justify-center">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="white">
            <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/>
          </svg>
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