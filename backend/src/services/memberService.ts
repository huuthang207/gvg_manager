import { prisma } from '../db.js';
import { getUserAppState } from '../appState.js';
import { removeGuildMemberRole } from '../discord.js';
import { requireAccessibleGuild } from '../permissions.js';
import { publishGuildAppStateChanged } from './realtimeGateway.js';

const BANG_VIEN_ROLE_NAME = 'Bang Viên';

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

export async function acknowledgeMemberClassChange(userId: string, activeGuildId: string | null | undefined, memberId: string) {
  const access = await requireAccessibleGuild(userId, 'manage:members', activeGuildId);

  if (!access) {
    return { status: 404 as const, body: { error: 'Chưa có server nào được import.' } };
  }

  if (access.forbidden) {
    return { status: 403 as const, body: { error: 'Bạn không có quyền xác nhận đổi phái.' } };
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
    data: {
      previousClassType: null,
      classChangedAt: null,
    },
  });

  publishGuildAppStateChanged({ guildId: access.guild.id, reason: 'member_updated' });

  const state = await getUserAppState(userId, activeGuildId);
  return { status: 200 as const, body: state };
}
