import {
  ButtonInteraction,
  ChatInputCommandInteraction,
  Interaction,
  MessageFlags,
  SlashCommandBuilder,
} from 'discord.js';
import type { AttendanceType } from '@prisma/client';
import { prisma } from './db.js';
import { hasPermission } from './permissions.js';
import {
  closeAttendanceSession,
  getAttendanceTypeLabel,
  openAttendanceSession,
  refreshAttendanceSession,
  setAttendanceChannel,
} from './services/attendanceService.js';
import {
  editAttendanceDiscordMessage,
  parseAttendanceButtonCustomId,
  sendAttendanceDiscordMessage,
  setAttendanceDiscordClient,
} from './services/attendanceDiscordService.js';
import { enqueueAttendanceVoteJob } from './services/attendanceVoteQueueService.js';

const attendanceInteractionDebugEnabled = process.env.DISCORD_ATTENDANCE_DEBUG === 'true' || process.env.DISCORD_REALTIME_DEBUG === 'true';

function getBotInstanceIdentity() {
  return {
    instanceId: process.env.INSTANCE_ID || process.env.RAILWAY_REPLICA_ID || process.env.HOSTNAME || 'local',
    hostname: process.env.HOSTNAME || 'unknown',
    pid: process.pid,
  };
}

function getErrorCode(err: unknown) {
  return typeof err === 'object' && err !== null && 'code' in err ? (err as { code?: unknown }).code ?? null : null;
}

function getErrorMessage(err: unknown) {
  return err instanceof Error ? err.message : String(err);
}

function logAttendanceInteraction(message: string, details?: Record<string, unknown>) {
  if (!attendanceInteractionDebugEnabled) return;
  if (details) {
    console.log(`[Discord Bot][Attendance] ${message}`, details);
    return;
  }
  console.log(`[Discord Bot][Attendance] ${message}`);
}

export const setAttendanceChannelCommand = new SlashCommandBuilder()
  .setName('setchannel')
  .setDescription('Đặt kênh hiện tại làm kênh điểm danh Bang Chiến');

export const setScrimAttendanceChannelCommand = new SlashCommandBuilder()
  .setName('setchannelscrim')
  .setDescription('Đặt kênh hiện tại làm kênh điểm danh Scrim');

function createAttendanceCommand(name: 'diemdanhbangchien' | 'diemdanhscrim', description: string) {
  return new SlashCommandBuilder()
    .setName(name)
    .setDescription(description)
    .addSubcommand(subcommand => subcommand
      .setName('open')
      .setDescription(`Mở phiên ${description.toLowerCase()}`)
      .addStringOption(option => option
        .setName('text')
        .setDescription('Tiêu đề hoặc ghi chú hiển thị trên message điểm danh')
        .setRequired(false)
        .setMaxLength(200)))
    .addSubcommand(subcommand => subcommand.setName('close').setDescription(`Đóng phiên ${description.toLowerCase()} đang mở`))
    .addSubcommand(subcommand => subcommand.setName('refresh').setDescription(`Render lại message ${description.toLowerCase()} hiện tại`));
}

export const attendanceCommand = createAttendanceCommand('diemdanhbangchien', 'Quản lý điểm danh Bang Chiến');
export const scrimAttendanceCommand = createAttendanceCommand('diemdanhscrim', 'Quản lý điểm danh Scrim');

async function requireAttendanceManager(interaction: ChatInputCommandInteraction) {
  if (!interaction.guildId) {
    await interaction.reply({ content: 'Lệnh này chỉ dùng được trong Discord server.', flags: MessageFlags.Ephemeral });
    return null;
  }
  const guild = await prisma.guild.findUnique({ where: { discordGuildId: interaction.guildId } });
  if (!guild) {
    await interaction.reply({ content: 'Server Discord này chưa được import vào GvG Manager.', flags: MessageFlags.Ephemeral });
    return null;
  }
  const user = await prisma.user.findUnique({ where: { discordUserId: interaction.user.id } });
  if (!user) {
    await interaction.reply({ content: 'Bạn chưa đăng nhập GvG Manager bằng Discord nên chưa có quyền quản lý điểm danh.', flags: MessageFlags.Ephemeral });
    return null;
  }
  const membership = await prisma.guildMembership.findUnique({ where: { guildId_userId: { guildId: guild.id, userId: user.id } } });
  const role = guild.ownerUserId === user.id ? 'owner' : membership?.role === 'owner' || membership?.role === 'manager' || membership?.role === 'member' ? membership.role : null;
  if (!hasPermission(role, 'manage:attendance')) {
    await interaction.reply({ content: 'Bạn không có quyền quản lý điểm danh trong GvG Manager.', flags: MessageFlags.Ephemeral });
    return null;
  }
  return { guild, user, role };
}

