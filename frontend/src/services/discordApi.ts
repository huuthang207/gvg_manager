/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type {
  DiscordRoleMapping,
  DiscordMemberPreview,
  ImportResponse,
  LineupSnapshotData,
  LineupSnapshotSummary,
  LineupSnapshotDetail,
  AppStateResponse,
  LineupEditLock,
  DiscordGuild,
  GuildsResponse,
  AccessibleGuild,
  AccessibleGuildsResponse,
  DiscordUser,
} from './apiTypes.ts';

export { loginWithDiscord, checkAuthStatus, logoutDiscord, getBotInviteUrl } from './authApi.ts';
export { getAccessibleGuilds, setActiveGuild, getDiscordGuilds, getAppState, checkHealth } from './guildApi.ts';
export {
  importDiscordMembers,
  acknowledgeClassChange,
  updateMemberIngameName,
  updateMemberClassRole,
  updateMyIngameName,
  deleteMember,
  assignMemberSkill,
  removeMemberSkill,
  syncDiscordMembers,
  fetchDiscordRoles,
  fetchCurrentDiscordRoles,
} from './memberApi.ts';
export { saveSquadLayout, getLineupEditLock, acquireLineupEditLock, heartbeatLineupEditLock, releaseLineupEditLock, overrideLineupEditLock, getLineupSnapshots, createLineupSnapshot, updateLineupSnapshot, getLineupSnapshot, restoreLineupSnapshot, deleteLineupSnapshot } from './lineupApi.ts';
export { resetCurrentGuildData, updateAccessRoles, updateRoleConfig } from './settingsApi.ts';
export { updateAttendanceChannel, openAttendanceSession, closeActiveAttendanceSession, refreshActiveAttendanceSession, getAttendanceHistory, getAttendanceSession, deleteAttendanceHistorySession } from './attendanceApi.ts';
export { getGvgParticipationSessions, finalizeGvgParticipationSession } from './gvgParticipationApi.ts';
export type { GvgParticipationSession } from './gvgParticipationApi.ts';
