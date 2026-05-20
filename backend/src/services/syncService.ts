import { prisma } from '../db.js';
import { getUserAppState } from '../appState.js';
import { requireAccessibleGuild } from '../permissions.js';
import { syncGuildMembers } from '../discordSync.js';
import { serializeMembers } from '../serializers/memberSerializer.js';
import { publishGuildAppStateChanged, publishGuildMembersDelta, publishGuildMembersPatch } from './realtimeGateway.js';

const syncRunningGuilds = new Set<string>();
const syncPendingGuilds = new Set<string>();
const syncTimers = new Map<string, ReturnType<typeof setTimeout>>();

async function syncPersistedGuildByDiscordGuildId(discordGuildId: string) {
  const guild = await prisma.guild.findUnique({
    where: { discordGuildId },
    include: {
      classRoleMappings: true,
      requiredRoles: true,
      members: {
        where: { active: true },
        orderBy: { displayName: 'asc' },
        include: {
          roles: true,
          memberSkills: true,
        },
      },
    },
  });

  if (!guild) return false;

  const beforeMembers = serializeMembers(guild.members);

  await syncGuildMembers({
    guildId: guild.id,
    discordGuildId: guild.discordGuildId,
    classRoleMap: Object.fromEntries(guild.classRoleMappings.map(mapping => [mapping.classType, mapping.roleName])),
    requiredRoles: guild.requiredRoles.map(role => role.roleName),
  });

  const syncedGuild = await prisma.guild.findUnique({
    where: { id: guild.id },
    include: {
      members: {
        where: { active: true },
        orderBy: { displayName: 'asc' },
        include: {
          roles: true,
          memberSkills: true,
        },
      },
    },
  });

  if (syncedGuild) {
    const afterMembers = serializeMembers(syncedGuild.members);
    const beforeMap = new Map(beforeMembers.map(member => [member.id, JSON.stringify(member)]));
    const afterMap = new Map(afterMembers.map(member => [member.id, JSON.stringify(member)]));

    const upsertMembers = afterMembers.filter(member => beforeMap.get(member.id) !== JSON.stringify(member));
    const removedMemberIds = beforeMembers
      .filter(member => !afterMap.has(member.id))
      .map(member => member.id);

    publishGuildMembersDelta({
      guildId: syncedGuild.id,
      discordGuildId: syncedGuild.discordGuildId,
      lastSyncedAt: syncedGuild.lastSyncedAt?.toISOString() ?? null,
      upsertMembers,
      removedMemberIds,
    });

    publishGuildMembersPatch({
      guildId: syncedGuild.id,
      discordGuildId: syncedGuild.discordGuildId,
      lastSyncedAt: syncedGuild.lastSyncedAt?.toISOString() ?? null,
      members: afterMembers,
    });

    publishGuildAppStateChanged({ guildId: syncedGuild.id, reason: 'access_updated' });
  }

  return true;
}

async function runGuildSync(discordGuildId: string) {
  if (syncRunningGuilds.has(discordGuildId)) {
    syncPendingGuilds.add(discordGuildId);
    return;
  }

  syncRunningGuilds.add(discordGuildId);

  try {
    await syncPersistedGuildByDiscordGuildId(discordGuildId);
  } finally {
    syncRunningGuilds.delete(discordGuildId);
    if (syncPendingGuilds.delete(discordGuildId)) {
      queueGuildSync(discordGuildId, 0);
    }
  }
}

export function queueGuildSync(discordGuildId: string, delayMs?: number) {
  const debounceMs = delayMs ?? Number(process.env.DISCORD_SYNC_EVENT_DEBOUNCE_MS ?? 3000);
  const currentTimer = syncTimers.get(discordGuildId);

  if (currentTimer) {
    clearTimeout(currentTimer);
  }

  const timer = setTimeout(() => {
    syncTimers.delete(discordGuildId);
    void runGuildSync(discordGuildId).catch(err => {
      console.error(`[Discord Sync] Guild ${discordGuildId} failed:`, err?.message || err);
    });
  }, Math.max(0, debounceMs));

  syncTimers.set(discordGuildId, timer);
}

export async function syncAllPersistedGuilds() {
  const guilds = await prisma.guild.findMany({
    select: { discordGuildId: true },
  });

  guilds.forEach(guild => {
    queueGuildSync(guild.discordGuildId, 0);
  });
}

export async function syncActiveGuildMembers(userId: string, activeGuildId: string | null | undefined) {
  const access = await requireAccessibleGuild(userId, 'manage:settings', activeGuildId);

  if (!access) {
    return { status: 404 as const, body: { error: 'Chưa có server nào được import.' } };
  }

  if (access.forbidden) {
    return { status: 403 as const, body: { error: 'Bạn không có quyền đồng bộ thành viên.' } };
  }

  const guild = await prisma.guild.findUnique({
    where: { id: access.guild.id },
    select: { discordGuildId: true },
  });

  if (!guild) {
    return { status: 404 as const, body: { error: 'Chưa có server nào được import.' } };
  }

  await runGuildSync(guild.discordGuildId);

  const state = await getUserAppState(userId, activeGuildId);
  return { status: 200 as const, body: state };
}
