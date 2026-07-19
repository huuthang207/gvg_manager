import type { GvgLineup, GvgLineupDivision } from '../../services/apiTypes.ts';
import type { GvgLineupSavePayload } from '../../services/gvgLineupApi.ts';

export const SQUADS_PER_DIVISION = 5;
export const MIN_DIVISIONS = 2;
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

export function toSavePayload(lineup: GvgLineup): GvgLineupSavePayload {
  return {
    divisions: normalizeDivisions(lineup.divisions).map(division => ({
      id: division.id,
      squads: division.squads.map(squad => ({
        squadNumber: squad.squadNumber,
        memberIds: squad.slots.map(slot => slot.memberId),
      })),
    })),
  };
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

export function moveSquadToNewDivision(lineup: GvgLineup, squadNumber: number) {
  if (lineup.divisions.length >= MAX_DIVISIONS) return lineup;
  const sourceDivision = lineup.divisions.find(division => division.squads.some(squad => squad.squadNumber === squadNumber));
  if (!sourceDivision || sourceDivision.squads.length === 1 && lineup.divisions.length <= MIN_DIVISIONS) return lineup;
  const squad = sourceDivision.squads.find(item => item.squadNumber === squadNumber);
  if (!squad) return lineup;
  const divisions = lineup.divisions.map(division => ({ ...division, squads: division.squads.filter(item => item.squadNumber !== squadNumber) }));
  divisions.push({ id: `new-${squadNumber}`, orderIndex: divisions.length, squads: [{ ...squad, orderIndex: 0 }] });
  return { divisions: normalizeDivisions(divisions) };
}

export function setSquadMember(lineup: GvgLineup, squadNumber: number, slotIndex: number, member: { id: string; name: string; classType: string } | null) {
  if (slotIndex < 0 || slotIndex >= SQUAD_CAPACITY) return lineup;
  if (member && lineup.divisions.some(division => division.squads.some(squad => squad.squadNumber !== squadNumber && squad.slots.some(slot => slot.memberId === member.id)))) return lineup;

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
