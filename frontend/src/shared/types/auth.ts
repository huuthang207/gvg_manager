export interface DiscordUser {
  id: string;
  username: string;
  globalName: string | null;
  avatar: string | null;
}

export type AttendanceChoice = 'GO' | 'NOGO';
export type RawAttendanceChoice = AttendanceChoice | 'MAYBE';
export type AttendanceType = 'GVG' | 'SCRIM';
export type AttendanceSessionStatus = 'OPEN' | 'CLOSED' | 'CANCELLED';

export interface AttendanceVote {
  id: string;
  memberId: string;
  choice: RawAttendanceChoice;
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
  type: AttendanceType;
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

export interface AttendanceTypeState {
  type: AttendanceType;
  config: { id: string; type: AttendanceType; discordChannelId: string; discordChannelName: string | null; createdAt: string; updatedAt: string } | null;
  activeSession: AttendanceSession | null;
  recentSessions: AttendanceSession[];
}

export interface AttendanceState {
  gvg: AttendanceTypeState;
  scrim: AttendanceTypeState;
}

export interface GvgLineupSlot {
  memberId: string | null;
  member: { id: string; name: string; classType: string } | null;
}

export interface GvgLineupSquad {
  id: string;
  squadNumber: number;
  name: string;
  orderIndex: number;
  slots: GvgLineupSlot[];
}

export interface GvgLineupDivision {
  id: string;
  orderIndex: number;
  note: string | null;
  squads: GvgLineupSquad[];
}

export interface GvgLineup {
  divisions: GvgLineupDivision[];
}

export interface AppStateResponse {
  user: DiscordUser | null;
  guild: { id: string; discordGuildId: string; name: string; icon: string | null } | null;
  members: Array<{ id: string; name: string; ingameName?: string | null; discordDisplayName?: string | null; classType: string; joinedAt?: string | null; discordId?: string; discordUsername?: string; discordRoles?: string[]; avatar?: string | null; active?: boolean; gvgParticipationCount?: number }>;
  attendance: AttendanceState;
  lastSyncedAt: string | null;
  roleConfig: { classRoleMap: Record<string, string>; requiredRoles: string[]; accessRoles?: { managerRoles: string[]; memberRoles: string[] } } | null;
  currentRole?: 'owner' | 'manager' | 'member' | null;
  permissions?: string[];
  gvgLineup: GvgLineup | null;
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
