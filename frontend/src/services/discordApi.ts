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
  OnboardingAvailableGuild,
  OnboardingAvailableGuildsResponse,
  ConnectGuildResponse,
  GuildOnboardingStateResponse,
  CompleteGuildOnboardingResponse,
  DiscordUser,
  AuthStatusResponse,
  AccessibleGuildSummary,
  SystemAdminRole,
  SubscriptionStatus,
  BillingCycle,
  PaymentMethod,
  SubscriptionAccessState,
  BillingPayment,
  BillingCurrentResponse,
  BillingHistoryResponse,
} from './apiTypes.ts';

export { loginWithDiscord, checkAuthStatus, logoutDiscord, getBotInviteUrl } from './authApi.ts';
export { getAccessibleGuilds, setActiveGuild, getDiscordGuilds, getAvailableGuilds, connectGuild, getGuildOnboardingState, completeGuildOnboarding, getAppState, checkHealth } from './guildApi.ts';
export {
  importDiscordMembers,
  acknowledgeClassChange,
  updateMemberIngameName,
  updateMemberClassRole,
  updateMyIngameName,
  deleteMember,
  assignMemberSkill,
  removeMemberSkill,
  clearMemberSkills,
  syncDiscordMembers,
  fetchDiscordRoles,
  fetchCurrentDiscordRoles,
} from './memberApi.ts';
export { saveSquadLayout, getLineupEditLock, acquireLineupEditLock, heartbeatLineupEditLock, releaseLineupEditLock, overrideLineupEditLock, getLineupSnapshots, createLineupSnapshot, updateLineupSnapshot, getLineupSnapshot, restoreLineupSnapshot, deleteLineupSnapshot } from './lineupApi.ts';
export { resetCurrentGuildData, updateAccessRoles, updateRoleConfig } from './settingsApi.ts';
export { updateAttendanceChannel, openAttendanceSession, closeActiveAttendanceSession, refreshActiveAttendanceSession, getAttendanceHistory, getAttendanceSession, deleteAttendanceHistorySession } from './attendanceApi.ts';
export { getGvgParticipationSessions, getGvgParticipationStats, deleteGvgParticipationSessionsForMonth, finalizeGvgParticipationSession } from './gvgParticipationApi.ts';
export { getBillingCurrent, getBillingHistory } from './billingApi.ts';
export { getAdminOverview, getAdminGuilds, getAdminGuildDetail, recordGuildPayment, suspendGuild, unsuspendGuild, forceSyncGuild, getAdminUsers, getAdminAuditLogs } from './adminApi.ts';
export type { GvgParticipationSession, GvgParticipationStats } from './gvgParticipationApi.ts';
export type { AdminAuditLogRow, AdminGuildDetailResponse, AdminGuildFilters, AdminGuildRow, AdminOverviewResponse, AdminPaymentRecord, AdminUserRow, AdminUserSummary, RecordGuildPaymentPayload } from './adminApi.ts';
