import { getUserAppState } from '../appState.js';
import { listAccessibleGuildsForUser } from '../permissions.js';
import { updateSessionActiveGuild } from '../session.js';

export async function switchActiveGuild(userId: string, sessionId: string, guildId: string) {
  const guilds = await listAccessibleGuildsForUser(userId);
  const selected = guilds.find(item => item.guild.id === guildId);
  if (!selected) {
    return { status: 403 as const, body: { error: 'Bạn không có quyền truy cập server này.' } };
  }

  await updateSessionActiveGuild(sessionId, guildId);
  const state = await getUserAppState(userId, guildId);
  return { status: 200 as const, body: state };
}
