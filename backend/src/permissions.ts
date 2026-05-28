import { prisma } from './db.js';

export type GuildRole = 'owner' | 'manager' | 'member';

export type Permission =
  | 'view:guild'
  | 'manage:lineup'
  | 'manage:snapshots'
  | 'restore:snapshots'
  | 'manage:members'
  | 'manage:settings'
  | 'manage:billing'
  | 'reset:guild-data';

const ROLE_PERMISSIONS: Record<GuildRole, Permission[]> = {
  owner: ['view:guild', 'manage:lineup', 'manage:snapshots', 'restore:snapshots', 'manage:members', 'manage:settings', 'manage:billing', 'reset:guild-data'],
  manager: ['view:guild', 'manage:lineup', 'manage:snapshots', 'restore:snapshots', 'manage:members'],
  member: ['view:guild'],
};

export interface AccessibleGuild {
  guild: { id: string; discordGuildId: string; name: string; icon: string | null; ownerUserId: string };
  role: GuildRole;
  permissions: Permission[];
}

export function getPermissionsForRole(role: GuildRole | null): Permission[] {
  return role ? ROLE_PERMISSIONS[role] : [];
}

export function hasPermission(role: GuildRole | null, permission: Permission) {
  return getPermissionsForRole(role).includes(permission);
}

function normalizeRole(value: string | null | undefined): GuildRole | null {
  return value === 'owner' || value === 'manager' || value === 'member' ? value : null;
}

export async function ensureOwnerMembership(guildId: string, userId: string) {
  return prisma.guildMembership.upsert({
    where: { guildId_userId: { guildId, userId } },
    update: { role: 'owner' },
    create: { guildId, userId, role: 'owner' },
  });
}

async function getActiveImportedMemberForUser(userId: string, guildId: string) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return null;

  return prisma.member.findFirst({
    where: {
      guildId,
      discordUserId: user.discordUserId,
      active: true,
    },
    include: {
      roles: true,
      guild: true,
    },
  });
}

async function deriveMembershipRoleForGuild(userId: string, guildId: string): Promise<GuildRole | null> {
  const importedMember = await getActiveImportedMemberForUser(userId, guildId);

  if (!importedMember) return null;

  if (importedMember.guild.ownerUserId === userId) {
    await ensureOwnerMembership(guildId, userId);
    return 'owner';
  }

  const accessRoles = await prisma.guildAccessRole.findMany({ where: { guildId, appRole: 'manager' } });
  const memberRoleNames = new Set(importedMember.roles.map(role => role.roleName));
  const managerRoles = accessRoles.map(role => role.roleName);

  const role: GuildRole = managerRoles.some(roleName => memberRoleNames.has(roleName)) ? 'manager' : 'member';

  await prisma.guildMembership.upsert({
    where: { guildId_userId: { guildId, userId } },
    update: { role },
    create: { guildId, userId, role },
  });

  return role;
}

export async function listAccessibleGuildsForUser(userId: string): Promise<AccessibleGuild[]> {
  const ownedGuilds = await prisma.guild.findMany({
    where: { ownerUserId: userId },
    orderBy: { updatedAt: 'desc' },
  });

  for (const guild of ownedGuilds) {
    await ensureOwnerMembership(guild.id, userId);
  }

  const memberships = await prisma.guildMembership.findMany({
    where: { userId },
    include: { guild: true },
    orderBy: { updatedAt: 'desc' },
  });

  const byGuildId = new Map<string, AccessibleGuild>();

  for (const guild of ownedGuilds) {
    byGuildId.set(guild.id, {
      guild,
      role: 'owner',
      permissions: getPermissionsForRole('owner'),
    });
  }

  for (const membership of memberships) {
    if (byGuildId.has(membership.guildId)) continue;

    const importedMember = await getActiveImportedMemberForUser(userId, membership.guildId);
    if (!importedMember) continue;

    const membershipRole = await deriveMembershipRoleForGuild(userId, membership.guildId) ?? normalizeRole(membership.role);
    if (!membershipRole) continue;

    byGuildId.set(membership.guildId, {
      guild: membership.guild,
      role: membershipRole,
      permissions: getPermissionsForRole(membershipRole),
    });
  }

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (user) {
    const importedMembers = await prisma.member.findMany({
      where: {
        discordUserId: user.discordUserId,
        active: true,
      },
      include: {
        guild: true,
      },
      orderBy: { updatedAt: 'desc' },
    });

    for (const importedMember of importedMembers) {
      if (byGuildId.has(importedMember.guildId)) continue;

      const role = await deriveMembershipRoleForGuild(userId, importedMember.guildId);
      if (!role) continue;

      byGuildId.set(importedMember.guildId, {
        guild: importedMember.guild,
        role,
        permissions: getPermissionsForRole(role),
      });
    }
  }

  return [...byGuildId.values()].sort((a, b) => {
    if (a.guild.ownerUserId === userId && b.guild.ownerUserId !== userId) return -1;
    if (a.guild.ownerUserId !== userId && b.guild.ownerUserId === userId) return 1;
    return b.guild.id.localeCompare(a.guild.id);
  });
}

export async function getAccessibleGuildForUser(userId: string, activeGuildId?: string | null): Promise<AccessibleGuild | null> {
  const accessibleGuilds = await listAccessibleGuildsForUser(userId);
  if (accessibleGuilds.length === 0) return null;

  if (activeGuildId) {
    const selected = accessibleGuilds.find(item => item.guild.id === activeGuildId);
    if (selected) return selected;
  }

  return accessibleGuilds[0];
}

export async function getAccessibleGuildByIdForUser(userId: string, guildId: string): Promise<AccessibleGuild | null> {
  const accessibleGuilds = await listAccessibleGuildsForUser(userId);
  return accessibleGuilds.find(item => item.guild.id === guildId) ?? null;
}

export async function requireAccessibleGuild(userId: string, permission: Permission, activeGuildId?: string | null) {
  const access = await getAccessibleGuildForUser(userId, activeGuildId);
  if (!access) return null;
  if (!hasPermission(access.role, permission)) {
    return { ...access, forbidden: true as const };
  }
  return { ...access, forbidden: false as const };
}

export async function requireAccessibleGuildById(userId: string, permission: Permission, guildId: string) {
  const access = await getAccessibleGuildByIdForUser(userId, guildId);
  if (!access) return null;
  if (!hasPermission(access.role, permission)) {
    return { ...access, forbidden: true as const };
  }
  return { ...access, forbidden: false as const };
}
