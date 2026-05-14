import { prisma } from '../db.js';
import { getUserAppState } from '../appState.js';
import { syncGuildMembers } from '../discordSync.js';
import { requireAccessibleGuild } from '../permissions.js';
import { publishGuildAppStateChanged } from './realtimeGateway.js';

const classTypes = ['Toái Mộng', 'Cửu Linh', 'Long Ngâm', 'Thiết Y', 'Tố Vấn', 'Thần Tương', 'Huyết Hà'];

export function normalizeRoleConfigInput(classRoleMap: Record<string, string>, requiredRoles: string[]) {
  const normalizedClassRoleMap = Object.fromEntries(
    classTypes.map(classType => [classType, classRoleMap[classType]?.trim() || ''])
  );
  const classRoles = Object.values(normalizedClassRoleMap);
  const normalizedRequiredRoles = [...new Set(requiredRoles.map(role => role.trim()).filter(Boolean))];

  return {
    normalizedClassRoleMap,
    classRoles,
    normalizedRequiredRoles,
  };
}

export async function updateGuildRoleConfig(userId: string, activeGuildId: string | null | undefined, classRoleMap: Record<string, string>, requiredRoles: string[]) {
  const access = await requireAccessibleGuild(userId, 'manage:settings', activeGuildId);

  if (!access) {
    return { status: 404 as const, body: { error: 'Chưa có server nào được import.' } };
  }

  if (access.forbidden) {
    return { status: 403 as const, body: { error: 'Bạn không có quyền cập nhật cấu hình role.' } };
  }

  const { normalizedClassRoleMap, normalizedRequiredRoles } = normalizeRoleConfigInput(classRoleMap, requiredRoles);

  await prisma.guildClassRoleMapping.deleteMany({ where: { guildId: access.guild.id } });
  await prisma.guildClassRoleMapping.createMany({
    data: Object.entries(normalizedClassRoleMap).map(([classType, roleName]) => ({ guildId: access.guild.id, classType, roleName })),
  });

  await prisma.guildRequiredRole.deleteMany({ where: { guildId: access.guild.id } });
  if (normalizedRequiredRoles.length > 0) {
    await prisma.guildRequiredRole.createMany({
      data: normalizedRequiredRoles.map(roleName => ({ guildId: access.guild.id, roleName })),
      skipDuplicates: true,
    });
  }

  await syncGuildMembers({
    guildId: access.guild.id,
    discordGuildId: access.guild.discordGuildId,
    classRoleMap: normalizedClassRoleMap,
    requiredRoles: normalizedRequiredRoles,
  });

  publishGuildAppStateChanged({ guildId: access.guild.id, reason: 'settings_updated' });

  const state = await getUserAppState(userId, activeGuildId);
  return { status: 200 as const, body: state };
}

export function normalizeAccessRoles(managerRoles: unknown[], memberRoles: unknown[]) {
  const normalizeRoles = (roles: unknown[]) => [...new Set(roles.map(role => typeof role === 'string' ? role.trim() : '').filter(Boolean))];
  return {
    normalizedManagerRoles: normalizeRoles(managerRoles),
    normalizedMemberRoles: normalizeRoles(memberRoles),
  };
}

export async function updateGuildAccessRoles(userId: string, activeGuildId: string | null | undefined, managerRoles: unknown[], memberRoles: unknown[]) {
  const access = await requireAccessibleGuild(userId, 'manage:settings', activeGuildId);

  if (!access) {
    return { status: 404 as const, body: { error: 'Chưa có server nào được import.' } };
  }

  if (access.forbidden) {
    return { status: 403 as const, body: { error: 'Bạn không có quyền cập nhật phân quyền.' } };
  }

  const { normalizedManagerRoles, normalizedMemberRoles } = normalizeAccessRoles(managerRoles, memberRoles);

  await prisma.guildAccessRole.deleteMany({ where: { guildId: access.guild.id } });
  const data = [
    ...normalizedManagerRoles.map(roleName => ({ guildId: access.guild.id, roleName, appRole: 'manager' as const })),
    ...normalizedMemberRoles.map(roleName => ({ guildId: access.guild.id, roleName, appRole: 'member' as const })),
  ];

  if (data.length > 0) {
    await prisma.guildAccessRole.createMany({ data, skipDuplicates: true });
  }

  publishGuildAppStateChanged({ guildId: access.guild.id, reason: 'settings_updated' });

  const state = await getUserAppState(userId, activeGuildId);
  return { status: 200 as const, body: state };
}
