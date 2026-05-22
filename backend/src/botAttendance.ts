import {
  ChatInputCommandInteraction,
  Interaction,
  SlashCommandBuilder,
} from 'discord.js';
import type { AttendanceChoice } from '@prisma/client';
import { prisma } from './db.js';
import { hasPermission } from './permissions.js';
import {
  castAttendanceVote,
  closeAttendanceSession,
  openAttendanceSession,
  refreshAttendanceSession,
  setAttendanceChannel,
} from './services/attendanceService.js';
import {
  buildAttendanceButtons,
  editAttendanceDiscordMessage,
  parseAttendanceButtonCustomId,
  sendAttendanceDiscordMessage,
  setAttendanceDiscordClient,
} from './services/attendanceDiscordService.js';

export const setAttendanceChannelCommand = new SlashCommandBuilder()
  .setName('setchannel')
  .setDescription('Đặt kênh hiện tại làm kênh điểm danh Bang Chiến');

export const attendanceCommand = new SlashCommandBuilder()
  .setName('diemdanhbangchien')
  .setDescription('Quản lý điểm danh Bang Chiến')
  .addSubcommand(subcommand => subcommand
    .setName('open')
    .setDescription('Mở phiên điểm danh Bang Chiến')
    .addStringOption(option => option
      .setName('text')
      .setDescription('Tiêu đề hoặc ghi chú hiển thị trên message điểm danh')
      .setRequired(false)
      .setMaxLength(200)))
  .addSubcommand(subcommand => subcommand
    .setName('close')
    .setDescription('Đóng phiên điểm danh Bang Chiến đang mở'))
  .addSubcommand(subcommand => subcommand
    .setName('refresh')
    .setDescription('Render lại message điểm danh Bang Chiến hiện tại'));

async function requireAttendanceManager(interaction: ChatInputCommandInteraction) {
  if (!interaction.guildId) {
    await interaction.reply({ content: 'Lệnh này chỉ dùng được trong Discord server.', ephemeral: true });
    return null;
  }

  const guild = await prisma.guild.findUnique({ where: { discordGuildId: interaction.guildId } });

  if (!guild) {
    await interaction.reply({ content: 'Server Discord này chưa được import vào GvG Manager.', ephemeral: true });
    return null;
  }

  const user = await prisma.user.findUnique({ where: { discordUserId: interaction.user.id } });

  if (!user) {
    await interaction.reply({ content: 'Bạn chưa đăng nhập GvG Manager bằng Discord nên chưa có quyền quản lý điểm danh.', ephemeral: true });
    return null;
  }

  const membership = await prisma.guildMembership.findUnique({
    where: { guildId_userId: { guildId: guild.id, userId: user.id } },
  });
  const role = guild.ownerUserId === user.id ? 'owner' : membership?.role === 'owner' || membership?.role === 'manager' || membership?.role === 'member' ? membership.role : null;

  if (!hasPermission(role, 'manage:lineup')) {
    await interaction.reply({ content: 'Bạn không có quyền quản lý điểm danh trong GvG Manager.', ephemeral: true });
    return null;
  }

  return { guild, user, role };
}

async function replyServiceError(interaction: ChatInputCommandInteraction, result: { status: number; body: { error?: string } }) {
  const content = result.body.error || 'Có lỗi xảy ra khi xử lý điểm danh.';
  if (interaction.deferred || interaction.replied) {
    await interaction.editReply({ content });
    return;
  }
  await interaction.reply({ content, ephemeral: true });
}

