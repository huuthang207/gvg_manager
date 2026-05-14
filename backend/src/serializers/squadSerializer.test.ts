import test from 'node:test';
import assert from 'node:assert/strict';
import { toTeamSlotArrays, serializeSquadGroups, serializeDivisions } from './squadSerializer';

test('toTeamSlotArrays maps main/reserve slots to fixed arrays', () => {
  const output = toTeamSlotArrays({
    id: 't1',
    name: 'Team 1',
    slots: [
      { slotType: 'main', slotIndex: 0, memberId: 'm1' },
      { slotType: 'main', slotIndex: 5, memberId: 'm6' },
      { slotType: 'reserve', slotIndex: 1, memberId: 'r2' },
      { slotType: 'main', slotIndex: 9, memberId: 'ignored' },
    ],
  });

  assert.deepEqual(output.memberIds, ['m1', '', '', '', '', 'm6']);
  assert.deepEqual(output.reserveMemberIds, ['', 'r2', '']);
});

test('serializeSquadGroups maps groups and teams', () => {
  const output = serializeSquadGroups([
    {
      id: 'g1',
      name: 'Group 1',
      leaderMemberId: 'leader1',
      teams: [
        {
          id: 't1',
          name: 'Team 1',
          slots: [{ slotType: 'main', slotIndex: 0, memberId: 'm1' }],
        },
      ],
    },
  ]);

  assert.equal(output.length, 1);
  assert.equal(output[0].id, 'g1');
  assert.equal(output[0].teams[0].id, 't1');
  assert.equal(output[0].teams[0].memberIds[0], 'm1');
});

test('serializeDivisions returns null for empty input', () => {
  assert.equal(serializeDivisions([]), null);
});

test('serializeDivisions sorts by division order then team order', () => {
  const output = serializeDivisions([
    { divisionType: 'Công', id: 't3', name: 'T3', orderIndex: 2, slots: [] },
    { divisionType: 'Thủ', id: 't1', name: 'T1', orderIndex: 2, slots: [] },
    { divisionType: 'Thủ', id: 't0', name: 'T0', orderIndex: 1, slots: [] },
    { divisionType: 'Trợ', id: 't2', name: 'T2', orderIndex: 1, slots: [] },
  ]);

  assert.ok(output);
  assert.deepEqual(Object.keys(output!), ['Thủ', 'Trợ', 'Công']);
  assert.deepEqual(output!.Thủ.teams.map(team => team.id), ['t0', 't1']);
});
