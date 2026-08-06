import { prisma } from './db.js';
import { getGuildMembersWithRoles } from './discord.js';
import { mapRolesToClasses } from './roleMapper.js';
import { hasRequiredRole } from './requiredRoles.js';

export const UNKNOWN_CLASS = 'Chưa xác định';
export const CONFLICT_CLASS = 'Xung đột role phái';

interface SyncOptions {
  guildId: string;
  discordGuildId: string;
  classRoleMap: Record<string, string>;
  requiredRoles: string[];
  selectedMemberIds?: string[];
}

export interface SyncDependencies {
  getGuildMembersWithRoles: typeof getGuildMembersWithRoles;
}

const defaultDependencies: SyncDependencies = { getGuildMembersWithRoles };

export function resolveClassFromRoleMap(memberRoles: string[], classRoleMap: Record<string, string>) {
  const matchedClasses = Object.entries(classRoleMap)
    .filter(([, roleName]) => roleName && memberRoles.includes(roleName))
    .map(([classType]) => classType);

  if (matchedClasses.length === 1) return matchedClasses[0];
  if (matchedClasses.length === 0) return UNKNOWN_CLASS;
  return CONFLICT_CLASS;
}

export async function syncGuildMembers(options: SyncOptions, dependencies: SyncDependencies = defaultDependencies) {
  const { guildId, discordGuildId, classRoleMap, requiredRoles, selectedMemberIds } = options;
  const cachedData = await dependencies.getGuildMembersWithRoles(discordGuildId);
  const selected = selectedMemberIds === undefined ? null : new Set(selectedMemberIds);
  const eligibleDiscordIds = new Set<string>();

  const mappedMembers = cachedData.members.map(member => {
    const roleMappings = mapRolesToClasses(member.roles);
    const matchedRole = roleMappings.find(r => r.matched);
    return {
      id: member.id,
      username: member.username,
      displayName: member.nick || member.global_name || member.username,
      roles: member.roles,
      avatar: member.avatar,
      joinedAt: member.joined_at,
      suggestedClass: matchedRole?.classType ?? null,
      roleMappings,
    };
  });

  for (const member of mappedMembers) {
    if (selected && !selected.has(member.id)) continue;
    if (!hasRequiredRole(member.roles, requiredRoles)) continue;

    const classType = resolveClassFromRoleMap(member.roles, classRoleMap);

    const existingMember = await prisma.member.findUnique({
      where: { guildId_discordUserId: { guildId, discordUserId: member.id } },
    });
    const savedMember = await prisma.member.upsert({
      where: { guildId_discordUserId: { guildId, discordUserId: member.id } },
      update: {
        username: member.username,
        displayName: member.displayName,
        avatar: member.avatar,
        joinedAt: member.joinedAt ? new Date(member.joinedAt) : null,
        classType,
        active: true,
      },
      create: {
        guildId,
        discordUserId: member.id,
        username: member.username,
        displayName: member.displayName,
        ingameName: member.displayName,
        avatar: member.avatar,
        joinedAt: member.joinedAt ? new Date(member.joinedAt) : null,
        classType,
        active: true,
      },
    });

    eligibleDiscordIds.add(member.id);
    await prisma.memberRole.deleteMany({ where: { memberId: savedMember.id } });
    if (member.roles.length > 0) {
      await prisma.memberRole.createMany({
        data: member.roles.map(roleName => ({ memberId: savedMember.id, roleName })),
      });
    }
  }

  const inactiveMemberFilter = selected
    ? { in: [...selected].filter(discordUserId => !eligibleDiscordIds.has(discordUserId)) }
    : { notIn: [...eligibleDiscordIds] };
  const inactiveMemberWhere = {
    guildId,
    active: true,
    discordUserId: inactiveMemberFilter,
  };

  const deactivatedMembers = await prisma.member.findMany({
    where: inactiveMemberWhere,
    select: { discordUserId: true },
  });

  await prisma.member.updateMany({
    where: inactiveMemberWhere,
    data: { active: false },
  });

  if (deactivatedMembers.length > 0) {
    const guild = await prisma.guild.findUnique({
      where: { id: guildId },
      select: { ownerUserId: true },
    });
    const users = await prisma.user.findMany({
      where: { discordUserId: { in: deactivatedMembers.map(member => member.discordUserId) } },
      select: { id: true },
    });
    const userIds = users.map(user => user.id).filter(userId => userId !== guild?.ownerUserId);

    if (userIds.length > 0) {
      await prisma.guildMembership.deleteMany({
        where: {
          guildId,
          userId: { in: userIds },
        },
      });
    }
  }

  await prisma.guild.update({
    where: { id: guildId },
    data: { lastSyncedAt: new Date() },
  });

  return mappedMembers;
}
