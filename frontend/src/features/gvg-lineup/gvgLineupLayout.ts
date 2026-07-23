import type { GvgLineup, GvgLineupDivision } from '../../services/apiTypes.ts';
import type { Member } from '../../shared/types/member.ts';

export const SQUADS_PER_DIVISION = 5;
export const MIN_DIVISIONS = 1;
export const MAX_DIVISIONS = 5;
export const SQUAD_CAPACITY = 6;

export function normalizeDivisions(divisions: GvgLineupDivision[]) {
  return divisions
    .filter(division => division.squads.length > 0)
    .map((division, orderIndex) => ({
      ...division,
      orderIndex,
      squads: division.squads.map((squad, squadIndex) => ({ ...squad, orderIndex: squadIndex })),
    }));
}

export function moveSquad(lineup: GvgLineup, squadNumber: number, targetDivisionIndex: number, targetSquadIndex: number) {
  const divisions = lineup.divisions.map(division => ({ ...division, squads: [...division.squads] }));
  const sourceDivisionIndex = divisions.findIndex(division => division.squads.some(squad => squad.squadNumber === squadNumber));
  if (sourceDivisionIndex < 0 || !divisions[targetDivisionIndex]) return lineup;

  const sourceDivision = divisions[sourceDivisionIndex];
  const sourceSquadIndex = sourceDivision.squads.findIndex(squad => squad.squadNumber === squadNumber);
  const [squad] = sourceDivision.squads.splice(sourceSquadIndex, 1);
  const destination = divisions[targetDivisionIndex];
  if (sourceDivisionIndex !== targetDivisionIndex && destination.squads.length >= SQUADS_PER_DIVISION) return lineup;
  const adjustedTargetIndex = sourceDivisionIndex === targetDivisionIndex && sourceSquadIndex < targetSquadIndex ? targetSquadIndex - 1 : targetSquadIndex;
  destination.squads.splice(Math.max(0, Math.min(adjustedTargetIndex, destination.squads.length)), 0, squad);

  const normalized = normalizeDivisions(divisions);
  return normalized.length < MIN_DIVISIONS ? lineup : { divisions: normalized };
}

export function canSquadCreateGvgDivision(lineup: GvgLineup, squadNumber: number) {
  if (lineup.divisions.length >= MAX_DIVISIONS) return false;
  const sourceDivision = lineup.divisions.find(division => division.squads.some(squad => squad.squadNumber === squadNumber));
  return Boolean(sourceDivision && sourceDivision.squads.length >= 2);
}

export function moveSquadToNewDivision(lineup: GvgLineup, squadNumber: number) {
  if (!canSquadCreateGvgDivision(lineup, squadNumber)) return lineup;
  const sourceDivision = lineup.divisions.find(division => division.squads.some(squad => squad.squadNumber === squadNumber));
  const squad = sourceDivision?.squads.find(item => item.squadNumber === squadNumber);
  if (!sourceDivision || !squad) return lineup;
  const divisions = lineup.divisions.map(division => ({ ...division, squads: division.squads.filter(item => item.squadNumber !== squadNumber) }));
  divisions.push({ id: `new-${squadNumber}`, orderIndex: divisions.length, note: null, squads: [{ ...squad, orderIndex: 0 }] });
  return { divisions: normalizeDivisions(divisions) };
}

export function getAssignedMemberIds(lineup: GvgLineup) {
  return new Set(lineup.divisions.flatMap(division => division.squads.flatMap(squad => squad.slots.flatMap(slot => slot.memberId ? [slot.memberId] : []))));
}

export function getEffectiveGvgClass(selectedClass: string | null | undefined, memberClassType: string | null | undefined) {
  return selectedClass ?? memberClassType ?? null;
}

export function getAvailableGvgMembers(members: Member[], assignedMemberIds: Set<string>, currentMemberId: string | null, classFilter: string | null) {
  return members.filter(member =>
    member.active !== false
    && (member.id === currentMemberId || !assignedMemberIds.has(member.id))
    && (!classFilter || member.classType === classFilter),
  );
}

export function filterGvgMembersByName(members: Member[], query: string) {
  const normalizedQuery = query.trim().toLocaleLowerCase('vi');
  if (!normalizedQuery) return members;
  return members.filter(member => member.name.toLocaleLowerCase('vi').includes(normalizedQuery));
}

export function setSquadMember(lineup: GvgLineup, squadNumber: number, slotIndex: number, member: { id: string; name: string; classType: string } | null) {
  if (slotIndex < 0 || slotIndex >= SQUAD_CAPACITY) return lineup;
  if (member && lineup.divisions.some(division => division.squads.some(squad => squad.slots.some((slot, index) => slot.memberId === member.id && (squad.squadNumber !== squadNumber || index !== slotIndex))))) return lineup;

  return {
    divisions: lineup.divisions.map(division => ({
      ...division,
      squads: division.squads.map(squad => squad.squadNumber !== squadNumber ? squad : {
        ...squad,
        slots: squad.slots.map((slot, index) => index === slotIndex ? { memberId: member?.id ?? null, member } : slot),
      }),
    })),
  };
}

export function clearSquadLocal(lineup: GvgLineup, squadNumber: number) {
  return {
    divisions: lineup.divisions.map(division => ({
      ...division,
      squads: division.squads.map(squad => squad.squadNumber !== squadNumber ? squad : {
        ...squad,
        slots: squad.slots.map(() => ({ memberId: null, member: null })),
      }),
    })),
  };
}
