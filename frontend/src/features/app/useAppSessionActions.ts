import React from 'react';
import type { Dispatch, SetStateAction } from 'react';
import type { Member } from '../../types.ts';
import type { AppStateResponse, GvgLineup } from '../../services/apiTypes.ts';
import type { AccessibleGuild, DiscordUser } from '../../services/discordApi.ts';
import { logoutDiscord } from '../../services/discordApi.ts';

interface UseAppSessionActionsParams {
  closeRealtimeConnection: () => void;
  clearActiveTabState: () => void;
  setIsAuthenticated: Dispatch<SetStateAction<boolean>>;
  setCurrentUser: Dispatch<SetStateAction<DiscordUser | null>>;
  setMemberPool: Dispatch<SetStateAction<Member[]>>;
  setRoleConfig: Dispatch<SetStateAction<AppStateResponse['roleConfig']>>;
  setCurrentGuild: Dispatch<SetStateAction<AppStateResponse['guild'] | null>>;
  setCurrentRole: Dispatch<SetStateAction<AppStateResponse['currentRole']>>;
  setPermissions: Dispatch<SetStateAction<string[]>>;
  setGvgParticipationStats: Dispatch<SetStateAction<Record<string, number>>>;
  setGvgLineup: Dispatch<SetStateAction<GvgLineup | null>>;
  setAccessibleGuilds?: Dispatch<SetStateAction<AccessibleGuild[]>>;
}

export function useAppSessionActions({ closeRealtimeConnection, clearActiveTabState, setIsAuthenticated, setCurrentUser, setMemberPool, setRoleConfig, setCurrentGuild, setCurrentRole, setPermissions, setGvgParticipationStats, setGvgLineup, setAccessibleGuilds }: UseAppSessionActionsParams) {
  const handleLogout = React.useCallback(async () => {
    closeRealtimeConnection();
    clearActiveTabState();
    try {
      await logoutDiscord();
    } catch (err) {
      console.error('Logout failed:', err);
    } finally {
      setIsAuthenticated(false);
      setCurrentUser(null);
      setMemberPool([]);
      setRoleConfig(null);
      setCurrentGuild(null);
      setCurrentRole(null);
      setPermissions([]);
      setGvgParticipationStats({});
      setGvgLineup(null);
      setAccessibleGuilds?.([]);
    }
  }, [clearActiveTabState, closeRealtimeConnection, setAccessibleGuilds, setCurrentGuild, setCurrentRole, setCurrentUser, setGvgLineup, setGvgParticipationStats, setIsAuthenticated, setMemberPool, setPermissions, setRoleConfig]);

  return { handleLogout };
}
