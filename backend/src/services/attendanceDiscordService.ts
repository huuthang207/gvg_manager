import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  type Client,
} from 'discord.js';
import {
  attachAttendanceMessage,
  getAttendanceRenderPayload,
} from './attendanceService.js';

const ATTENDANCE_BUTTON_PREFIX = 'attendance';

let discordClient: Pick<Client, 'channels'> | null = null;

export function setAttendanceDiscordClient(client: Pick<Client, 'channels'>) {
  discordClient = client;
}

export function buildAttendanceButtons(sessionId: string, disabled = false) {
  return new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId(`${ATTENDANCE_BUTTON_PREFIX}:GO:${sessionId}`)
      .setLabel('Tham gia')
      .setStyle(ButtonStyle.Success)
      .setDisabled(disabled),
    new ButtonBuilder()
      .setCustomId(`${ATTENDANCE_BUTTON_PREFIX}:MAYBE:${sessionId}`)
      .setLabel('Dự bị')
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(disabled),
    new ButtonBuilder()
      .setCustomId(`${ATTENDANCE_BUTTON_PREFIX}:NOGO:${sessionId}`)
      .setLabel('Không tham gia')
      .setStyle(ButtonStyle.Danger)
      .setDisabled(disabled),
  );
}

export function parseAttendanceButtonCustomId(customId: string) {
  const [prefix, choice, sessionId] = customId.split(':');
  if (prefix !== ATTENDANCE_BUTTON_PREFIX) return null;
  if (choice !== 'GO' && choice !== 'MAYBE' && choice !== 'NOGO') return null;
  if (!sessionId) return null;
  return { choice, sessionId };
}

export async function sendAttendanceDiscordMessage(sessionId: string, channelId: string | null) {
  if (!discordClient || !channelId) return false;

  const renderResult = await getAttendanceRenderPayload(sessionId);
  if (renderResult.status !== 200) return false;

  const channel = await discordClient.channels.fetch(channelId).catch(() => null);
  if (!channel || !channel.isTextBased() || !('send' in channel)) return false;

  const message = await channel.send({
    content: renderResult.body.content,
    components: [buildAttendanceButtons(sessionId)],
  });
  await attachAttendanceMessage({ sessionId, discordMessageId: message.id });
  return true;
}

export async function editAttendanceDiscordMessage(sessionId: string, channelId: string | null, messageId: string | null, closed = false) {
  if (!discordClient || !channelId || !messageId) return false;

  const renderResult = await getAttendanceRenderPayload(sessionId);
  if (renderResult.status !== 200) return false;

  const channel = await discordClient.channels.fetch(channelId).catch(() => null);
  if (!channel || !channel.isTextBased()) return false;

  const message = await channel.messages.fetch(messageId).catch(() => null);
  if (!message) return false;

  await message.edit({
    content: renderResult.body.content,
    components: [buildAttendanceButtons(sessionId, closed)],
  });
  return true;
}