export async function handleAttendanceInteraction(interaction: Interaction) {
  if (interaction.isChatInputCommand()) {
    if (interaction.commandName === 'setchannel') {
      const access = await requireAttendanceManager(interaction);
      if (!access || !interaction.guildId) return true;

      const result = await setAttendanceChannel(interaction.guildId, interaction.channelId);
      if (result.status !== 200) {
        await replyServiceError(interaction, result);
        return true;
      }

      await interaction.reply({ content: 'Đã đặt kênh hiện tại làm kênh điểm danh Bang Chiến.', ephemeral: true });
      return true;
    }

    if (interaction.commandName !== 'diemdanhbangchien') return false;

    const access = await requireAttendanceManager(interaction);
    if (!access || !interaction.guildId) return true;

    const subcommand = interaction.options.getSubcommand();

    if (subcommand === 'open') {
      await interaction.deferReply({ ephemeral: true });
      const result = await openAttendanceSession({
        discordGuildId: interaction.guildId,
        openedByDiscordUserId: interaction.user.id,
        headerText: interaction.options.getString('text'),
      });

      if (result.status !== 201) {
        await replyServiceError(interaction, result);
        return true;
      }

      const session = result.body.session;
      const sent = await sendAttendanceDiscordMessage(session.id, session.discordChannelId || interaction.channelId);
      await interaction.editReply({ content: sent ? 'Đã mở phiên điểm danh Bang Chiến.' : 'Đã mở phiên điểm danh nhưng không thể gửi message vào kênh đã cấu hình.' });
      return true;
    }

    if (subcommand === 'close') {
      await interaction.deferReply({ ephemeral: true });
      const result = await closeAttendanceSession({
        discordGuildId: interaction.guildId,
        closedByDiscordUserId: interaction.user.id,
      });

      if (result.status !== 200) {
        await replyServiceError(interaction, result);
        return true;
      }

      const session = result.body.session;
      await editAttendanceDiscordMessage(session.id, session.discordChannelId, session.discordMessageId, true);
      await interaction.editReply({ content: 'Đã đóng phiên điểm danh Bang Chiến.' });
      return true;
    }

    if (subcommand === 'refresh') {
      await interaction.deferReply({ ephemeral: true });
      const result = await refreshAttendanceSession(interaction.guildId);

      if (result.status !== 200) {
        await replyServiceError(interaction, result);
        return true;
      }

      const session = result.body.session;
      const edited = await editAttendanceDiscordMessage(session.id, session.discordChannelId, session.discordMessageId, false);
      await interaction.editReply({ content: edited ? 'Đã refresh message điểm danh.' : 'Không tìm thấy message Discord để refresh.' });
      return true;
    }

    return true;
  }

  if (!interaction.isButton()) return false;

  const parsed = parseAttendanceButtonCustomId(interaction.customId) as { choice: AttendanceChoice; sessionId: string } | null;
  if (!parsed) return false;

  if (!interaction.guildId) {
    await interaction.reply({ content: 'Nút điểm danh chỉ dùng được trong Discord server.', ephemeral: true });
    return true;
  }

  try {
    await interaction.deferReply({ ephemeral: true });
  } catch (err) {
    console.warn('[Discord Bot] Attendance button defer failed:', err instanceof Error ? err.message : err);
    return true;
  }

  const result = await castAttendanceVote({
    discordGuildId: interaction.guildId,
    discordUserId: interaction.user.id,
    sessionId: parsed.sessionId,
    choice: parsed.choice,
    discordMessageId: interaction.message.id,
  });

  if (result.status !== 200) {
    await interaction.editReply({ content: result.body.error || 'Không thể ghi nhận điểm danh.' }).catch(err => {
      console.warn('[Discord Bot] Attendance button error reply failed:', err instanceof Error ? err.message : err);
    });
    return true;
  }

  const label = parsed.choice === 'GO' ? 'Tham gia' : parsed.choice === 'MAYBE' ? 'Dự bị' : 'Không tham gia';
  await interaction.editReply({ content: `Đã ghi nhận lựa chọn: ${label}.` }).catch(err => {
    console.warn('[Discord Bot] Attendance button success reply failed:', err instanceof Error ? err.message : err);
  });

  editAttendanceDiscordMessage(result.body.session.id, result.body.session.discordChannelId, result.body.session.discordMessageId, false).catch(err => {
    console.warn('[Discord Bot] Attendance message refresh failed:', err instanceof Error ? err.message : err);
  });
  return true;
}
