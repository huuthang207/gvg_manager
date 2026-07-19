import { useCallback } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import type { Member } from '../../types.ts';
import type { AppStateResponse, GvgLineup } from '../../services/apiTypes.ts';
import { getAppState } from '../../services/discordApi.ts';
import { replaceMemberPool } from '../members/memberPoolUtils.ts';

interface UseAppStateLoaderParams {
  setMemberPool: Dispatch<SetStateAction<Member[]>>;
  setLastSyncedAt: Dispatch<SetStateAction<string | null>>;
  setRoleConfig: Dispatch<SetStateAction<AppStateResponse['roleConfig']>>;
  setCurrentGuild: Dispatch<SetStateAction<AppStateResponse['guild'] | null>>;
  setCurrentRole: Dispatch<SetStateAction<AppStateResponse['currentRole']>>;
  setPermissions: Dispatch<SetStateAction<string[]>>;
  setCurrentUser: Dispatch<SetStateAction<AppStateResponse['user']>>;
  setAttendance: Dispatch<SetStateAction<AppStateResponse['attendance']>>;
  setGvgLineup: Dispatch<SetStateAction<GvgLineup | null>>;
}

export function useAppStateLoader({ setMemberPool, setLastSyncedAt, setRoleConfig, setCurrentGuild, setCurrentRole, setPermissions, setCurrentUser, setAttendance, setGvgLineup }: UseAppStateLoaderParams) {
  const applyAppState = useCallback(async (state: Awaited<ReturnType<typeof getAppState>>) => {
    setMemberPool(prev => replaceMemberPool(prev, state.members));
    setLastSyncedAt(state.lastSyncedAt);
    setRoleConfig(state.roleConfig);
    setCurrentGuild(state.guild ?? null);
    setCurrentRole(state.currentRole ?? null);
    setPermissions(state.permissions ?? []);
    setAttendance(state.attendance);
    setGvgLineup(state.gvgLineup);
  }, [setAttendance, setCurrentGuild, setCurrentRole, setGvgLineup, setLastSyncedAt, setMemberPool, setPermissions, setRoleConfig]);

  const loadAppState = useCallback(async () => {
    const state = await getAppState();
    if (state.user) setCurrentUser(state.user);
    await applyAppState(state);
    return state;
  }, [applyAppState, setCurrentUser]);

  return { applyAppState, loadAppState };
}
