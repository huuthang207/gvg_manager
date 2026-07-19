import { Router } from 'express';
import { getUserAppState } from '../appState.js';
import { requireGuildAccess } from '../http/requireGuildAccess.js';
import {
  deleteGvgParticipationSessionsForMonth,
  finalizeGvgParticipationSession,
  getGvgParticipationStats,
  listGvgParticipationSessions,
  parseGvgParticipationStatsMonth,
} from '../services/gvgParticipationService.js';

function parseLimit(value: unknown) {
  const raw = Array.isArray(value) ? value[0] : value;
  const parsed = typeof raw === 'string' ? Number.parseInt(raw, 10) : 20;
  if (!Number.isFinite(parsed)) return 20;
  return Math.min(Math.max(parsed, 1), 50);
}

function parseOffset(value: unknown) {
  const raw = Array.isArray(value) ? value[0] : value;
  const parsed = typeof raw === 'string' ? Number.parseInt(raw, 10) : 0;
  if (!Number.isFinite(parsed)) return 0;
  return Math.max(parsed, 0);
}

export function createGvgParticipationRoutes() {
  const router = Router();

  router.get('/api/gvg-participation/sessions', async (req, res, next) => {
    try {
      const context = await requireGuildAccess(req, res, 'view:guild', {
        forbidden: 'Bạn không có quyền xem lịch sử bang chiến.',
      });
      if (!context) return;
      const { access } = context;

      res.json(await listGvgParticipationSessions(access.guild.id, {
        limit: parseLimit(req.query.limit),
        offset: parseOffset(req.query.offset),
      }));
    } catch (err) {
      next(err);
    }
  });

  router.post('/api/gvg-participation/sessions/finalize', async (req, res, next) => {
    try {
      const context = await requireGuildAccess(req, res, 'manage:attendance', {
        forbidden: 'Bạn không có quyền chốt tham gia bang chiến.',
      });
      if (!context) return;
      const { auth, access } = context;

      const result = await finalizeGvgParticipationSession({
        guildId: access.guild.id,
        finalizedByDiscordUserId: auth.user.discordUserId,
        battleDate: typeof req.body?.battleDate === 'string' ? req.body.battleDate : '',
        battleCount: Number(req.body?.battleCount),
        participations: Array.isArray(req.body?.participations) ? req.body.participations : undefined,
        memberIds: Array.isArray(req.body?.memberIds) ? req.body.memberIds : undefined,
        note: typeof req.body?.note === 'string' ? req.body.note : null,
      });

      if (result.status !== 200) {
        res.status(result.status).json(result.body);
        return;
      }

      const state = await getUserAppState(auth.user.id, auth.session.activeGuildId);
      res.json({ ...state, gvgParticipationSession: result.body.session });
    } catch (err) {
      next(err);
    }
  });

  router.delete('/api/gvg-participation/sessions/month', async (req, res, next) => {
    try {
      const context = await requireGuildAccess(req, res, 'manage:attendance', {
        forbidden: 'Bạn không có quyền xoá dữ liệu bang chiến.',
      });
      if (!context) return;
      const { auth, access } = context;

      const result = await deleteGvgParticipationSessionsForMonth({
        guildId: access.guild.id,
        month: typeof req.body?.month === 'string' ? req.body.month : '',
      });

      if (result.status !== 200) {
        res.status(result.status).json(result.body);
        return;
      }

      const state = await getUserAppState(auth.user.id, auth.session.activeGuildId);
      res.json({ ...state, gvgParticipationDeletedCount: result.body.deletedCount });
    } catch (err) {
      next(err);
    }
  });

  router.get('/api/gvg-participation/stats', async (req, res, next) => {
    try {
      const context = await requireGuildAccess(req, res, 'view:guild', {
        forbidden: 'Bạn không có quyền xem thống kê bang chiến.',
      });
      if (!context) return;
      const { access } = context;

      const rawMonth = Array.isArray(req.query.month) ? req.query.month[0] : req.query.month;
      const month = typeof rawMonth === 'string' && rawMonth.trim() ? rawMonth.trim() : null;
      const monthRange = month ? parseGvgParticipationStatsMonth(month) : null;
      if (month && !monthRange) {
        res.status(400).json({ error: 'Tháng thống kê bang chiến không hợp lệ.' });
        return;
      }

      res.json({
        ...(monthRange ? { month: monthRange.month } : {}),
        stats: await getGvgParticipationStats(access.guild.id, { month }),
      });
    } catch (err) {
      next(err);
    }
  });

  return router;
}
