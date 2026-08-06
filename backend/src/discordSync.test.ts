import test from 'node:test';
import assert from 'node:assert/strict';
import { prisma } from './db.js';
import { CONFLICT_CLASS, resolveClassFromRoleMap, syncGuildMembers, UNKNOWN_CLASS } from './discordSync.js';

test('resolveClassFromRoleMap returns the single matched class', () => {
  assert.equal(resolveClassFromRoleMap(['Bang Viên', 'Cửu Linh'], {
    'Toái Mộng': 'Toái Mộng',
    'Cửu Linh': 'Cửu Linh',
    'Long Ngâm': 'Long Ngâm',
  }), 'Cửu Linh');
});

test('resolveClassFromRoleMap returns unknown when no mapped class role matches', () => {
  assert.equal(resolveClassFromRoleMap(['Bang Viên'], {
    'Toái Mộng': 'Toái Mộng',
    'Cửu Linh': 'Cửu Linh',
  }), UNKNOWN_CLASS);
});

test('resolveClassFromRoleMap returns conflict when multiple mapped class roles match', () => {
  assert.equal(resolveClassFromRoleMap(['Bang Viên', 'Toái Mộng', 'Cửu Linh'], {
    'Toái Mộng': 'Toái Mộng',
    'Cửu Linh': 'Cửu Linh',
  }), CONFLICT_CLASS);
});

test('resolveClassFromRoleMap ignores blank mappings', () => {
  assert.equal(resolveClassFromRoleMap(['Bang Viên'], {
    'Toái Mộng': '',
    'Cửu Linh': '',
  }), UNKNOWN_CLASS);
});

const guildId = 'guild-1';
const memberA = {
  id: 'member-a',
  username: 'member-a',
  global_name: 'Member A',
  nick: null,
  roles: ['Bang Viên'],
  avatar: null,
  joined_at: '2026-01-01T00:00:00.000Z',
};
const memberB = {
  id: 'member-b',
  username: 'member-b',
  global_name: 'Member B',
  nick: null,
  roles: ['Bang Viên'],
  avatar: null,
  joined_at: '2026-01-02T00:00:00.000Z',
};

function createSyncPrismaMock() {
  const member = prisma.member as unknown as Record<string, unknown>;
  const memberRole = prisma.memberRole as unknown as Record<string, unknown>;
  const guild = prisma.guild as unknown as Record<string, unknown>;
  const user = prisma.user as unknown as Record<string, unknown>;
  const membership = prisma.guildMembership as unknown as Record<string, unknown>;
  const originals = {
    memberFindUnique: member.findUnique,
    memberUpsert: member.upsert,
    memberFindMany: member.findMany,
    memberUpdateMany: member.updateMany,
    memberRoleDeleteMany: memberRole.deleteMany,
    memberRoleCreateMany: memberRole.createMany,
    guildFindUnique: guild.findUnique,
    guildUpdate: guild.update,
    userFindMany: user.findMany,
    membershipDeleteMany: membership.deleteMany,
  };
  const calls: Array<{ method: string; input: any }> = [];

  member.findUnique = async () => null;
  member.upsert = async (input: any) => {
    calls.push({ method: 'member.upsert', input });
    return { id: `db-${input.where.guildId_discordUserId.discordUserId}` };
  };
  member.findMany = async (input: any) => {
    calls.push({ method: 'member.findMany', input });
    return [];
  };
  member.updateMany = async (input: any) => {
    calls.push({ method: 'member.updateMany', input });
    return { count: 0 };
  };
  memberRole.deleteMany = async (input: any) => { calls.push({ method: 'memberRole.deleteMany', input }); return { count: 0 }; };
  memberRole.createMany = async (input: any) => { calls.push({ method: 'memberRole.createMany', input }); return { count: 0 }; };
  guild.findUnique = async () => ({ ownerUserId: 'owner-1' });
  guild.update = async (input: any) => { calls.push({ method: 'guild.update', input }); return {}; };
  user.findMany = async (input: any) => { calls.push({ method: 'user.findMany', input }); return []; };
  membership.deleteMany = async (input: any) => { calls.push({ method: 'guildMembership.deleteMany', input }); return { count: 0 }; };

  return {
    calls,
    restore() {
      member.findUnique = originals.memberFindUnique;
      member.upsert = originals.memberUpsert;
      member.findMany = originals.memberFindMany;
      member.updateMany = originals.memberUpdateMany;
      memberRole.deleteMany = originals.memberRoleDeleteMany;
      memberRole.createMany = originals.memberRoleCreateMany;
      guild.findUnique = originals.guildFindUnique;
      guild.update = originals.guildUpdate;
      user.findMany = originals.userFindMany;
      membership.deleteMany = originals.membershipDeleteMany;
    },
  };
}

