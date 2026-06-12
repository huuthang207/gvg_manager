import { prisma } from '../db.js';
import { getUserAppState } from '../appState.js';
import { addGuildMemberRole, removeGuildMemberRole } from '../discord.js';
import { syncGuildMembers } from '../discordSync.js';
import { requireAccessibleGuild } from '../permissions.js';
import { publishGuildAppStateChanged } from './realtimeGateway.js';

const BANG_VIEN_ROLE_NAME = 'Bang Viên';
const CLASS_TYPES = ['Toái Mộng', 'Cửu Linh', 'Long Ngâm', 'Thiết Y', 'Tố Vấn', 'Thần Tương', 'Huyết Hà'] as const;

type ClassType = typeof CLASS_TYPES[number];

function isClassType(value: string): value is ClassType {
  return CLASS_TYPES.includes(value as ClassType);
}

export async function updateBotMemberIngameName(discordGuildId: string, discordUserId: string, ingameName: string) {
  const member = await prisma.member.findFirst({
    where: {
      discordUserId,
      guild: { discordGuildId },
    },
    include: { guild: true },
  });

  if (!member) {
    return { status: 404 as const, body: { error: 'Thành viên chưa được import hoặc đồng bộ vào hệ thống.' } };
  }

  const updatedMember = await prisma.member.update({
    where: { id: member.id },
    data: { ingameName },
  });

  publishGuildAppStateChanged({ guildId: member.guildId, reason: 'member_updated' });

  return {
    status: 200 as const,
    body: {
      success: true,
      member: {
        id: updatedMember.id,
        discordUserId: updatedMember.discordUserId,
        ingameName: updatedMember.ingameName,
      },
    },
  };
}

export async function updateMemberIngameNameForManager(userId: string, activeGuildId: string | null | undefined, memberId: string, ingameName: string) {
  const access = await requireAccessibleGuild(userId, 'manage:members', activeGuildId);

  if (!access) {
    return { status: 404 as const, body: { error: 'Chưa có server nào được import.' } };
  }

  if (access.forbidden) {
    return { status: 403 as const, body: { error: 'Bạn không có quyền cập nhật thành viên.' } };
  }

  const member = await prisma.member.findFirst({
    where: {
      id: memberId,
      guildId: access.guild.id,
    },
  });

  if (!member) {
    return { status: 404 as const, body: { error: 'Member not found' } };
  }

  await prisma.member.update({
    where: { id: memberId },
    data: { ingameName }
  });

  publishGuildAppStateChanged({ guildId: access.guild.id, reason: 'member_updated' });

  const state = await getUserAppState(userId, activeGuildId);
  return { status: 200 as const, body: state };
}

export async function updateMemberClassRoleForManager(userId: string, activeGuildId: string | null | undefined, memberId: string, classType: string) {
  const access = await requireAccessibleGuild(userId, 'manage:members', activeGuildId);

  if (!access) {
    return { status: 404 as const, body: { error: 'Chưa có server nào được import.' } };
  }

  if (access.forbidden) {
    return { status: 403 as const, body: { error: 'Bạn không có quyền cập nhật role môn phái.' } };
  }

  if (!isClassType(classType)) {
    return { status: 400 as const, body: { error: 'Môn phái không hợp lệ.' } };
  }

  const member = await prisma.member.findFirst({
    where: { id: memberId, guildId: access.guild.id },
    include: { roles: true },
  });

  if (!member) {
    return { status: 404 as const, body: { error: 'Member not found' } };
  }

  const mappings = await prisma.guildClassRoleMapping.findMany({ where: { guildId: access.guild.id } });
  const classRoleMap = Object.fromEntries(mappings.map(mapping => [mapping.classType, mapping.roleName.trim()])) as Record<string, string>;
  const targetRoleName = classRoleMap[classType];

  if (!targetRoleName) {
    return { status: 400 as const, body: { error: `Chưa cấu hình role Discord cho phái ${classType}.` } };
  }

  const configuredClassRoles = Object.values(classRoleMap).filter(Boolean);
  if (new Set(configuredClassRoles).size !== configuredClassRoles.length) {
    return { status: 400 as const, body: { error: 'Cấu hình role môn phái đang bị trùng.' } };
  }

  const currentRoles = new Set(member.roles.map(role => role.roleName));
  const rolesToRemove = configuredClassRoles.filter(roleName => roleName !== targetRoleName && currentRoles.has(roleName));

  try {
    if (!currentRoles.has(targetRoleName)) {
      const added = await addGuildMemberRole(access.guild.discordGuildId, member.discordUserId, targetRoleName);
      if (!added) {
        return { status: 404 as const, body: { error: `Không tìm thấy role ${targetRoleName} trên Discord.` } };
      }
    }

    for (const roleName of rolesToRemove) {
      const removed = await removeGuildMemberRole(access.guild.discordGuildId, member.discordUserId, roleName);
      if (!removed) {
        return { status: 404 as const, body: { error: `Không tìm thấy role ${roleName} trên Discord.` } };
      }
    }
  } catch (err) {
    const requiredRoles = await prisma.guildRequiredRole.findMany({ where: { guildId: access.guild.id } });
    await syncGuildMembers({
      guildId: access.guild.id,
      discordGuildId: access.guild.discordGuildId,
      classRoleMap,
      requiredRoles: requiredRoles.map(role => role.roleName),
      selectedMemberIds: [member.discordUserId],
    });
    throw err;
  }

  const requiredRoles = await prisma.guildRequiredRole.findMany({ where: { guildId: access.guild.id } });
  await syncGuildMembers({
    guildId: access.guild.id,
    discordGuildId: access.guild.discordGuildId,
    classRoleMap,
    requiredRoles: requiredRoles.map(role => role.roleName),
    selectedMemberIds: [member.discordUserId],
  });

  publishGuildAppStateChanged({ guildId: access.guild.id, reason: 'member_updated' });

  const state = await getUserAppState(userId, activeGuildId);
  return { status: 200 as const, body: state };
}

