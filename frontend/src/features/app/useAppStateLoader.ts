import { useCallback } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import { Member, Skill, SquadGroup } from '../../types.ts';
import { AppStateResponse, getAppState } from '../../services/discordApi.ts';

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
    setMemberPool(prev => {
      const previousSkillsByMemberId = new Map(prev.map(member => [member.id, member.assignedSkills || []]));

      return state.members.map(member => {
        const assignedSkills = member.assignedSkills?.length
          ? member.assignedSkills
          : previousSkillsByMemberId.get(member.id) || [];

        return {
          ...member,
          assignedSkills,
          classType: member.classType as Member['classType'],
          previousClassType: member.previousClassType as Member['classType'] | null | undefined,
        };
      });
    });
    setSkills(await resolveSkills(state.skills));
    setLastSyncedAt(state.lastSyncedAt);
    setRoleConfig(state.roleConfig);
    setCurrentGuild(state.guild ?? null);
    setCurrentRole(state.currentRole ?? null);
    setPermissions(state.permissions ?? []);
    setSquadGroups(state.squadGroups || []);
    setAttendance(state.attendance);
    setLineupLock(state.lineupLock ?? null);
  }, [resolveSkills, setAttendance, setCurrentGuild, setCurrentRole, setLastSyncedAt, setLineupLock, setMemberPool, setPermissions, setRoleConfig, setSkills, setSquadGroups]);

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