function syncWithMembers(members: typeof memberA[]) {
  return syncGuildMembers({
    guildId,
    discordGuildId: 'discord-guild-1',
    classRoleMap: {},
    requiredRoles: ['Bang Viên'],
    selectedMemberIds: ['member-a'],
  }, {
    getGuildMembersWithRoles: async () => ({ members, roles: [] }),
  });
}

test('selected sync leaves unselected members out of cleanup', async () => {
  const mock = createSyncPrismaMock();

  try {
    await syncWithMembers([memberA, memberB]);

    const cleanup = mock.calls.find(call => call.method === 'member.updateMany');
    assert.deepEqual(cleanup?.input.where, {
      guildId,
      active: true,
      discordUserId: { in: [] },
    });
    assert.equal(mock.calls.filter(call => call.method === 'member.upsert').length, 1);
    assert.equal(mock.calls.some(call => call.method === 'guildMembership.deleteMany'), false);
  } finally {
    mock.restore();
  }
});

test('selected sync deactivates only selected members that no longer qualify', async () => {
  const mock = createSyncPrismaMock();
  const member = prisma.member as unknown as Record<string, unknown>;
  const user = prisma.user as unknown as Record<string, unknown>;

  member.findMany = async (input: any) => {
    mock.calls.push({ method: 'member.findMany', input });
    return [{ discordUserId: 'member-a' }];
  };
  user.findMany = async (input: any) => {
    mock.calls.push({ method: 'user.findMany', input });
    return [{ id: 'user-a' }];
  };

  try {
    await syncWithMembers([{ ...memberA, roles: [] }, memberB]);

    const cleanup = mock.calls.find(call => call.method === 'member.updateMany');
    assert.deepEqual(cleanup?.input.where, {
      guildId,
      active: true,
      discordUserId: { in: ['member-a'] },
    });
    assert.deepEqual(mock.calls.find(call => call.method === 'guildMembership.deleteMany')?.input.where, {
      guildId,
      userId: { in: ['user-a'] },
    });
  } finally {
    mock.restore();
  }
});

test('full sync still deactivates members missing from the eligible roster', async () => {
  const mock = createSyncPrismaMock();

  try {
    await syncGuildMembers({
      guildId,
      discordGuildId: 'discord-guild-1',
      classRoleMap: {},
      requiredRoles: ['Bang Viên'],
    }, {
      getGuildMembersWithRoles: async () => ({ members: [memberA], roles: [] }),
    });

    const restoredMember = mock.calls.find(call => call.method === 'member.upsert');
    assert.equal(restoredMember?.input.update.active, true);

    const cleanup = mock.calls.find(call => call.method === 'member.updateMany');
    assert.deepEqual(cleanup?.input.where, {
      guildId,
      active: true,
      discordUserId: { notIn: ['member-a'] },
    });
  } finally {
    mock.restore();
  }
});

test('an empty selected sync does not deactivate the guild', async () => {
  const mock = createSyncPrismaMock();

  try {
    await syncGuildMembers({
      guildId,
      discordGuildId: 'discord-guild-1',
      classRoleMap: {},
      requiredRoles: ['Bang Viên'],
      selectedMemberIds: [],
    }, {
      getGuildMembersWithRoles: async () => ({ members: [memberA, memberB], roles: [] }),
    });

    const cleanup = mock.calls.find(call => call.method === 'member.updateMany');
    assert.deepEqual(cleanup?.input.where, {
      guildId,
      active: true,
      discordUserId: { in: [] },
    });
    assert.equal(mock.calls.some(call => call.method === 'member.upsert'), false);
  } finally {
    mock.restore();
  }
});
