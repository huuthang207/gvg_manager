import { getGuildMembersWithRoles } from '../discord.js';
import { exchangeCode, getUserGuilds, getUserInfo } from '../oauth2.js';
import { createSession, getSession } from '../session.js';
import { prisma } from '../db.js';

export async function handleOAuthCallback(code: string, redirectUri: string) {
  const tokenData = await exchangeCode(code, redirectUri);
  const discordUser = await getUserInfo(tokenData.access_token);

  const user = await prisma.user.upsert({
    where: { discordUserId: discordUser.id },
    update: {
      username: discordUser.username,
      globalName: discordUser.global_name,
      avatar: discordUser.avatar,
    },
    create: {
      discordUserId: discordUser.id,
      username: discordUser.username,
      globalName: discordUser.global_name,
      avatar: discordUser.avatar,
    },
  });

  const fixedGuildDiscordId = process.env.FIXED_GUILD_DISCORD_ID;
  if (!fixedGuildDiscordId) {
    throw new Error('FIXED_GUILD_DISCORD_ID not configured');
  }

  let fixedGuild = await prisma.guild.findUnique({
    where: { discordGuildId: fixedGuildDiscordId },
    include: { requiredRoles: true },
  });

  if (!fixedGuild) {
    const adminDiscordUserId = process.env.ADMIN_DISCORD_USER_ID;
    if (!adminDiscordUserId || discordUser.id !== adminDiscordUserId) {
      throw new Error('Fixed guild is not provisioned in database');
    }

    fixedGuild = await prisma.guild.create({
      data: {
        discordGuildId: fixedGuildDiscordId,
        name: process.env.FIXED_GUILD_NAME || fixedGuildDiscordId,
        icon: null,
        ownerUserId: user.id,
        memberships: {
          create: {
            userId: user.id,
            role: 'owner',
          },
        },
      },
      include: { requiredRoles: true },
    });
  }

  const userGuilds = await getUserGuilds(tokenData.access_token);
  const fixedGuildInfo = userGuilds.find(guild => guild.id === fixedGuildDiscordId);
  const joinedFixedGuild = Boolean(fixedGuildInfo);

  if (fixedGuildInfo) {
    fixedGuild = await prisma.guild.update({
      where: { id: fixedGuild.id },
      data: {
        name: fixedGuildInfo.name,
        icon: fixedGuildInfo.icon,
      },
      include: { requiredRoles: true },
    });
  }

  let authBlockedReason: string | null = null;

  if (!joinedFixedGuild) {
    authBlockedReason = 'Bạn chưa tham gia server bang.';
  } else {
    const { members } = await getGuildMembersWithRoles(fixedGuildDiscordId);
    const discordMember = members.find(member => member.id === discordUser.id);

    if (!discordMember) {
      authBlockedReason = 'Không tìm thấy thông tin thành viên của bạn trong server bang.';
    } else {
      const requiredRoles = fixedGuild.requiredRoles.map(role => role.roleName);
      if (requiredRoles.length > 0) {
        const hasRequiredRoles = requiredRoles.every(roleName => discordMember.roles.includes(roleName));
        if (!hasRequiredRoles) {
          authBlockedReason = 'Bạn chưa có đủ role yêu cầu để vào hệ thống.';
        }
      }
    }
  }

  const sessionId = await createSession({
    accessToken: tokenData.access_token,
    refreshToken: tokenData.refresh_token,
    expiresAt: Date.now() + (tokenData.expires_in * 1000),
    userId: user.id,
    activeGuildId: fixedGuild.id,
    authBlockedReason,
  });

  return { sessionId };
}

export async function getAuthStatusBySessionId(sessionId: string | undefined) {
  if (!sessionId) {
    return { authenticated: false };
  }

  const session = await getSession(sessionId);
  if (!session) {
    return { authenticated: false };
  }

  const user = await prisma.user.findUnique({ where: { id: session.userId } });
  if (!user) {
    return { authenticated: false };
  }

  return {
    authenticated: true,
    authorized: !session.authBlockedReason,
    blockedReason: session.authBlockedReason ?? null,
    expiresAt: session.expiresAt,
    user: {
      id: user.discordUserId,
      username: user.username,
      globalName: user.globalName,
      avatar: user.avatar,
    },
  };
}