export async function removeBangVienRoleFromMember(userId: string, activeGuildId: string | null | undefined, memberId: string) {
  const access = await requireAccessibleGuild(userId, 'manage:members', activeGuildId);

  if (!access) {
    return { status: 404 as const, body: { error: 'Chưa có server nào được import.' } };
  }

  if (access.forbidden) {
    return { status: 403 as const, body: { error: 'Bạn không có quyền xóa thành viên.' } };
  }

  const member = await prisma.member.findFirst({
    where: {
      id: memberId,
      guildId: access.guild.id,
    },
  });

  if (!member) {
    return { status: 404 as const, body: { error: 'Member not found' } };
  }

  const removed = await removeGuildMemberRole(access.guild.discordGuildId, member.discordUserId, BANG_VIEN_ROLE_NAME);
  if (!removed) {
    return { status: 404 as const, body: { error: `Không tìm thấy role ${BANG_VIEN_ROLE_NAME} trong Discord server.` } };
  }

  await prisma.member.update({
    where: { id: memberId },
    data: { active: false },
  });

  publishGuildAppStateChanged({ guildId: access.guild.id, reason: 'member_removed' });

  const state = await getUserAppState(userId, activeGuildId);
  return { status: 200 as const, body: state };
}

export async function deleteInactiveMemberFromDatabase(userId: string, activeGuildId: string | null | undefined, memberId: string) {
  const access = await requireAccessibleGuild(userId, 'manage:members', activeGuildId);

  if (!access) {
    return { status: 404 as const, body: { error: 'Chưa có server nào được import.' } };
  }

  if (access.forbidden) {
    return { status: 403 as const, body: { error: 'Bạn không có quyền xóa thành viên.' } };
  }

  const member = await prisma.member.findFirst({
    where: {
      id: memberId,
      guildId: access.guild.id,
    },
  });

  if (!member) {
    return { status: 404 as const, body: { error: 'Member not found' } };
  }

  if (member.active !== false) {
    return { status: 400 as const, body: { error: 'Chỉ có thể xóa vĩnh viễn thành viên không hoạt động.' } };
  }

  await prisma.member.delete({ where: { id: memberId } });

  publishGuildAppStateChanged({ guildId: access.guild.id, reason: 'member_removed' });

  const state = await getUserAppState(userId, activeGuildId);
  return { status: 200 as const, body: state };
}

export async function deleteInactiveMembersFromDatabase(userId: string, activeGuildId: string | null | undefined) {
  const access = await requireAccessibleGuild(userId, 'manage:members', activeGuildId);

  if (!access) {
    return { status: 404 as const, body: { error: 'Chưa có server nào được import.' } };
  }

  if (access.forbidden) {
    return { status: 403 as const, body: { error: 'Bạn không có quyền xóa thành viên.' } };
  }

  const result = await prisma.member.deleteMany({
    where: {
      guildId: access.guild.id,
      active: false,
    },
  });

  if (result.count > 0) {
    publishGuildAppStateChanged({ guildId: access.guild.id, reason: 'member_removed' });
  }

  const state = await getUserAppState(userId, activeGuildId);
  return { status: 200 as const, body: state };
}

