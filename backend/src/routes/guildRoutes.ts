import { Router } from 'express';
import { getGuildMembersWithRoles, getBotGuilds } from '../discord.js';
import { mapRolesToClasses } from '../roleMapper.js';
import { getUserGuilds } from '../oauth2.js';
import { getCache, setCache } from '../cache.js';
import { requireAuth } from '../auth.js';
import { getUserAppState } from '../appState.js';
import { prisma } from '../db.js';
import { ensureOwnerMembership, getAccessibleGuildForUser, listAccessibleGuildsForUser, requireAccessibleGuild } from '../permissions.js';
import { syncGuildMembers } from '../discordSync.js';
import { switchActiveGuild } from '../services/guildService.js';
import { syncActiveGuildMembers } from '../services/syncService.js';

const GUILD_MEMBERS_CACHE_TTL = 5 * 60 * 1000;

export function createGuildRoutes() {
  const router = Router();

  router.get('/api/discord/guilds', async (req, res, next) => {
    try {
      const auth = await requireAuth(req, res);
      if (!auth) return;
      const { session, sessionId } = auth;

      if (!process.env.DISCORD_BOT_TOKEN) {
        res.status(500).json({ error: 'DISCORD_BOT_TOKEN not configured' });
        return;
      }

      const cacheKey = `guilds_${sessionId}`;
      const cachedData = getCache<{ guilds: any[]; botGuildIds: string[] }>(cacheKey);
      if (cachedData) {
        console.log('[Cache] Guilds list hit from cache');
        res.json(cachedData);
        return;
      }

      const userGuilds = await getUserGuilds(session.accessToken);

      let botGuildIds: string[] = [];
      try {
        const botGuilds = await getBotGuilds();
        botGuildIds = botGuilds.map(g => g.id);
      } catch (err) {
        console.error('[Discord API] Failed to get bot guilds:', err);
      }

      const filteredGuilds = userGuilds.filter(guild => botGuildIds.includes(guild.id));

      const data = { guilds: filteredGuilds, botGuildIds };
      setCache(cacheKey, data, 2 * 60 * 1000);
      res.json(data);
    } catch (err) {
      next(err);
    }
  });

  router.get('/api/discord/bot/invite', (_req, res) => {
    const clientId = process.env.DISCORD_CLIENT_ID;
    if (!clientId) {
      res.status(500).json({ error: 'DISCORD_CLIENT_ID not configured' });
      return;
    }

    const scopes = 'bot';
    const permissions = '1';
    const inviteUrl = `https://discord.com/oauth2/authorize?client_id=${clientId}&scope=${scopes}&permissions=${permissions}`;

    res.json({ inviteUrl });
  });

  router.get('/api/app/state', async (req, res, next) => {
    try {
      const auth = await requireAuth(req, res);
      if (!auth) return;

      if (auth.session.authBlockedReason) {
        res.status(403).json({ error: auth.session.authBlockedReason, code: 'ACCESS_BLOCKED' });
        return;
      }

      const state = await getUserAppState(auth.user.id, auth.session.activeGuildId);
      res.json(state);
    } catch (err) {
      next(err);
    }
  });

  router.get('/api/guilds/accessible', async (req, res, next) => {
    try {
      const auth = await requireAuth(req, res);
      if (!auth) return;

      const guilds = await listAccessibleGuildsForUser(auth.user.id);
      res.json({
        guilds: guilds.map(item => ({
          id: item.guild.id,
          discordGuildId: item.guild.discordGuildId,
          name: item.guild.name,
          icon: item.guild.icon,
          currentRole: item.role,
          permissions: item.permissions,
        })),
        activeGuildId: auth.session.activeGuildId ?? null,
      });
    } catch (err) {
      next(err);
    }
  });

  router.put('/api/guilds/active', async (req, res, next) => {
    try {
      const auth = await requireAuth(req, res);
      if (!auth) return;

      const guildId = typeof req.body?.guildId === 'string' ? req.body.guildId : '';
      if (!guildId) {
        res.status(400).json({ error: 'guildId is required' });
        return;
      }

      const result = await switchActiveGuild(auth.user.id, auth.sessionId, guildId);
      res.status(result.status).json(result.body);
    } catch (err) {
      next(err);
    }
  });

  router.post('/api/discord/import', async (req, res, next) => {
    try {
      const auth = await requireAuth(req, res);
      if (!auth) return;

      const { guildId, persist, classRoleMap, requiredRoles, selectedMemberIds } = req.body as {
        guildId?: string;
        persist?: boolean;
        classRoleMap?: Record<string, string>;
        requiredRoles?: string[];
        selectedMemberIds?: string[];
      };

      if (!guildId) {
        res.status(400).json({ error: 'guildId is required' });
        return;
      }

      if (!process.env.DISCORD_BOT_TOKEN) {
        res.status(500).json({ error: 'DISCORD_BOT_TOKEN not configured' });
        return;
      }

      const cacheKey = `guild_${guildId}`;
      let cachedData = getCache<{ members: any[]; roles: any[] }>(cacheKey);

      if (!cachedData) {
        console.log(`[Cache] Miss for guild ${guildId}, fetching from Discord...`);
        cachedData = await getGuildMembersWithRoles(guildId);
        setCache(cacheKey, cachedData, GUILD_MEMBERS_CACHE_TTL);
      } else {
        console.log(`[Cache] Hit for guild ${guildId}`);
      }

      const { members, roles } = cachedData;

      const mappedMembers = members.map((member: any) => {
        const roleMappings = mapRolesToClasses(member.roles);
        const matchedRole = roleMappings.find((r: any) => r.matched);

        return {
          id: member.id,
          username: member.username,
          displayName: member.nick || member.global_name || member.username,
          roles: member.roles,
          avatar: member.avatar,
          joinedAt: member.joined_at,
          suggestedClass: matchedRole?.classType ?? null,
          roleMappings,
        };
      });

      const roleMappings = mapRolesToClasses(roles.map((r: any) => r.name));

      if (persist) {
        const existingGuild = await prisma.guild.findUnique({
          where: { discordGuildId: guildId },
        });

        if (existingGuild) {
          const activeAccess = await getAccessibleGuildForUser(auth.user.id, auth.session.activeGuildId);
          const hasManageSettingsInExistingGuild = activeAccess?.guild.id === existingGuild.id && activeAccess.permissions.includes('manage:settings');
          const isOwnerOfExistingGuild = existingGuild.ownerUserId === auth.user.id;

          if (!isOwnerOfExistingGuild && !hasManageSettingsInExistingGuild) {
            res.status(403).json({ error: 'Bạn không có quyền import dữ liệu cho server này.' });
            return;
          }
        }

        const guildInfo = await getUserGuilds(auth.session.accessToken).then(guilds => guilds.find(g => g.id === guildId));
        const guild = await prisma.guild.upsert({
          where: { discordGuildId: guildId },
          update: {
            name: guildInfo?.name ?? guildId,
            icon: guildInfo?.icon ?? null,
            lastSyncedAt: new Date(),
          },
          create: {
            discordGuildId: guildId,
            name: guildInfo?.name ?? guildId,
            icon: guildInfo?.icon ?? null,
            ownerUserId: auth.user.id,
            lastSyncedAt: new Date(),
          },
        });

        await prisma.guildClassRoleMapping.deleteMany({ where: { guildId: guild.id } });
        if (classRoleMap) {
          await prisma.guildClassRoleMapping.createMany({
            data: Object.entries(classRoleMap)
              .filter(([, roleName]) => roleName)
              .map(([classType, roleName]) => ({ guildId: guild.id, classType, roleName })),
          });
        }

        await prisma.guildRequiredRole.deleteMany({ where: { guildId: guild.id } });
        if (requiredRoles?.length) {
          await prisma.guildRequiredRole.createMany({
            data: requiredRoles.map(roleName => ({ guildId: guild.id, roleName })),
            skipDuplicates: true,
          });
        }

        await ensureOwnerMembership(guild.id, auth.user.id);

        await syncGuildMembers({
          guildId: guild.id,
          discordGuildId: guildId,
          classRoleMap: classRoleMap ?? {},
          requiredRoles: requiredRoles ?? [],
          selectedMemberIds,
        });
      }

      res.json({
        members: mappedMembers,
        roles: roleMappings,
        total: mappedMembers.length,
      });
    } catch (err: any) {
      if (err.response?.status === 403 || err.response?.status === 404) {
        console.error('[Discord API] Bot not in server or missing permissions');
        res.status(403).json({
          error: 'Bot không có trong server này. Vui lòng thêm bot vào server trước.',
          code: 'BOT_NOT_IN_SERVER',
        });
        return;
      }
      next(err);
    }
  });

  router.get('/api/discord/roles/current', async (req, res, next) => {
    try {
      const auth = await requireAuth(req, res);
      if (!auth) return;

      const access = await requireAccessibleGuild(auth.user.id, 'view:guild', auth.session.activeGuildId);

      if (!access) {
        res.status(404).json({ error: 'Chưa có server nào được import.' });
        return;
      }

      const cacheKey = `guild_${access.guild.discordGuildId}`;
      let cachedData = getCache<{ members: any[]; roles: any[] }>(cacheKey);
      if (!cachedData) {
        cachedData = await getGuildMembersWithRoles(access.guild.discordGuildId);
        setCache(cacheKey, cachedData, GUILD_MEMBERS_CACHE_TTL);
      }

      res.json({ roles: mapRolesToClasses(cachedData.roles.map((role: any) => role.name)) });
    } catch (err) {
      next(err);
    }
  });

  router.post('/api/discord/sync', async (req, res, next) => {
    try {
      const auth = await requireAuth(req, res);
      if (!auth) return;

      const result = await syncActiveGuildMembers(auth.user.id, auth.session.activeGuildId);
      res.status(result.status).json(result.body);
    } catch (err: any) {
      if (err.response?.status === 403 || err.response?.status === 404) {
        res.status(403).json({
          error: 'Bot không có trong server này hoặc thiếu quyền đọc thành viên.',
          code: 'BOT_NOT_IN_SERVER',
        });
        return;
      }
      next(err);
    }
  });

  return router;
}