async function replyServiceError(interaction: ChatInputCommandInteraction, result: { status: number; body: { error?: string } }) {
  const content = result.body.error || 'Có lỗi xảy ra khi xử lý điểm danh.';
  if (interaction.deferred || interaction.replied) await interaction.editReply({ content });
  else await interaction.reply({ content, flags: MessageFlags.Ephemeral });
}

async function handleTypedAttendanceCommand(interaction: ChatInputCommandInteraction, type: AttendanceType) {
  const access = await requireAttendanceManager(interaction);
  if (!access || !interaction.guildId) return true;
  const label = getAttendanceTypeLabel(type);
  const subcommand = interaction.options.getSubcommand();

  if (subcommand === 'open') {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });
    const result = await openAttendanceSession({ discordGuildId: interaction.guildId, openedByDiscordUserId: interaction.user.id, headerText: interaction.options.getString('text'), type });
    if (result.status !== 201) {
      await replyServiceError(interaction, result);
      return true;
    }
    const session = result.body.session;
    const sent = await sendAttendanceDiscordMessage(session.id, session.discordChannelId || interaction.channelId, type);
    await interaction.editReply({ content: sent ? `Đã mở phiên điểm danh ${label}.` : `Đã mở phiên điểm danh ${label} nhưng không thể gửi message vào kênh đã cấu hình.` });
    return true;
  }

  if (subcommand === 'close') {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });
    const result = await closeAttendanceSession({ discordGuildId: interaction.guildId, closedByDiscordUserId: interaction.user.id, type });
    if (result.status !== 200) {
      await replyServiceError(interaction, result);
      return true;
    }
    const session = result.body.session;
    await editAttendanceDiscordMessage(session.id, session.discordChannelId, session.discordMessageId, true, type);
    await interaction.editReply({ content: `Đã đóng phiên điểm danh ${label}.` });
    return true;
  }

  if (subcommand === 'refresh') {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });
    const result = await refreshAttendanceSession(interaction.guildId, type);
    if (result.status !== 200) {
      await replyServiceError(interaction, result);
      return true;
    }
    const session = result.body.session;
    const edited = await editAttendanceDiscordMessage(session.id, session.discordChannelId, session.discordMessageId, false, type, { identitySource: 'live_member' });
    await interaction.editReply({ content: edited ? `Đã refresh message điểm danh ${label}.` : 'Không tìm thấy message Discord để refresh.' });
    return true;
  }

  return true;
}

async function acknowledgeAttendanceButtonInteraction(interaction: ButtonInteraction, interactionContext: Record<string, unknown>, interactionStartedAt: number) {
  try {
    logAttendanceInteraction('Attempting to acknowledge attendance button interaction', {
      ...interactionContext,
      ackType: 'deferUpdate',
    });
    await interaction.deferUpdate();
    logAttendanceInteraction('Acknowledged attendance button interaction', {
      ...interactionContext,
      ackType: 'deferUpdate',
      ackMs: Date.now() - interactionStartedAt,
    });
    return true;
  } catch (err) {
    console.warn('[Discord Bot] Attendance button acknowledge failed:', {
      ...interactionContext,
      ackType: 'deferUpdate',
      elapsedMs: Date.now() - interactionStartedAt,
      errorCode: getErrorCode(err),
      errorMessage: getErrorMessage(err),
    });
    return false;
  }
}

async function sendAttendanceButtonFeedback(interaction: ButtonInteraction, input: {
  content: string;
  feedbackType: 'success' | 'error';
  interactionContext: Record<string, unknown>;
  interactionStartedAt: number;
}) {
  const feedbackStartedAt = Date.now();

  try {
    await interaction.followUp({
      content: input.content,
      flags: MessageFlags.Ephemeral,
    });
    logAttendanceInteraction('Sent attendance button follow-up', {
      ...input.interactionContext,
      feedbackType: input.feedbackType,
      feedbackMs: Date.now() - feedbackStartedAt,
      totalMs: Date.now() - input.interactionStartedAt,
    });
  } catch (err) {
    console.warn('[Discord Bot] Attendance button follow-up failed:', {
      ...input.interactionContext,
      feedbackType: input.feedbackType,
      feedbackMs: Date.now() - feedbackStartedAt,
      totalMs: Date.now() - input.interactionStartedAt,
      errorCode: getErrorCode(err),
      errorMessage: getErrorMessage(err),
    });
  }
}

