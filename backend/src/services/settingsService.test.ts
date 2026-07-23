import test from 'node:test';
import assert from 'node:assert/strict';
import { prisma } from '../db.js';
import { resetCurrentGuildData } from './settingsService.js';

const guild = { id: 'guild-1', discordGuildId: '123456789012345678', name: 'Guild', icon: null, ownerUserId: 'owner-1' };

test('guild reset deletes retained domains without querying retired lineup delegates', async () => {
  const client = prisma as unknown as Record<string, unknown>;
  const user = prisma.user as unknown as Record<string, unknown>;
  const guildModel = prisma.guild as unknown as Record<string, unknown>;
  const membership = prisma.guildMembership as unknown as Record<string, unknown>;
  const originalTransaction = client.$transaction;
  const originalUserFindUnique = user.findUnique;
  const originalGuildFindMany = guildModel.findMany;
  const originalGuildFindUnique = guildModel.findUnique;
  const originalMembershipFindMany = membership.findMany;
  const originalMembershipUpsert = membership.upsert;
  const calls: string[] = [];
  const guildUpdates: unknown[] = [];

  client.$transaction = async (callback: (tx: unknown) => Promise<unknown>) => callback({
    attendanceSession: {
      findMany: async () => [{ id: 'attendance-1' }],
      deleteMany: async () => { calls.push('attendanceSession.deleteMany'); },
    },
    attendanceVote: { deleteMany: async () => { calls.push('attendanceVote.deleteMany'); } },
    attendanceChannelConfig: { deleteMany: async () => { calls.push('attendanceChannelConfig.deleteMany'); } },
    gvgParticipationSession: { deleteMany: async () => { calls.push('gvgParticipationSession.deleteMany'); } },
    gvgLineupDivision: { deleteMany: async () => { calls.push('gvgLineupDivision.deleteMany'); } },
    memberRole: { deleteMany: async () => { calls.push('memberRole.deleteMany'); } },
    member: { deleteMany: async () => { calls.push('member.deleteMany'); } },
    guild: { update: async (input: unknown) => { calls.push('guild.update'); guildUpdates.push(input); } },
  });
  user.findUnique = async () => null;
  guildModel.findMany = async () => [guild];
  guildModel.findUnique = async () => null;
  membership.findMany = async () => [];
  membership.upsert = async () => ({ id: 'membership-1' });

  try {
    const result = await resetCurrentGuildData('owner-1', guild.id, 'RESET');

    assert.equal(result.status, 200);
    assert.deepEqual(calls, [
      'attendanceVote.deleteMany',
      'attendanceSession.deleteMany',
      'attendanceChannelConfig.deleteMany',
      'gvgParticipationSession.deleteMany',
      'gvgLineupDivision.deleteMany',
      'memberRole.deleteMany',
      'member.deleteMany',
      'guild.update',
    ]);
    assert.deepEqual(guildUpdates, [{ where: { id: guild.id }, data: { lastSyncedAt: null, gvgLineupNextSquadNumber: 1 } }]);
  } finally {
    client.$transaction = originalTransaction;
    user.findUnique = originalUserFindUnique;
    guildModel.findMany = originalGuildFindMany;
    guildModel.findUnique = originalGuildFindUnique;
    membership.findMany = originalMembershipFindMany;
    membership.upsert = originalMembershipUpsert;
  }
});
