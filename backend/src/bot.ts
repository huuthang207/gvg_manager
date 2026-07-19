import { Client, GatewayIntentBits, MessageFlags, REST, Routes, SlashCommandBuilder } from 'discord.js';
import { prisma } from './db.js';
import { attendanceCommand, handleAttendanceInteraction, scrimAttendanceCommand, setAttendanceChannelCommand, setScrimAttendanceChannelCommand } from './botAttendance.js';
import { setAttendanceDiscordClient } from './services/attendanceDiscordService.js';
import { publishGuildAppStateChanged } from './services/realtimeGateway.js';
import { queueGuildSync } from './services/syncService.js';

const realtimeDebugEnabled = process.env.DISCORD_REALTIME_DEBUG === 'true';
const recentQueuedGuilds = new Map<string, number>();
const BANG_VIEN_ROLE_NAME = 'Bang Viên';

function getBotInstanceIdentity() {
  return {
    instanceId: process.env.INSTANCE_ID || process.env.RAILWAY_REPLICA_ID || process.env.HOSTNAME || 'local',
    hostname: process.env.HOSTNAME || 'unknown',
    pid: process.pid,
  };
}

function isDiscordBotEnabled() {
  return process.env.DISCORD_BOT_ENABLED !== 'false';
}

function logRealtime(message: string) {
  if (!realtimeDebugEnabled) return;
  console.log(message);
}

function queueGuildSyncDedup(guildId: string) {
  const now = Date.now();
  const lastQueuedAt = recentQueuedGuilds.get(guildId) ?? 0;
  if (now - lastQueuedAt < 1000) return;
  recentQueuedGuilds.set(guildId, now);
  queueGuildSync(guildId);
}

const setNameCommand = new SlashCommandBuilder()
  .setName('setname')
  .setDescription('Cập nhật tên ingame của bạn trong hệ thống GvG')
  .addStringOption(option => option
    .setName('ten_ingame')
    .setDescription('Tên ingame của bạn')
    .setRequired(true)
    .setMaxLength(32));

function validateIngameName(value: string) {
  const trimmed = value.trim();
  if (!trimmed || trimmed.length > 32 || /[\x00-\x1F\x7F]/.test(trimmed)) return null;
  return trimmed;
}

export async function startDiscordBot() {
  const token = process.env.DISCORD_BOT_TOKEN;
  const clientId = process.env.DISCORD_CLIENT_ID;
  const guildId = process.env.FIXED_GUILD_DISCORD_ID;
  const botEnabled = isDiscordBotEnabled();
  const instanceIdentity = getBotInstanceIdentity();

  console.log('[Discord Bot] Startup configuration', {
    ...instanceIdentity,
    botEnabled,
    hasToken: !!token,
    hasClientId: !!clientId,
    hasGuildId: !!guildId,
  });

  if (!botEnabled) {
    console.log('[Discord Bot] Startup skipped because DISCORD_BOT_ENABLED=false', instanceIdentity);
    return;
  }

  if (!token || !clientId || !guildId) {
    console.log('[Discord Bot] Slash command disabled: DISCORD_BOT_TOKEN, DISCORD_CLIENT_ID, or FIXED_GUILD_DISCORD_ID missing');
    return;
  }

  const rest = new REST({ version: '10' }).setToken(token);
  await rest.put(
    Routes.applicationGuildCommands(clientId, guildId),
    { body: [setNameCommand.toJSON(), setAttendanceChannelCommand.toJSON(), setScrimAttendanceChannelCommand.toJSON(), attendanceCommand.toJSON(), scrimAttendanceCommand.toJSON()] }
  );
  console.log(`[Discord Bot] Guild slash commands registered for guild ${guildId}`);

  const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers] });
  setAttendanceDiscordClient(client);

  client.once('ready', () => {
    console.log(`[Discord Bot] Logged in as ${client.user?.tag}`, instanceIdentity);
  });

  client.on('guildMemberAdd', member => {
    logRealtime(`[Discord Bot] guildMemberAdd -> queue sync guild=${member.guild.id}`);
    queueGuildSyncDedup(member.guild.id);
  });

  client.on('guildMemberRemove', member => {
    logRealtime(`[Discord Bot] guildMemberRemove -> queue sync guild=${member.guild.id}`);
    queueGuildSyncDedup(member.guild.id);
  });

  client.on('guildMemberUpdate', (_oldMember, newMember) => {
    logRealtime(`[Discord Bot] guildMemberUpdate -> queue sync guild=${newMember.guild.id}`);
    queueGuildSyncDedup(newMember.guild.id);
  });

  client.on('raw', packet => {
    if (packet.t !== 'GUILD_MEMBER_UPDATE') return;
    const guildId = (packet.d as { guild_id?: string } | undefined)?.guild_id;
    if (!guildId) return;
    logRealtime(`[Discord Bot] raw:GUILD_MEMBER_UPDATE -> queue sync guild=${guildId}`);
    queueGuildSyncDedup(guildId);
  });

  client.on('warn', message => {
    logRealtime(`[Discord Bot] Warn: ${message}`);
  });

  client.on('debug', message => {
    if (message.includes('GUILD_MEMBER_UPDATE')) {
      logRealtime(`[Discord Bot] Debug: ${message}`);
    }
  });

  client.on('error', err => {
    console.error('[Discord Bot] Client error:', err?.message || err);
  });

  client.on('shardError', err => {
    console.error('[Discord Bot] Shard error:', err?.message || err);
  });

  client.on('warn', message => {
    console.warn('[Discord Bot] Warn:', message);
  });

  client.on('debug', message => {
    if (message.includes('GUILD_MEMBER_UPDATE')) {
      console.log('[Discord Bot] Debug:', message);
    }
  });

  client.on('interactionCreate', async interaction => {
    if (await handleAttendanceInteraction(interaction)) return;

    if (!interaction.isChatInputCommand() || interaction.commandName !== 'setname') return;

    if (!interaction.guildId) {
      await interaction.reply({ content: 'Lệnh này chỉ dùng được trong Discord server.', flags: MessageFlags.Ephemeral });
      return;
    }

    const guildMember = await interaction.guild?.members.fetch(interaction.user.id);
    const hasBangVienRole = guildMember?.roles.cache.some(role => role.name === BANG_VIEN_ROLE_NAME) ?? false;
    if (!hasBangVienRole) {
      await interaction.reply({ content: `Chỉ thành viên có role ${BANG_VIEN_ROLE_NAME} mới được dùng lệnh này.`, flags: MessageFlags.Ephemeral });
      return;
    }

    const ingameName = validateIngameName(interaction.options.getString('ten_ingame', true));
    if (!ingameName) {
      await interaction.reply({ content: 'Tên ingame không hợp lệ. Vui lòng nhập từ 1-32 ký tự và không xuống dòng.', flags: MessageFlags.Ephemeral });
      return;
    }

    const member = await prisma.member.findFirst({
      where: {
        discordUserId: interaction.user.id,
        guild: { discordGuildId: interaction.guildId },
        active: true,
      },
    });

    if (!member) {
      await interaction.reply({ content: 'Bạn chưa được import hoặc đồng bộ vào hệ thống GvG. Vui lòng liên hệ quản lý để đồng bộ Discord trước.', flags: MessageFlags.Ephemeral });
      return;
    }

    await prisma.member.update({
      where: { id: member.id },
      data: { ingameName },
    });

    publishGuildAppStateChanged({ guildId: member.guildId, reason: 'member_updated' });

    await interaction.reply({ content: `Đã cập nhật tên ingame của bạn thành: ${ingameName}`, flags: MessageFlags.Ephemeral });
  });

  await client.login(token);
}
