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
