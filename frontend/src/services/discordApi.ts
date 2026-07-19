export type {
  DiscordRoleMapping,
  DiscordMemberPreview,
  ImportResponse,
  AppStateResponse,
  DiscordGuild,
  GuildsResponse,
  AccessibleGuild,
  AccessibleGuildsResponse,
  DiscordUser,
  GvgLineup,
  GvgLineupDivision,
  GvgLineupSquad,
  GvgLineupSlot,
} from './apiTypes.ts';

export { loginWithDiscord, checkAuthStatus, logoutDiscord, getBotInviteUrl } from './authApi.ts';
export { getAccessibleGuilds, setActiveGuild, getDiscordGuilds, getAppState, checkHealth } from './guildApi.ts';
export {
  importDiscordMembers,
  updateMemberIngameName,
  updateMemberClassRole,
  updateMyIngameName,
  deleteMember,
  syncDiscordMembers,
  fetchDiscordRoles,
  fetchCurrentDiscordRoles,
} from './memberApi.ts';
export { resetCurrentGuildData, updateAccessRoles, updateRoleConfig } from './settingsApi.ts';
export { updateAttendanceChannel, openAttendanceSession, closeActiveAttendanceSession, refreshActiveAttendanceSession, getAttendanceHistory, getAttendanceSession, deleteAttendanceHistorySession } from './attendanceApi.ts';
export { getGvgParticipationSessions, getGvgParticipationStats, deleteGvgParticipationSessionsForMonth, finalizeGvgParticipationSession } from './gvgParticipationApi.ts';
export { getGvgLineup, saveGvgLineup, clearGvgLineupSquad } from './gvgLineupApi.ts';
export type { GvgLineupSavePayload } from './gvgLineupApi.ts';
export type { GvgParticipationSession, GvgParticipationStats } from './gvgParticipationApi.ts';
