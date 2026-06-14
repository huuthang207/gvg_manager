import type { SquadGroup } from '../../types.ts';
import type { AttendanceLineupImportPayload } from '../../shared/types/lineup.ts';

export interface AttendanceLineupImportResult {
  nextGroups: SquadGroup[];
  importedCount: number;
  skippedAlreadyAssignedCount: number;
  overflowCount: number;
}

export function collectAssignedMemberIds(groups: SquadGroup[]) {
  const ids = new Set<string>();
  groups.forEach(group => {
    group.teams.forEach(team => {
      team.memberIds.forEach(id => id && ids.add(id));
    });
  });
  return ids;
}

function fillEmptySlots(ids: string[], assignedIds: Set<string>, fillSlot: (memberId: string) => boolean) {
  let importedCount = 0;
  let skippedAlreadyAssignedCount = 0;
  let overflowCount = 0;

  ids.forEach(memberId => {
    if (!memberId) return;
    if (assignedIds.has(memberId)) {
      skippedAlreadyAssignedCount += 1;
      return;
    }
    if (fillSlot(memberId)) {
      assignedIds.add(memberId);
      importedCount += 1;
    } else {
      overflowCount += 1;
    }
  });

  return { importedCount, skippedAlreadyAssignedCount, overflowCount };
}

export function importMembersIntoSquadGroups(groups: SquadGroup[], payload: AttendanceLineupImportPayload): AttendanceLineupImportResult {
  const nextGroups = groups.map(group => ({
    ...group,
    teams: group.teams.map(team => ({
      ...team,
      memberIds: [...team.memberIds],
    })),
  }));
  const assignedIds = collectAssignedMemberIds(nextGroups);
  const fillMainSlot = (memberId: string) => {
    for (const group of nextGroups) {
      for (const team of group.teams) {
        const emptyIndex = team.memberIds.findIndex(id => !id);
        if (emptyIndex !== -1) {
          team.memberIds[emptyIndex] = memberId;
          return true;
        }
      }
    }
    return false;
  };
  const result = fillEmptySlots(payload.memberIds, assignedIds, fillMainSlot);

  return {
    nextGroups,
    importedCount: result.importedCount,
    skippedAlreadyAssignedCount: result.skippedAlreadyAssignedCount,
    overflowCount: result.overflowCount,
  };
}
