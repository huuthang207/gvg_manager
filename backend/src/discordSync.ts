import { prisma } from './db.js';
import { getGuildMembersWithRoles } from './discord.js';
import { mapRolesToClasses } from './roleMapper.js';

interface SyncOptions {
  guildId: string;
  discordGuildId: string;
  classRoleMap: Record<string, string>;
  requiredRoles: string[];
  selectedMemberIds?: string[];
}

export async function syncGuildMembers(options: SyncOptions) {
  const { guildId, discordGuildId, classRoleMap, requiredRoles, selectedMemberIds } = options;
  const cachedData = await getGuildMembersWithRoles(discordGuildId);
  const required = new Set(requiredRoles);
  const selected = selectedMemberIds ? new Set(selectedMemberIds) : null;
  const activeDiscordIds = new Set<string>();

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
    if (required.size > 0 && ![...required].every(role => member.roles.includes(role))) continue;

    let classType: string = member.suggestedClass ?? 'Toái Mộng';
    const matchedClass = Object.entries(classRoleMap).find(([, roleName]) => member.roles.includes(roleName));
    if (matchedClass) classType = matchedClass[0];

    const existingMember = await prisma.member.findUnique({
      where: { guildId_discordUserId: { guildId, discordUserId: member.id } },
    });
    const classChanged = !!existingMember && existingMember.classType !== classType;

    const savedMember = await prisma.member.upsert({
      where: { guildId_discordUserId: { guildId, discordUserId: member.id } },
      update: {
        username: member.username,
        displayName: member.displayName,
        avatar: member.avatar,
        joinedAt: member.joinedAt ? new Date(member.joinedAt) : null,
        classType,
        previousClassType: classChanged ? existingMember.classType : existingMember?.previousClassType ?? null,
        classChangedAt: classChanged ? new Date() : existingMember?.classChangedAt ?? null,
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

    activeDiscordIds.add(member.id);
    await prisma.memberRole.deleteMany({ where: { memberId: savedMember.id } });
    if (member.roles.length > 0) {
      await prisma.memberRole.createMany({
        data: member.roles.map(roleName => ({ memberId: savedMember.id, roleName })),
      });
    }
  }

  const deactivatedMembers = await prisma.member.findMany({
    where: {
      guildId,
      discordUserId: { notIn: [...activeDiscordIds] },
    },
    select: { discordUserId: true },
  });

  await prisma.member.updateMany({
    where: {
      guildId,
      discordUserId: { notIn: [...activeDiscordIds] },
    },
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
