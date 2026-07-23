import test from 'node:test';
import assert from 'node:assert/strict';
import { GVG_SQUAD_CAPACITY, resetGvgLineupNextSquadNumberIfEmpty, serializeGvgLineup } from './gvgLineupService.js';

test('serializes empty divisions and named squads with six slots', () => {
  const lineup = serializeGvgLineup([
    { id: 'division-2', orderIndex: 1, note: null, squads: [] },
    {
      id: 'division-1', orderIndex: 0, note: 'Giữ cổng trái\nKhông tách đội', squads: [{
        id: 'squad-7',
        guildId: 'guild-1',
        squadNumber: 7,
        name: 'Đội chủ lực',
        orderIndex: 0,
        slots: [{ slotIndex: 0, memberId: 'member-1', member: { id: 'member-1', ingameName: 'Ingame', displayName: 'Discord', classType: 'Tố Vấn', active: true } }],
      }],
    },
  ]);

  assert.deepEqual(lineup.divisions.map(division => division.id), ['division-1', 'division-2']);
  assert.equal(lineup.divisions[0].note, 'Giữ cổng trái\nKhông tách đội');
  assert.equal(lineup.divisions[1].note, null);
  assert.equal(lineup.divisions[0].squads[0].name, 'Đội chủ lực');
  assert.equal(lineup.divisions[0].squads[0].slots.length, GVG_SQUAD_CAPACITY);
  assert.deepEqual(lineup.divisions[1].squads, []);
});

test('resets the squad-number allocator only after the final squad is deleted', async () => {
  const updates: unknown[] = [];
  const tx = {
    gvgLineupSquad: { count: async () => 0 },
    guild: { update: async (input: unknown) => { updates.push(input); } },
  };

  assert.equal(await resetGvgLineupNextSquadNumberIfEmpty(tx, 'guild-1'), true);
  assert.deepEqual(updates, [{ where: { id: 'guild-1' }, data: { gvgLineupNextSquadNumber: 1 } }]);
});

test('preserves the squad-number allocator while squads remain', async () => {
  const updates: unknown[] = [];
  const tx = {
    gvgLineupSquad: { count: async () => 1 },
    guild: { update: async (input: unknown) => { updates.push(input); } },
  };

  assert.equal(await resetGvgLineupNextSquadNumberIfEmpty(tx, 'guild-1'), false);
  assert.deepEqual(updates, []);
});