export async function updateMyIngameName(userId: string, discordUserId: string, activeGuildId: string | null | undefined, ingameName: string) {
  const access = await requireAccessibleGuild(userId, 'view:guild', activeGuildId);

  if (!access) {
    return { status: 404 as const, body: { error: 'Chưa có server nào được import.' } };
  }

  const selfMember = await prisma.member.findFirst({
    where: {
      guildId: access.guild.id,
      discordUserId,
    },
  });

  if (!selfMember) {
    return { status: 404 as const, body: { error: 'Không tìm thấy thông tin thành viên của bạn trong bang hiện tại.' } };
  }

  await prisma.member.update({
    where: { id: selfMember.id },
    data: { ingameName },
  });

  publishGuildAppStateChanged({ guildId: access.guild.id, reason: 'member_updated' });

  const state = await getUserAppState(userId, activeGuildId);
  return { status: 200 as const, body: state };
}

export async function assignSkillToMember(
  userId: string,
  activeGuildId: string | null | undefined,
  memberId: string,
  skillId: string,
  skillData?: { name?: unknown; logo?: unknown; description?: unknown },
) {
  const access = await requireAccessibleGuild(userId, 'manage:lineup', activeGuildId);

  if (!access) {
    return { status: 404 as const, body: { error: 'Chưa có server nào được import.' } };
  }

  if (access.forbidden) {
    return { status: 403 as const, body: { error: 'Bạn không có quyền chỉnh sửa đội hình.' } };
  }

  const member = await prisma.member.findFirst({ where: { id: memberId, guildId: access.guild.id } });

  if (!member) {
    return { status: 404 as const, body: { error: 'Không tìm thấy thành viên.' } };
  }

  let skill = await prisma.skill.findFirst({ where: { id: skillId, guildId: access.guild.id } });

  if (!skill) {
    const name = typeof skillData?.name === 'string' ? skillData.name.trim() : '';
    const logo = typeof skillData?.logo === 'string' ? skillData.logo.trim() : '';
    const description = typeof skillData?.description === 'string' ? skillData.description.trim() : null;

    if (!name || !logo) {
      return { status: 404 as const, body: { error: 'Không tìm thấy kỹ năng.' } };
    }

    skill = await prisma.skill.create({
      data: {
        id: skillId,
        guildId: access.guild.id,
        name,
        logo,
        description: description || null,
      },
    });
  }

  await prisma.memberSkill.upsert({
    where: { memberId_skillId: { memberId, skillId } },
    update: {},
    create: { memberId, skillId },
  });

  publishGuildAppStateChanged({ guildId: access.guild.id, reason: 'member_updated' });

  const state = await getUserAppState(userId, activeGuildId);
  return { status: 200 as const, body: state };
}

export async function removeSkillFromMember(userId: string, activeGuildId: string | null | undefined, memberId: string, skillId: string) {
  const access = await requireAccessibleGuild(userId, 'manage:lineup', activeGuildId);

  if (!access) {
    return { status: 404 as const, body: { error: 'Chưa có server nào được import.' } };
  }

  if (access.forbidden) {
    return { status: 403 as const, body: { error: 'Bạn không có quyền chỉnh sửa đội hình.' } };
  }

  const member = await prisma.member.findFirst({ where: { id: memberId, guildId: access.guild.id } });
  const skill = await prisma.skill.findFirst({ where: { id: skillId, guildId: access.guild.id } });

  if (!member || !skill) {
    return { status: 404 as const, body: { error: 'Không tìm thấy thành viên hoặc kỹ năng.' } };
  }

  await prisma.memberSkill.deleteMany({ where: { memberId, skillId } });

  publishGuildAppStateChanged({ guildId: access.guild.id, reason: 'member_updated' });

  const state = await getUserAppState(userId, activeGuildId);
  return { status: 200 as const, body: state };
}

export async function clearSkillsFromMembers(userId: string, activeGuildId: string | null | undefined, memberIds: string[]) {
  const access = await requireAccessibleGuild(userId, 'manage:lineup', activeGuildId);

  if (!access) {
    return { status: 404 as const, body: { error: 'Chưa có server nào được import.' } };
  }

  if (access.forbidden) {
    return { status: 403 as const, body: { error: 'Bạn không có quyền chỉnh sửa đội hình.' } };
  }

  const uniqueMemberIds = [...new Set(memberIds.filter(id => typeof id === 'string' && id.trim()))];
  if (uniqueMemberIds.length === 0) {
    const state = await getUserAppState(userId, activeGuildId);
    return { status: 200 as const, body: state };
  }

  const members = await prisma.member.findMany({
    where: {
      id: { in: uniqueMemberIds },
      guildId: access.guild.id,
    },
    select: { id: true },
  });

  if (members.length !== uniqueMemberIds.length) {
    return { status: 404 as const, body: { error: 'Không tìm thấy một hoặc nhiều thành viên.' } };
  }

  await prisma.memberSkill.deleteMany({ where: { memberId: { in: uniqueMemberIds } } });

  publishGuildAppStateChanged({ guildId: access.guild.id, reason: 'member_updated' });

  const state = await getUserAppState(userId, activeGuildId);
  return { status: 200 as const, body: state };
}
