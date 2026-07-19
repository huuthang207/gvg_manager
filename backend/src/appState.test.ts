import test from 'node:test';
import assert from 'node:assert/strict';
import { prisma } from './db.js';
import { getUserAppState } from './appState.js';

test('empty app state omits retired lineup and skill contracts', async () => {
  const user = prisma.user as unknown as Record<string, unknown>;
  const guild = prisma.guild as unknown as Record<string, unknown>;
  const membership = prisma.guildMembership as unknown as Record<string, unknown>;
  const originalUserFindUnique = user.findUnique;
  const originalGuildFindMany = guild.findMany;
  const originalMembershipFindMany = membership.findMany;

  user.findUnique = async () => null;
  guild.findMany = async () => [];
  membership.findMany = async () => [];

  try {
    const state = await getUserAppState('missing-user');

    assert.deepEqual(state, {
      user: null,
      guild: null,
      members: [],
      attendance: {
        gvg: { type: 'GVG', config: null, activeSession: null, recentSessions: [] },
        scrim: { type: 'SCRIM', config: null, activeSession: null, recentSessions: [] },
      },
      lastSyncedAt: null,
      roleConfig: null,
      currentRole: null,
      permissions: [],
      gvgLineup: null,
    });
    assert.equal('divisions' in state, false);
    assert.equal('squadGroups' in state, false);
    assert.equal('skills' in state, false);
    assert.equal('lineupLock' in state, false);
  } finally {
    user.findUnique = originalUserFindUnique;
    guild.findMany = originalGuildFindMany;
    membership.findMany = originalMembershipFindMany;
  }
});
