import type { LineupSnapshotData } from './lineup.ts';

export interface DiscordUser {
  id: string;
  username: string;
  globalName: string | null;
  avatar: string | null;
}

export interface AppStateResponse {
  user: DiscordUser | null;
  guild: { id: string; discordGuildId: string; name: string; icon: string | null } | null;
  squadGroups: LineupSnapshotData[];
  members: Array<{ id: string; name: string; ingameName?: string | null; discordDisplayName?: string | null; classType: string; previousClassType?: string | null; classChangedAt?: string | null; assignedSkills?: string[]; discordId?: string; discordUsername?: string; discordRoles?: string[]; avatar?: string | null; active?: boolean }>;
  divisions: Record<string, unknown> | null;
  skills: Array<{ id: string; name: string; logo: string; description?: string }>;
  lastSyncedAt: string | null;
  roleConfig: { classRoleMap: Record<string, string>; requiredRoles: string[]; accessRoles?: { managerRoles: string[]; memberRoles: string[] } } | null;
  currentRole?: 'owner' | 'manager' | 'member' | null;
  permissions?: string[];
}

export interface DiscordRoleMapping {
  roleName: string;
  classType: string;
  matched: boolean;
}

export interface DiscordMemberPreview {
  id: string;
  username: string;
  displayName: string;
  roles: string[];
  avatar: string | null;
  joinedAt: string;
  suggestedClass: string | null;
  roleMappings: DiscordRoleMapping[];
}

export interface ImportResponse {
  members: DiscordMemberPreview[];
  roles: DiscordRoleMapping[];
  total: number;
}
