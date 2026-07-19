import test from 'node:test';
import assert from 'node:assert/strict';
import { serializeMember, serializeMembers } from './memberSerializer';

test('serializeMember maps member row to API shape without lineup skills', () => {
  const output = serializeMember({
    id: 'm1',
    ingameName: 'IGN',
    displayName: 'Display',
    classType: 'Toái Mộng',
    joinedAt: new Date('2026-01-01T00:00:00.000Z'),
    discordUserId: 'd1',
    username: 'user1',
    roles: [{ roleName: 'r1' }, { roleName: 'r2' }],
    avatar: 'avatar1',
    active: true,
  });

  assert.deepEqual(output, {
    id: 'm1',
    name: 'IGN',
    ingameName: 'IGN',
    discordDisplayName: 'Display',
    classType: 'Toái Mộng',
    joinedAt: '2026-01-01T00:00:00.000Z',
    discordId: 'd1',
    discordUsername: 'user1',
    discordRoles: ['r1', 'r2'],
    avatar: 'avatar1',
    active: true,
    gvgParticipationCount: 0,
  });
});

test('serializeMember falls back to displayName and null date', () => {
  const output = serializeMember({
    id: 'm2', ingameName: null, displayName: 'Display2', classType: 'Long Ngâm', joinedAt: null,
    discordUserId: 'd2', username: 'user2', roles: [], avatar: null, active: false,
  });
  assert.equal(output.name, 'Display2');
  assert.equal(output.joinedAt, null);
  assert.deepEqual(output.discordRoles, []);
  assert.equal(output.active, false);
});

test('serializeMembers maps array', () => {
  const output = serializeMembers([
    { id: 'm1', ingameName: 'A', displayName: 'A', classType: 'Toái Mộng', joinedAt: null, discordUserId: 'd1', username: 'u1', roles: [], avatar: null, active: true },
    { id: 'm2', ingameName: null, displayName: 'B', classType: 'Thần Tương', joinedAt: null, discordUserId: 'd2', username: 'u2', roles: [{ roleName: 'r1' }], avatar: null, active: true },
  ]);
  assert.equal(output.length, 2);
  assert.equal(output[0].name, 'A');
  assert.equal(output[1].name, 'B');
});
