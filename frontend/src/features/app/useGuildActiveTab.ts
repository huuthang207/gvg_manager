import React from 'react';
import type { AppStateResponse } from '../../services/apiTypes.ts';
import type { DiscordUser } from '../../services/discordApi.ts';
import { clearStoredActiveTab, readStoredActiveTab, Tab, writeStoredActiveTab } from './activeTabStorage.ts';

interface UseGuildActiveTabParams {
  currentUser: DiscordUser | null;
  currentGuild: AppStateResponse['guild'] | null;
  permissions: string[];
}

export function useGuildActiveTab({ currentUser, currentGuild, permissions }: UseGuildActiveTabParams) {
  const [activeTab, setActiveTab] = React.useState<Tab>('dashboard');

  React.useEffect(() => {
    if (!currentUser || !currentGuild) {
      setActiveTab('dashboard');
      return;
    }

    const canManageAttendance = permissions.includes('manage:lineup');
    const storedTab = readStoredActiveTab(currentUser.id, currentGuild.id);
    setActiveTab(storedTab && (storedTab !== 'attendance' || canManageAttendance) ? storedTab : 'dashboard');
  }, [currentGuild?.id, currentUser?.id]);

  const updateActiveTab = React.useCallback((tab: Tab) => {
    if (tab === 'attendance' && !permissions.includes('manage:lineup')) return;

    setActiveTab(tab);
    if (currentUser && currentGuild) {
      writeStoredActiveTab(currentUser.id, currentGuild.id, tab);
    }
  }, [currentGuild, currentUser, permissions]);

  const clearActiveTabState = React.useCallback(() => {
    if (currentUser && currentGuild) {
      clearStoredActiveTab(currentUser.id, currentGuild.id);
    }
    setActiveTab('dashboard');
  }, [currentGuild, currentUser]);

  return { activeTab, updateActiveTab, clearActiveTabState };
}
