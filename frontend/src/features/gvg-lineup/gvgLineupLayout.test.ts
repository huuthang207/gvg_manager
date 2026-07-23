import assert from 'node:assert/strict';
import test from 'node:test';
import type { GvgLineup } from '../../services/apiTypes.ts';
import type { Member } from '../../shared/types/member.ts';
import { canSquadCreateGvgDivision, filterGvgMembersByName, getAssignedMemberIds, getAvailableGvgMembers, getEffectiveGvgClass, moveSquadToNewDivision, reorderSquadsWithinDivision } from './gvgLineupLayout.ts';

const members: Member[] = [
  { id: 'toai-mong', name: 'Toái Mộng', classType: 'Toái Mộng', active: true },
  { id: 'thiet-y', name: 'Thiết Y', classType: 'Thiết Y', active: true },
  { id: 'cuu-linh', name: 'Cửu Linh', classType: 'Cửu Linh', active: true },
  { id: 'inactive', name: 'Inactive', classType: 'Thiết Y', active: false },
];

const lineup: GvgLineup = {
  divisions: [{
    id: 'division-1',
    orderIndex: 0,
    note: null,
    squads: [{
      id: 'squad-1',
      squadNumber: 1,
      name: 'Tổ đội 1',
      orderIndex: 0,
      slots: [
        { memberId: 'toai-mong', member: { id: 'toai-mong', name: 'Toái Mộng', classType: 'Toái Mộng' } },
        { memberId: null, member: null },
      ],
    }, {
      id: 'squad-2',
      squadNumber: 2,
      name: 'Tổ đội 2',
      orderIndex: 1,
      slots: [
        { memberId: 'thiet-y', member: { id: 'thiet-y', name: 'Thiết Y', classType: 'Thiết Y' } },
        { memberId: null, member: null },
      ],
    }],
  }],
};

test('collects assigned members across every squad in the lineup', () => {
  assert.deepEqual([...getAssignedMemberIds(lineup)].sort(), ['thiet-y', 'toai-mong']);
});

test('filters candidates by active status, global assignment, and class', () => {
  const candidates = getAvailableGvgMembers(members, getAssignedMemberIds(lineup), null, 'Thiết Y');

  assert.deepEqual(candidates.map(member => member.id), []);
});

test('retains the current slot member only when the selected faction matches', () => {
  const sameClassCandidates = getAvailableGvgMembers(members, getAssignedMemberIds(lineup), 'toai-mong', 'Toái Mộng');
  const changedClassCandidates = getAvailableGvgMembers(members, getAssignedMemberIds(lineup), 'toai-mong', 'Cửu Linh');

  assert.deepEqual(sameClassCandidates.map(member => member.id), ['toai-mong']);
  assert.deepEqual(changedClassCandidates.map(member => member.id), ['cuu-linh']);
});

test('makes a removed member eligible for another slot again', () => {
  const assignedMemberIds = getAssignedMemberIds(lineup);
  assignedMemberIds.delete('thiet-y');
  const candidates = getAvailableGvgMembers(members, assignedMemberIds, null, 'Thiết Y');

  assert.deepEqual(candidates.map(member => member.id), ['thiet-y']);
});

test('prioritizes an explicitly selected faction over the assigned member class', () => {
  assert.equal(getEffectiveGvgClass('Thiết Y', 'Toái Mộng'), 'Thiết Y');
  assert.equal(getEffectiveGvgClass(null, 'Thiết Y'), 'Thiết Y');
  assert.equal(getEffectiveGvgClass(null, null), null);
});

test('filters eligible candidates by a case-insensitive Vietnamese name query', () => {
  const candidates = getAvailableGvgMembers(members, getAssignedMemberIds(lineup), null, null);

  assert.deepEqual(filterGvgMembersByName(candidates, 'CỬU').map(member => member.id), ['cuu-linh']);
  assert.deepEqual(filterGvgMembersByName(candidates, '  ').map(member => member.id), ['cuu-linh']);
});

test('only lets a squad split a division with another squad remaining', () => {
  assert.equal(canSquadCreateGvgDivision(lineup, 1), true);
  const next = moveSquadToNewDivision(lineup, 1);
  assert.equal(next.divisions.length, 2);
  assert.deepEqual(next.divisions[0].squads.map(squad => squad.squadNumber), [2]);
  assert.deepEqual(next.divisions[1].squads.map(squad => squad.squadNumber), [1]);

  const singletonSource: GvgLineup = { divisions: [
    { id: 'division-1', orderIndex: 0, note: null, squads: [{ ...lineup.divisions[0].squads[0] }] },
    { id: 'division-2', orderIndex: 1, note: null, squads: [{ ...lineup.divisions[0].squads[1] }] },
  ] };
  assert.equal(canSquadCreateGvgDivision(singletonSource, 1), false);
  assert.equal(moveSquadToNewDivision(singletonSource, 1), singletonSource);
});

test('reorders squads within one division without mutating source state', () => {
  const next = reorderSquadsWithinDivision(lineup, 'division-1', 0, 1);
  assert.deepEqual(next.divisions[0].squads.map(squad => squad.squadNumber), [2, 1]);
  assert.deepEqual(next.divisions[0].squads.map(squad => squad.orderIndex), [0, 1]);
  assert.deepEqual(lineup.divisions[0].squads.map(squad => squad.squadNumber), [1, 2]);
  assert.equal(reorderSquadsWithinDivision(lineup, 'missing', 0, 1), lineup);
  assert.equal(reorderSquadsWithinDivision(lineup, 'division-1', 0, 2), lineup);
});

test('reorders squads in either direction without mutating source state', () => {
  const movedDown = reorderSquadsWithinDivision(lineup, 'division-1', 0, 1);
  const movedUp = reorderSquadsWithinDivision(movedDown, 'division-1', 1, 0);

  assert.deepEqual(movedDown.divisions[0].squads.map(squad => squad.squadNumber), [2, 1]);
  assert.deepEqual(movedDown.divisions[0].squads.map(squad => squad.orderIndex), [0, 1]);
  assert.deepEqual(movedDown.divisions[0].squads[1].slots, lineup.divisions[0].squads[0].slots);
  assert.deepEqual(movedUp.divisions[0].squads.map(squad => squad.squadNumber), [1, 2]);
  assert.deepEqual(lineup.divisions[0].squads.map(squad => squad.squadNumber), [1, 2]);
  assert.equal(reorderSquadsWithinDivision(lineup, 'division-1', 0, 0), lineup);
  assert.equal(reorderSquadsWithinDivision(lineup, 'division-1', -1, 0), lineup);
});
