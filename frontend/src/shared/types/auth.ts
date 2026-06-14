import type { LineupSnapshotData } from './lineup.ts';

export interface DiscordUser {
  id: string;
  username: string;
  globalName: string | null;
  avatar: string | null;
}

export type AttendanceChoice = 'GO' | 'NOGO';
export type AttendanceSessionStatus = 'OPEN' | 'CLOSED' | 'CANCELLED';

export interface AttendanceVote {
  id: string;
  memberId: string;
  choice: AttendanceChoice;
  snapshotIngameName: string | null;
  snapshotClassType: string | null;
  votedAt: string;
  updatedAt: string;
  member: {
    id: string;
    discordUserId: string;
    username: string;
    displayName: string;
    ingameName: string | null;
    classType: string;
    avatar: string | null;
    active: boolean;
  };
}

export interface AttendanceSession {
  id: string;
  guildId: string;
  status: AttendanceSessionStatus;
  headerText: string | null;
  discordChannelId: string | null;
  discordMessageId: string | null;
  openedByDiscordUserId: string | null;
  closedByDiscordUserId: string | null;
  openedAt: string;
  closedAt: string | null;
  lastRenderedAt: string | null;
  lastVoteAt: string | null;
  createdAt: string;
  updatedAt: string;
  summary: { go: number; nogo: number; total: number };
  votes: AttendanceVote[];
}

export interface AttendanceState {
  config: { id: string; discordChannelId: string; discordChannelName: string | null; createdAt: string; updatedAt: string } | null;
  activeSession: AttendanceSession | null;
  recentSessions: AttendanceSession[];
}

export interface LineupEditLock {
  guildId: string;
  holderUserId: string;
  holderDiscordUserId: string;
  holderName: string;
  holderRole: 'owner' | 'manager' | 'member';
  acquiredAt: string;
  expiresAt: string;
  isHeldByMe: boolean;
  canOverride: boolean;
}

export interface AppStateResponse {
  user: DiscordUser | null;
  guild: { id: string; discordGuildId: string; name: string; icon: string | null } | null;
  squadGroups: LineupSnapshotData[];
  members: Array<{ id: string; name: string; ingameName?: string | null; discordDisplayName?: string | null; classType: string; joinedAt?: string | null; assignedSkills?: string[]; discordId?: string; discordUsername?: string; discordRoles?: string[]; avatar?: string | null; active?: boolean; gvgParticipationCount?: number }>;
  divisions: Record<string, unknown> | null;
  skills: Array<{ id: string; name: string; logo: string; description?: string }>;
  attendance: AttendanceState;
  lastSyncedAt: string | null;
  roleConfig: { classRoleMap: Record<string, string>; requiredRoles: string[]; accessRoles?: { managerRoles: string[]; memberRoles: string[] } } | null;
  currentRole?: 'owner' | 'manager' | 'member' | null;
  permissions?: string[];
  lineupLock?: LineupEditLock | null;
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
