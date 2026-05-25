import React from 'react';
import type { Dispatch, SetStateAction } from 'react';
import type { Member, Skill, SquadGroup } from '../../types.ts';
import type { AppStateResponse, DiscordUser } from '../../services/apiTypes.ts';
import { AccessibleGuild, logoutDiscord } from '../../services/discordApi.ts';

interface UseAppSessionActionsParams {
  closeRealtimeConnection: () => void;
  clearActiveTabState: () => void;
  clearLineupWorkspaceUiState: () => void;
  releaseHeldLineupLock: () => void;
  resetSnapshots: () => void;
  setIsAuthenticated: Dispatch<SetStateAction<boolean>>;
  setCurrentUser: Dispatch<SetStateAction<DiscordUser | null>>;
  setMemberPool: Dispatch<SetStateAction<Member[]>>;
  setSkills: Dispatch<SetStateAction<Skill[]>>;
  setRoleConfig: Dispatch<SetStateAction<AppStateResponse['roleConfig']>>;
  setCurrentGuild: Dispatch<SetStateAction<AppStateResponse['guild'] | null>>;
  setCurrentRole: Dispatch<SetStateAction<AppStateResponse['currentRole']>>;
  setPermissions: Dispatch<SetStateAction<string[]>>;
  setLineupLock: Dispatch<SetStateAction<AppStateResponse['lineupLock']>>;
  setGvgParticipationStats: Dispatch<SetStateAction<Record<string, number>>>;
  setSquadGroups: Dispatch<SetStateAction<SquadGroup[]>>;
  setAccessibleGuilds: Dispatch<SetStateAction<AccessibleGuild[]>>;
}

export function useAppSessionActions({
  closeRealtimeConnection,
  clearActiveTabState,
  clearLineupWorkspaceUiState,
  releaseHeldLineupLock,
  resetSnapshots,
  setIsAuthenticated,
  setCurrentUser,
  setMemberPool,
  setSkills,
  setRoleConfig,
  setCurrentGuild,
  setCurrentRole,
  setPermissions,
  setLineupLock,
  setGvgParticipationStats,
  setSquadGroups,
  setAccessibleGuilds,
}: UseAppSessionActionsParams) {
  const handleLogout = React.useCallback(async () => {
    closeRealtimeConnection();
    clearActiveTabState();
    clearLineupWorkspaceUiState();
    releaseHeldLineupLock();
    try {
      await logoutDiscord();
    } catch (err) {
      console.error('Logout failed:', err);
    } finally {
      setIsAuthenticated(false);
      setCurrentUser(null);
      setMemberPool([]);
      setSkills([]);
      setRoleConfig(null);
      setCurrentGuild(null);
      setCurrentRole(null);
      setPermissions([]);
      setLineupLock(null);
      setGvgParticipationStats({});
      setSquadGroups([]);
      setAccessibleGuilds([]);
      resetSnapshots();
    }
  }, [
    clearActiveTabState,
    clearLineupWorkspaceUiState,
    closeRealtimeConnection,
    releaseHeldLineupLock,
    resetSnapshots,
    setAccessibleGuilds,
    setCurrentGuild,
    setCurrentRole,
    setCurrentUser,
    setGvgParticipationStats,
    setIsAuthenticated,
    setLineupLock,
    setMemberPool,
    setPermissions,
    setRoleConfig,
    setSkills,
    setSquadGroups,
  ]);

  return { handleLogout };
}
