import { prisma } from './db.js';
import { getAccessibleGuildForUser } from './permissions.js';
import { serializeMembers } from './serializers/memberSerializer.js';
import { getAttendanceStateForGuild } from './services/attendanceService.js';
import { getGvgParticipationStats } from './services/gvgParticipationService.js';
import { ensureGvgLineup } from './services/gvgLineupService.js';

export interface AppStateGuildContext {
  guildId: string;
  role: 'owner' | 'manager' | 'member';
  permissions: string[];
}

export async function getUserAppState(userId: string, activeGuildId?: string | null) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  const access = await getAccessibleGuildForUser(userId, activeGuildId);
  const guild = access ? await prisma.guild.findUnique({
    where: { id: access.guild.id },
    include: {
      members: {
        where: { active: true },
        orderBy: { displayName: 'asc' },
        include: { roles: true },
      },
      classRoleMappings: true,
      requiredRoles: true,
      accessRoles: true,
    },
  }) : null;

  if (!user || !guild) {
    return {
      user: user ? serializeUser(user) : null,
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
    };
  }

  const [attendance, gvgParticipationStats, gvgLineup] = await Promise.all([
    getAttendanceStateForGuild(guild.id),
    getGvgParticipationStats(guild.id),
    ensureGvgLineup(guild.id),
  ]);
  const members = guild.members.map(member => ({ ...member, gvgParticipationCount: gvgParticipationStats[member.id] ?? 0 }));

  return {
    user: serializeUser(user),
    guild: { id: guild.id, discordGuildId: guild.discordGuildId, name: guild.name, icon: guild.icon },
    members: serializeMembers(members),
    attendance,
    lastSyncedAt: guild.lastSyncedAt?.toISOString() ?? null,
    roleConfig: {
      classRoleMap: Object.fromEntries(guild.classRoleMappings.map(mapping => [mapping.classType, mapping.roleName])),
      requiredRoles: guild.requiredRoles.map(role => role.roleName),
      accessRoles: {
        managerRoles: guild.accessRoles.filter(role => role.appRole === 'manager').map(role => role.roleName),
        memberRoles: guild.accessRoles.filter(role => role.appRole === 'member').map(role => role.roleName),
      },
    },
    currentRole: access?.role ?? null,
    permissions: access?.permissions ?? [],
    gvgLineup,
  };
}

function serializeUser(user: { id: string; discordUserId: string; username: string; globalName: string | null; avatar: string | null }) {
  return { id: user.discordUserId, username: user.username, globalName: user.globalName, avatar: user.avatar };
}
