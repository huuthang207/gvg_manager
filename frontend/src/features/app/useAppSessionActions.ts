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
  setActiveGuildId: Dispatch<SetStateAction<string | null>>;
  setNeedsOnboarding: Dispatch<SetStateAction<boolean>>;
  setAppNeedsOnboarding: Dispatch<SetStateAction<boolean>>;
  setSubscription: Dispatch<SetStateAction<AppStateResponse['subscription']>>;
  setAttendance: Dispatch<SetStateAction<AppStateResponse['attendance']>>;
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
  setActiveGuildId,
  setNeedsOnboarding,
  setAppNeedsOnboarding,
  setSubscription,
  setAttendance,
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
      setActiveGuildId(null);
      setCurrentRole(null);
      setPermissions([]);
      setLineupLock(null);
      setGvgParticipationStats({});
      setSquadGroups([]);
      setAccessibleGuilds([]);
      setNeedsOnboarding(false);
      setAppNeedsOnboarding(false);
      setSubscription(null);
      setAttendance({ config: null, activeSession: null, recentSessions: [] });
      resetSnapshots();
    }
  }, [
    clearActiveTabState,
    clearLineupWorkspaceUiState,
    closeRealtimeConnection,
    releaseHeldLineupLock,
    resetSnapshots,
    setAccessibleGuilds,
    setActiveGuildId,
    setAppNeedsOnboarding,
    setAttendance,
    setCurrentGuild,
    setCurrentRole,
    setCurrentUser,
    setGvgParticipationStats,
    setIsAuthenticated,
    setLineupLock,
    setNeedsOnboarding,
    setMemberPool,
    setPermissions,
    setRoleConfig,
    setSkills,
    setSquadGroups,
    setSubscription,
  ]);

  return { handleLogout };
}
