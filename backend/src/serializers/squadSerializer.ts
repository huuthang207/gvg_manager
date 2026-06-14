type Slot = { slotType: string; slotIndex: number; memberId: string | null; assignmentNote?: string | null };
type SnapshotSlot = Slot & { skillIds?: string[] };

type TeamWithSlots = {
  id: string;
  name: string;
  orderIndex?: number;
  slots: Slot[];
};

type GroupWithTeams = {
  id: string;
  name: string;
  orderIndex?: number;
  leaderMemberId: string | null;
  teams: TeamWithSlots[];
};

export function toTeamSlotArrays(team: TeamWithSlots) {
  const memberIds = Array(6).fill('');

  for (const slot of team.slots) {
    if (slot.slotType === 'main' && slot.slotIndex < memberIds.length) {
      memberIds[slot.slotIndex] = slot.memberId ?? '';
    }
  }

  return {
    id: team.id,
    name: team.name,
    memberIds,
  };
}

export function toSnapshotTeamSlotArrays(team: Omit<TeamWithSlots, 'slots'> & { slots: SnapshotSlot[] }) {
  const slotArrays = toTeamSlotArrays(team);
  const slotSkills: Record<string, string[]> = {};

  for (const slot of team.slots) {
    if (slot.slotType === 'main' && slot.slotIndex < slotArrays.memberIds.length) {
      slotSkills[`main-${slot.slotIndex}`] = slot.skillIds ?? [];
    }
  }

  return {
    ...slotArrays,
    slotSkills,
  };
}

export function serializeSquadGroups(groups: GroupWithTeams[]) {
  return groups.map(group => ({
    id: group.id,
    name: group.name,
    leaderMemberId: group.leaderMemberId,
    teams: group.teams.map(toTeamSlotArrays),
  }));
}

export function serializeSnapshotSquadGroups(groups: Array<Omit<GroupWithTeams, 'teams'> & { teams: Array<Omit<TeamWithSlots, 'slots'> & { slots: SnapshotSlot[] }> }>) {
  return groups.map(group => ({
    id: group.id,
    name: group.name,
    leaderMemberId: group.leaderMemberId,
    teams: group.teams.map(toSnapshotTeamSlotArrays),
  }));
}

const divisionOrder: Record<string, number> = {
  'Thủ': 0,
  'Trợ': 1,
  'Công': 2,
};

export function serializeDivisions(
  teams: Array<{ divisionType: string; id: string; name: string; orderIndex: number; slots: Slot[] }>
) {
  if (teams.length === 0) return null;

  const divisions: Record<string, { type: string; teams: Array<{ id: string; name: string; memberIds: string[] }> }> = {};

  for (const team of teams.sort((a, b) => (divisionOrder[a.divisionType] ?? 99) - (divisionOrder[b.divisionType] ?? 99) || a.orderIndex - b.orderIndex)) {
    if (!divisions[team.divisionType]) {
      divisions[team.divisionType] = { type: team.divisionType, teams: [] };
    }

    divisions[team.divisionType].teams.push(toTeamSlotArrays(team));
  }

  return divisions;
}