export async function handleAttendanceInteraction(interaction: Interaction) {
  if (interaction.isChatInputCommand()) {
    if (interaction.commandName === 'setchannel' || interaction.commandName === 'setchannelscrim') {
      const access = await requireAttendanceManager(interaction);
      if (!access || !interaction.guildId) return true;
      const type: AttendanceType = interaction.commandName === 'setchannelscrim' ? 'SCRIM' : 'GVG';
      const result = await setAttendanceChannel(interaction.guildId, interaction.channelId, type);
      if (result.status !== 200) await replyServiceError(interaction, result);
      else await interaction.reply({ content: `Đã đặt kênh hiện tại làm kênh điểm danh ${getAttendanceTypeLabel(type)}.`, flags: MessageFlags.Ephemeral });
      return true;
    }
    if (interaction.commandName === 'diemdanhbangchien') return handleTypedAttendanceCommand(interaction, 'GVG');
    if (interaction.commandName === 'diemdanhscrim') return handleTypedAttendanceCommand(interaction, 'SCRIM');
    return false;
  }

  if (!interaction.isButton()) return false;
  const parsed = parseAttendanceButtonCustomId(interaction.customId);
  if (!parsed) return false;
  if (!interaction.guildId) {
    await interaction.reply({ content: 'Nút điểm danh chỉ dùng được trong Discord server.', flags: MessageFlags.Ephemeral });
    return true;
  }

  const interactionStartedAt = Date.now();
  const interactionContext = {
    ...getBotInstanceIdentity(),
    interactionId: interaction.id,
    customId: interaction.customId,
    sessionId: parsed.sessionId,
    type: parsed.type,
    discordUserId: interaction.user.id,
    guildId: interaction.guildId,
    channelId: interaction.channelId,
  };

  logAttendanceInteraction('Received attendance button interaction', interactionContext);

  const acknowledged = await acknowledgeAttendanceButtonInteraction(interaction, interactionContext, interactionStartedAt);
  if (!acknowledged) return true;

  const enqueueStartedAt = Date.now();
  let enqueueResult: Awaited<ReturnType<typeof enqueueAttendanceVoteJob>>;

  try {
    enqueueResult = await enqueueAttendanceVoteJob({
      sessionId: parsed.sessionId,
      type: parsed.type,
      discordGuildId: interaction.guildId,
      discordUserId: interaction.user.id,
      choice: parsed.choice,
      discordMessageId: interaction.message.id,
    });
  } catch (err) {
    console.warn('[Discord Bot] Attendance vote enqueue failed:', {
      ...interactionContext,
      enqueueMs: Date.now() - enqueueStartedAt,
      totalMs: Date.now() - interactionStartedAt,
      errorCode: getErrorCode(err),
      errorMessage: getErrorMessage(err),
    });
    await sendAttendanceButtonFeedback(interaction, {
      content: 'Không thể xếp hàng xử lý điểm danh lúc này. Vui lòng thử lại sau.',
      feedbackType: 'error',
      interactionContext,
      interactionStartedAt,
    });
    return true;
  }

  logAttendanceInteraction('Attendance vote job enqueue completed', {
    ...interactionContext,
    enqueueMs: Date.now() - enqueueStartedAt,
    enqueueStatus: enqueueResult.status,
    totalMsToQueue: Date.now() - interactionStartedAt,
  });

  if (enqueueResult.status !== 202) {
    await sendAttendanceButtonFeedback(interaction, {
      content: enqueueResult.body.error || 'Không thể xếp hàng xử lý điểm danh lúc này. Vui lòng thử lại sau.',
      feedbackType: 'error',
      interactionContext,
      interactionStartedAt,
    });
    return true;
  }

  const label = parsed.choice === 'GO' ? 'Tham gia' : 'Không tham gia';
  await sendAttendanceButtonFeedback(interaction, {
    content: `Đã nhận lựa chọn: ${label}. Đang cập nhật điểm danh.`,
    feedbackType: 'success',
    interactionContext,
    interactionStartedAt,
  });
  return true;
}

export { setAttendanceDiscordClient };
