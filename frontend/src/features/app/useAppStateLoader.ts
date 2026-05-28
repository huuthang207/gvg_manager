import { useCallback } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import { Member, Skill, SquadGroup } from '../../types.ts';
import { AppStateResponse, getAppState } from '../../services/discordApi.ts';
import { replaceMemberPoolPreservingSkills } from '../members/memberPoolUtils.ts';

interface UseAppStateLoaderParams {
  setMemberPool: Dispatch<SetStateAction<Member[]>>;
  setSkills: Dispatch<SetStateAction<Skill[]>>;
  setLastSyncedAt: Dispatch<SetStateAction<string | null>>;
  setRoleConfig: Dispatch<SetStateAction<AppStateResponse['roleConfig']>>;
  setCurrentGuild: Dispatch<SetStateAction<AppStateResponse['guild'] | null>>;
  setCurrentRole: Dispatch<SetStateAction<AppStateResponse['currentRole']>>;
  setPermissions: Dispatch<SetStateAction<string[]>>;
  setSquadGroups: Dispatch<SetStateAction<SquadGroup[]>>;
  setCurrentUser: Dispatch<SetStateAction<AppStateResponse['user']>>;
  setAttendance: Dispatch<SetStateAction<AppStateResponse['attendance']>>;
  setLineupLock: Dispatch<SetStateAction<AppStateResponse['lineupLock']>>;
  setSubscription: Dispatch<SetStateAction<AppStateResponse['subscription']>>;
  setAppSystemAdmin: Dispatch<SetStateAction<AppStateResponse['systemAdmin']>>;
  setAppNeedsOnboarding: Dispatch<SetStateAction<boolean>>;
  setActiveGuildId?: Dispatch<SetStateAction<string | null>>;
}

export function useAppStateLoader(params: UseAppStateLoaderParams) {
  const {
    setMemberPool,
    setSkills,
    setLastSyncedAt,
    setRoleConfig,
    setCurrentGuild,
    setCurrentRole,
    setPermissions,
    setSquadGroups,
    setCurrentUser,
    setAttendance,
    setLineupLock,
    setSubscription,
    setAppSystemAdmin,
    setAppNeedsOnboarding,
    setActiveGuildId,
  } = params;

  const preloadSkillLogos = (skillList: Skill[]) => {
    skillList.forEach(skill => {
      const image = new Image();
      image.src = skill.logo;
    });
  };

  const loadDefaultSkills = useCallback(async () => {
    try {
      const response = await fetch('/skills.json');
      if (!response.ok) return [];
      const defaultSkills = await response.json() as Skill[];
      preloadSkillLogos(defaultSkills);
      return defaultSkills;
    } catch {
      return [];
    }
  }, []);

  const resolveSkills = useCallback(async (persistedSkills: Skill[]) => {
    const defaultSkills = await loadDefaultSkills();
    const skillsById = new Map(defaultSkills.map(skill => [skill.id, skill]));

    persistedSkills.forEach(skill => {
      skillsById.set(skill.id, skill);
    });

    return Array.from(skillsById.values());
  }, [loadDefaultSkills]);

  const applyAppState = useCallback(async (state: Awaited<ReturnType<typeof getAppState>>) => {
    setMemberPool(prev => replaceMemberPoolPreservingSkills(prev, state.members));
    setSkills(await resolveSkills(state.skills));
    setLastSyncedAt(state.lastSyncedAt);
    setRoleConfig(state.roleConfig);
    setCurrentGuild(state.guild ?? null);
    setActiveGuildId?.(state.guild?.id ?? null);
    setCurrentRole(state.currentRole ?? null);
    setPermissions(state.permissions ?? []);
    setSquadGroups(state.squadGroups || []);
    setAttendance(state.attendance);
    setLineupLock(state.lineupLock ?? null);
    setSubscription(state.subscription ?? null);
    setAppSystemAdmin(state.systemAdmin ?? null);
    setAppNeedsOnboarding(!!state.needsOnboarding);
  }, [resolveSkills, setActiveGuildId, setAppNeedsOnboarding, setAppSystemAdmin, setAttendance, setCurrentGuild, setCurrentRole, setLastSyncedAt, setLineupLock, setMemberPool, setPermissions, setRoleConfig, setSkills, setSquadGroups, setSubscription]);

  const loadAppState = useCallback(async () => {
    const state = await getAppState();
    if (state.user) {
      setCurrentUser(state.user);
    }
    await applyAppState(state);
    return state;
  }, [applyAppState, setCurrentUser]);

  return { applyAppState, loadAppState };
}
