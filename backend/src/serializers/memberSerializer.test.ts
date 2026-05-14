import test from 'node:test';
import assert from 'node:assert/strict';
import { serializeMember, serializeMembers } from './memberSerializer';

test('serializeMember maps member row to API shape', () => {
  const input = {
    id: 'm1',
    ingameName: 'IGN',
    displayName: 'Display',
    classType: 'Toái Mộng',
    previousClassType: 'Huyền Cơ',
    classChangedAt: new Date('2026-01-02T03:04:05.000Z'),
    joinedAt: new Date('2026-01-01T00:00:00.000Z'),
    memberSkills: [{ skillId: 's1' }, { skillId: 's2' }],
    discordUserId: 'd1',
    username: 'user1',
    roles: [{ roleName: 'r1' }, { roleName: 'r2' }],
    avatar: 'avatar1',
    active: true,
  };

  const output = serializeMember(input);

  assert.deepEqual(output, {
    id: 'm1',
    name: 'IGN',
    ingameName: 'IGN',
    discordDisplayName: 'Display',
    classType: 'Toái Mộng',
    previousClassType: 'Huyền Cơ',
    classChangedAt: '2026-01-02T03:04:05.000Z',
    joinedAt: '2026-01-01T00:00:00.000Z',
    assignedSkills: ['s1', 's2'],
    discordId: 'd1',
    discordUsername: 'user1',
    discordRoles: ['r1', 'r2'],
    avatar: 'avatar1',
    active: true,
  });
});

test('serializeMember falls back to displayName and null date', () => {
  const input = {
    id: 'm2',
    ingameName: null,
    displayName: 'Display2',
    classType: 'Long Ngâm',
    previousClassType: null,
    classChangedAt: null,
    joinedAt: null,
    memberSkills: [],
    discordUserId: 'd2',
    username: 'user2',
    roles: [],
    avatar: null,
    active: false,
  };

  const output = serializeMember(input);

  assert.equal(output.name, 'Display2');
  assert.equal(output.classChangedAt, null);
  assert.equal(output.joinedAt, null);
  assert.deepEqual(output.assignedSkills, []);
  assert.deepEqual(output.discordRoles, []);
  assert.equal(output.active, false);
});

test('serializeMembers maps array', () => {
  const items = [
    {
      id: 'm1',
      ingameName: 'A',
      displayName: 'A',
      classType: 'Toái Mộng',
      previousClassType: null,
      classChangedAt: null,
      joinedAt: null,
      memberSkills: [],
      discordUserId: 'd1',
      username: 'u1',
      roles: [],
      avatar: null,
      active: true,
    },
    {
      id: 'm2',
      ingameName: null,
      displayName: 'B',
      classType: 'Thần Tương',
      previousClassType: null,
      classChangedAt: null,
      joinedAt: null,
      memberSkills: [{ skillId: 's1' }],
      discordUserId: 'd2',
      username: 'u2',
      roles: [{ roleName: 'r1' }],
      avatar: null,
      active: true,
    },
  ];

  const output = serializeMembers(items);
  assert.equal(output.length, 2);
  assert.equal(output[0].name, 'A');
  assert.equal(output[1].name, 'B');
  assert.deepEqual(output[1].assignedSkills, ['s1']);
});
