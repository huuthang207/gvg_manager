export interface DiscordGuild {
  id: string;
  name: string;
  icon: string | null;
  owner: boolean;
}

export interface GuildsResponse {
  guilds: DiscordGuild[];
}

export interface AccessibleGuild {
  id: string;
  discordGuildId: string;
  name: string;
  icon: string | null;
  currentRole: 'owner' | 'manager' | 'member';
  permissions: string[];
}

export interface AccessibleGuildsResponse {
  guilds: AccessibleGuild[];
  activeGuildId: string | null;
}

export interface OnboardingAvailableGuild {
  discordGuildId: string;
  name: string;
  icon: string | null;
  owner: boolean;
  permissions: string | null;
  canManageGuild: boolean;
  isConnected: boolean;
  localGuildId: string | null;
  botPresent: boolean;
  subscriptionStatus: string | null;
}

export interface OnboardingAvailableGuildsResponse {
  guilds: OnboardingAvailableGuild[];
}

export type ConnectGuildResponse =
  | { status: 'BOT_REQUIRED'; inviteUrl: string | null }
  | {
    status: 'CONNECTED';
    guild: { id: string; discordGuildId: string; name: string; icon: string | null };
    subscription: import('./auth.ts').SubscriptionAccessState;
    appState: import('./auth.ts').AppStateResponse;
  };

export interface GuildOnboardingStateResponse {
  guildId: string;
  discordGuildId: string;
  botPresent: boolean;
  subscription: import('./auth.ts').SubscriptionAccessState;
  roleConfigComplete: boolean;
  requiredRolesConfigured: boolean;
  accessRolesConfigured: boolean;
  attendanceChannelConfigured: boolean;
  onboardingCompletedAt: string | null;
}

export interface CompleteGuildOnboardingResponse {
  guildId: string;
  onboardingCompletedAt: string | null;
}
