import test from 'node:test';
import assert from 'node:assert/strict';
import { prisma } from '../db.js';
import { GVG_SQUAD_CAPACITY, resetGvgLineupNextSquadNumberIfEmpty, serializeGvgLineup, updateGvgLineupSquadSlots } from './gvgLineupService.js';

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

  assert.equal(lineup.rosterSource, null);
  assert.deepEqual(lineup.divisions.map(division => division.id), ['division-1', 'division-2']);
  assert.equal(lineup.divisions[0].note, 'Giữ cổng trái\nKhông tách đội');
  assert.equal(lineup.divisions[1].note, null);
  assert.equal(lineup.divisions[0].squads[0].name, 'Đội chủ lực');
  assert.equal(lineup.divisions[0].squads[0].slots.length, GVG_SQUAD_CAPACITY);
  assert.deepEqual(lineup.divisions[1].squads, []);
});

test('serializes an attendance roster source with its GO count', () => {
  const lineup = serializeGvgLineup([], {
    id: 'session-1',
    type: 'SCRIM',
    status: 'CLOSED',
    headerText: 'Tập luyện',
    openedAt: new Date('2026-07-24T12:00:00.000Z'),
    closedAt: new Date('2026-07-24T13:00:00.000Z'),
    votes: [{ id: 'vote-1' }, { id: 'vote-2' }],
  });

  assert.deepEqual(lineup.rosterSource, {
    id: 'session-1',
    type: 'SCRIM',
    status: 'CLOSED',
    headerText: 'Tập luyện',
    openedAt: '2026-07-24T12:00:00.000Z',
    closedAt: '2026-07-24T13:00:00.000Z',
    goCount: 2,
  });
});

test('rejects a new non-GO assignment when an attendance roster source is selected', async () => {
  const originalTransaction = prisma.$transaction;
  const originalGuildFindUnique = (prisma.guild as any).findUnique;
  const originalDivisionFindMany = (prisma.gvgLineupDivision as any).findMany;
  try {
    (prisma as any).$transaction = async (callback: (tx: any) => Promise<unknown>) => callback({
      gvgLineupSquad: { findFirst: async () => ({ id: 'squad-1', slots: [{ id: 'slot-1', slotIndex: 0, memberId: null }] }) },
      member: { findMany: async () => [{ id: 'member-1' }] },
      gvgLineupSlot: { findMany: async () => [], update: async () => undefined, create: async () => undefined },
      guild: { findUnique: async () => ({ gvgLineupRosterSessionId: 'session-1' }) },
      attendanceVote: { findMany: async () => [] },
    });
    (prisma.guild as any).findUnique = async () => ({ gvgLineupRosterSession: null });
    (prisma.gvgLineupDivision as any).findMany = async () => [];

    const result = await updateGvgLineupSquadSlots('guild-1', 'squad-1', ['member-1', null, null, null, null, null]);

    assert.equal(result.status, 400);
    assert.match((result.body as { error: string }).error, /đã chọn tham gia/);
  } finally {
    (prisma as any).$transaction = originalTransaction;
    (prisma.guild as any).findUnique = originalGuildFindUnique;
    (prisma.gvgLineupDivision as any).findMany = originalDivisionFindMany;
  }
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
