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
  updateMyIngameName,
  deleteMember,
  deleteInactiveMember,
  syncDiscordMembers,
  fetchDiscordRoles,
  fetchCurrentDiscordRoles,
} from './memberApi.ts';
export { saveSquadLayout, getLineupSnapshots, createLineupSnapshot, updateLineupSnapshot, getLineupSnapshot, restoreLineupSnapshot, deleteLineupSnapshot } from './lineupApi.ts';
export { updateAccessRoles, updateRoleConfig } from './settingsApi.ts';
