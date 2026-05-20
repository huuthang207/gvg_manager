import { prisma } from './db.js';
import { getAccessibleGuildForUser } from './permissions.js';
import { serializeMembers } from './serializers/memberSerializer.js';
import { serializeDivisions, serializeSquadGroups } from './serializers/squadSerializer.js';
import { getAttendanceStateForGuild } from './services/attendanceService.js';
import { getLineupEditLock } from './services/lineupEditLockService.js';

export interface AppStateGuildContext {
  guildId: string;
  role: 'owner' | 'manager' | 'member';
  permissions: string[];
}

export async function getUserAppState(userId: string, activeGuildId?: string | null) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
  });

  const access = await getAccessibleGuildForUser(userId, activeGuildId);
  const guild = access ? await prisma.guild.findUnique({
    where: { id: access.guild.id },
    include: {
      members: {
        where: { active: true },
        orderBy: { displayName: 'asc' },
        include: {
          roles: true,
          memberSkills: true,
        },
      },
      teams: {
        orderBy: [
          { divisionType: 'asc' },
          { orderIndex: 'asc' },
        ],
        include: { slots: true },
      },
      squadGroups: {
        orderBy: { orderIndex: 'asc' },
        include: {
          teams: {
            orderBy: { orderIndex: 'asc' },
            include: { slots: true },
          },
        },
      },
      skills: true,
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
      divisions: null,
      squadGroups: [],
      skills: [],
      attendance: {
        config: null,
        activeSession: null,
        recentSessions: [],
      },
      lastSyncedAt: null,
      roleConfig: null,
      currentRole: null,
      permissions: [],
      lineupLock: null,
    };
  }

  const attendance = await getAttendanceStateForGuild(guild.id);

  return {
    user: serializeUser(user),
    guild: {
      id: guild.id,
      discordGuildId: guild.discordGuildId,
      name: guild.name,
      icon: guild.icon,
    },
    members: serializeMembers(guild.members),
    divisions: serializeDivisions(guild.teams),
    squadGroups: serializeSquadGroups(guild.squadGroups),
    skills: guild.skills.map(skill => ({
      id: skill.id,
      name: skill.name,
      logo: skill.logo,
      description: skill.description ?? undefined,
    })),
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
    lineupLock: getLineupEditLock(access, user.id),
  };
}

function serializeUser(user: { id: string; discordUserId: string; username: string; globalName: string | null; avatar: string | null }) {
  return {
    id: user.discordUserId,
    username: user.username,
    globalName: user.globalName,
    avatar: user.avatar,
  };
}

