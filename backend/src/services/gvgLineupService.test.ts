import test from 'node:test';
import assert from 'node:assert/strict';
import { prisma } from '../db.js';
import {
  GVG_SQUAD_CAPACITY,
  GVG_SQUAD_COUNT,
  serializeGvgLineup,
  validateGvgLineupInput,
} from './gvgLineupService.js';

function validInput() {
  return {
    divisions: [
      { squads: Array.from({ length: 5 }, (_, index) => ({ squadNumber: index + 1, memberIds: Array(GVG_SQUAD_CAPACITY).fill(null) })) },
      { squads: Array.from({ length: 5 }, (_, index) => ({ squadNumber: index + 6, memberIds: Array(GVG_SQUAD_CAPACITY).fill(null) })) },
    ],
  };
}

test('accepts a complete 2-by-5 fixed squad layout', async () => {
  const result = await validateGvgLineupInput('guild-1', validInput());
  assert.equal(result.status, 200);
});

test('rejects a layout without all ten squads', async () => {
  const input = validInput();
  input.divisions[1].squads.pop();
  const result = await validateGvgLineupInput('guild-1', input);
  assert.equal(result.status, 400);
  assert.match(result.body.error, /10 tổ đội/);
});

test('rejects divisions outside the allowed range', async () => {
  const tooFew = validInput();
  tooFew.divisions = [tooFew.divisions[0]];
  const tooFewResult = await validateGvgLineupInput('guild-1', tooFew);
  assert.equal(tooFewResult.status, 400);
  assert.match(tooFewResult.body.error, /2 đến 5 đoàn/);

  const tooMany = validInput();
  tooMany.divisions = [...tooMany.divisions, { squads: [{ squadNumber: 1, memberIds: Array(GVG_SQUAD_CAPACITY).fill(null) }] }, { squads: [{ squadNumber: 2, memberIds: Array(GVG_SQUAD_CAPACITY).fill(null) }] }, { squads: [{ squadNumber: 3, memberIds: Array(GVG_SQUAD_CAPACITY).fill(null) }] }, { squads: [{ squadNumber: 4, memberIds: Array(GVG_SQUAD_CAPACITY).fill(null) }] }];
  const tooManyResult = await validateGvgLineupInput('guild-1', tooMany);
  assert.equal(tooManyResult.status, 400);
  assert.match(tooManyResult.body.error, /2 đến 5 đoàn/);
});

test('rejects a division with six squads', async () => {
  const input = validInput();
  input.divisions[0].squads.push({ squadNumber: 6, memberIds: Array(GVG_SQUAD_CAPACITY).fill(null) });
  const result = await validateGvgLineupInput('guild-1', input);
  assert.equal(result.status, 400);
  assert.match(result.body.error, /1 đến 5 tổ đội/);
});

test('rejects duplicate or out-of-range squad numbers', async () => {
  const duplicate = validInput();
  duplicate.divisions[1].squads[0].squadNumber = 5;
  const duplicateResult = await validateGvgLineupInput('guild-1', duplicate);
  assert.equal(duplicateResult.status, 400);
  assert.match(duplicateResult.body.error, /đúng một lần/);

  const outOfRange = validInput();
  outOfRange.divisions[1].squads[4].squadNumber = 11;
  const outOfRangeResult = await validateGvgLineupInput('guild-1', outOfRange);
  assert.equal(outOfRangeResult.status, 400);
  assert.match(outOfRangeResult.body.error, /đúng một lần/);
});

test('rejects a squad payload without exactly six nullable member slots', async () => {
  const input = validInput();
  input.divisions[0].squads[0].memberIds = ['member-1'] as Array<string | null>;
  const result = await validateGvgLineupInput('guild-1', input);
  assert.equal(result.status, 400);
  assert.match(result.body.error, /đúng 6 vị trí/);
});

test('rejects duplicate member assignments before database lookup', async () => {
  const input = validInput();
  input.divisions[0].squads[0].memberIds[0] = 'member-1';
  input.divisions[1].squads[0].memberIds[0] = 'member-1';
  const result = await validateGvgLineupInput('guild-1', input);
  assert.equal(result.status, 400);
  assert.match(result.body.error, /chỉ được thuộc một tổ đội/);
});

test('accepts only active members from the current guild', async () => {
  const memberModel = prisma.member as unknown as { findMany: (...args: unknown[]) => Promise<unknown> };
  const originalFindMany = memberModel.findMany;
  const input = validInput();
  input.divisions[0].squads[0].memberIds[0] = 'member-1';

  try {
    memberModel.findMany = async () => [{ id: 'member-1' }];
    const accepted = await validateGvgLineupInput('guild-1', input);
    assert.equal(accepted.status, 200);

    memberModel.findMany = async () => [];
    const rejected = await validateGvgLineupInput('guild-1', input);
    assert.equal(rejected.status, 400);
    assert.match(rejected.body.error, /không hợp lệ hoặc không còn hoạt động/);
  } finally {
    memberModel.findMany = originalFindMany;
  }
});

test('serializes ordered divisions, six slots, and active member display data', () => {
  const lineup = serializeGvgLineup([
    {
      id: 'division-2',
      orderIndex: 1,
      squads: [{
        id: 'squad-2',
        guildId: 'guild-1',
        squadNumber: 2,
        orderIndex: 1,
        slots: [{ slotIndex: 0, memberId: 'inactive', member: { id: 'inactive', ingameName: 'Ignored', displayName: 'Ignored', classType: 'Thiết Y', active: false } }],
      }],
    },
    {
      id: 'division-1',
      orderIndex: 0,
      squads: [{
        id: 'squad-10',
        guildId: 'guild-1',
        squadNumber: 10,
        orderIndex: 1,
        slots: [],
      }, {
        id: 'squad-1',
        guildId: 'guild-1',
        squadNumber: 1,
        orderIndex: 0,
        slots: [{ slotIndex: 0, memberId: 'member-1', member: { id: 'member-1', ingameName: 'Ingame Name', displayName: 'Discord Name', classType: 'Tố Vấn', active: true } }],
      }],
    },
  ]);

  assert.deepEqual(lineup.divisions.map(division => division.id), ['division-1', 'division-2']);
  assert.deepEqual(lineup.divisions[0].squads.map(squad => squad.squadNumber), [1, 10]);
  assert.equal(lineup.divisions[0].squads[0].slots.length, GVG_SQUAD_CAPACITY);
  assert.deepEqual(lineup.divisions[0].squads[0].slots[0], {
    memberId: 'member-1',
    member: { id: 'member-1', name: 'Ingame Name', classType: 'Tố Vấn' },
  });
  assert.deepEqual(lineup.divisions[1].squads[0].slots[0], { memberId: null, member: null });
  assert.deepEqual(Object.keys(lineup.divisions[0].squads[0]), ['id', 'squadNumber', 'orderIndex', 'slots']);
});

test('fixed squad count stays at ten', () => {
  assert.equal(GVG_SQUAD_COUNT, 10);
});
