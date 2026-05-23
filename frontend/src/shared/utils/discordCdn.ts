export function getDiscordGuildIconUrl(discordGuildId: string, icon: string | null | undefined, size = 96): string | null {
  return icon ? `https://cdn.discordapp.com/icons/${discordGuildId}/${icon}.png?size=${size}` : null;
}
