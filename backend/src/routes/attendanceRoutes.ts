import { Router } from 'express';
import type { AttendanceChoice } from '@prisma/client';
import { requireAuth } from '../auth.js';
import { getUserAppState } from '../appState.js';
import { requireAccessibleGuild } from '../permissions.js';
import {
  castAttendanceVote,
  closeAttendanceSession,
  deleteAttendanceSession,
  getAttendanceSessionById,
  getAttendanceStateForGuild,
  listAttendanceSessions,
  openAttendanceSession,
  refreshAttendanceSession,
  setAttendanceChannel,
} from '../services/attendanceService.js';
import {
  editAttendanceDiscordMessage,
  sendAttendanceDiscordMessage,
} from '../services/attendanceDiscordService.js';

function parseAttendanceChoice(value: unknown): AttendanceChoice | null {
  return value === 'GO' || value === 'MAYBE' || value === 'NOGO' ? value : null;
}

function isDiscordSnowflake(value: string) {
  return /^\d{17,20}$/.test(value);
}

function parseHistoryLimit(value: unknown) {
  const raw = Array.isArray(value) ? value[0] : value;
  const parsed = typeof raw === 'string' ? Number.parseInt(raw, 10) : 20;
  if (!Number.isFinite(parsed)) return 20;
  return Math.min(Math.max(parsed, 1), 50);
}

export function createAttendanceRoutes() {
  const router = Router();

  router.get('/api/attendance', async (req, res, next) => {
    try {
      const auth = await requireAuth(req, res);
      if (!auth) return;

      const access = await requireAccessibleGuild(auth.user.id, 'view:guild', auth.session.activeGuildId);
      if (!access) {
        res.status(404).json({ error: 'Chưa có server nào được import.' });
        return;
      }

      if (access.forbidden) {
        res.status(403).json({ error: 'Bạn không có quyền xem điểm danh.' });
        return;
      }

      const attendance = await getAttendanceStateForGuild(access.guild.id);
      res.json(attendance);
    } catch (err) {
      next(err);
    }
  });

  router.get('/api/attendance/history', async (req, res, next) => {
    try {
      const auth = await requireAuth(req, res);
      if (!auth) return;

      const access = await requireAccessibleGuild(auth.user.id, 'view:guild', auth.session.activeGuildId);
      if (!access) {
        res.status(404).json({ error: 'Chưa có server nào được import.' });
        return;
      }

      if (access.forbidden) {
        res.status(403).json({ error: 'Bạn không có quyền xem điểm danh.' });
        return;
      }

      const result = await listAttendanceSessions(access.guild.discordGuildId, parseHistoryLimit(req.query.limit));
      res.status(result.status).json(result.body);
    } catch (err) {
      next(err);
    }
  });

  router.get('/api/attendance/history/:sessionId', async (req, res, next) => {
    try {
      const auth = await requireAuth(req, res);
      if (!auth) return;

      const access = await requireAccessibleGuild(auth.user.id, 'view:guild', auth.session.activeGuildId);
      if (!access) {
        res.status(404).json({ error: 'Chưa có server nào được import.' });
        return;
      }

      if (access.forbidden) {
        res.status(403).json({ error: 'Bạn không có quyền xem điểm danh.' });
        return;
      }

      const result = await getAttendanceSessionById(access.guild.discordGuildId, req.params.sessionId);
      res.status(result.status).json(result.body);
    } catch (err) {
      next(err);
    }
  });

  router.delete('/api/attendance/history/:sessionId', async (req, res, next) => {
    try {
      const auth = await requireAuth(req, res);
      if (!auth) return;

      const access = await requireAccessibleGuild(auth.user.id, 'manage:lineup', auth.session.activeGuildId);
      if (!access) {
        res.status(404).json({ error: 'Chưa có server nào được import.' });
        return;
      }

      if (access.forbidden) {
        res.status(403).json({ error: 'Bạn không có quyền xóa lịch sử điểm danh.' });
        return;
      }

      const result = await deleteAttendanceSession(access.guild.discordGuildId, req.params.sessionId);
      res.status(result.status).json(result.body);
    } catch (err) {
      next(err);
    }
  });

  router.put('/api/attendance/config/channel', async (req, res, next) => {
    try {
      const auth = await requireAuth(req, res);
      if (!auth) return;

      const access = await requireAccessibleGuild(auth.user.id, 'manage:lineup', auth.session.activeGuildId);
      if (!access) {
        res.status(404).json({ error: 'Chưa có server nào được import.' });
        return;
      }

      if (access.forbidden) {
        res.status(403).json({ error: 'Bạn không có quyền cấu hình điểm danh.' });
        return;
      }

      const discordChannelId = typeof req.body?.discordChannelId === 'string' ? req.body.discordChannelId.trim() : '';
      if (!isDiscordSnowflake(discordChannelId)) {
        res.status(400).json({ error: 'Discord channel id không hợp lệ.' });
        return;
      }

      const result = await setAttendanceChannel(access.guild.discordGuildId, discordChannelId);
      if (result.status !== 200) {
        res.status(result.status).json(result.body);
        return;
      }

      const state = await getUserAppState(auth.user.id, auth.session.activeGuildId);
      res.json(state);
    } catch (err) {
      next(err);
    }
  });

  router.post('/api/attendance/sessions/open', async (req, res, next) => {
    try {
      const auth = await requireAuth(req, res);
      if (!auth) return;

      const access = await requireAccessibleGuild(auth.user.id, 'manage:lineup', auth.session.activeGuildId);
      if (!access) {
        res.status(404).json({ error: 'Chưa có server nào được import.' });
        return;
      }

      if (access.forbidden) {
        res.status(403).json({ error: 'Bạn không có quyền mở điểm danh.' });
        return;
      }

      const headerText = typeof req.body?.headerText === 'string' ? req.body.headerText : null;
      const result = await openAttendanceSession({
        discordGuildId: access.guild.discordGuildId,
        openedByDiscordUserId: auth.user.discordUserId,
        headerText,
      });

      if (result.status !== 201) {
        res.status(result.status).json(result.body);
        return;
      }

      await sendAttendanceDiscordMessage(result.body.session.id, result.body.session.discordChannelId);

      const state = await getUserAppState(auth.user.id, auth.session.activeGuildId);
      res.status(201).json(state);
    } catch (err) {
      next(err);
    }
  });

  router.post('/api/attendance/sessions/active/close', async (req, res, next) => {
    try {
      const auth = await requireAuth(req, res);
      if (!auth) return;

      const access = await requireAccessibleGuild(auth.user.id, 'manage:lineup', auth.session.activeGuildId);
      if (!access) {
        res.status(404).json({ error: 'Chưa có server nào được import.' });
        return;
      }

      if (access.forbidden) {
        res.status(403).json({ error: 'Bạn không có quyền đóng điểm danh.' });
        return;
      }

      const result = await closeAttendanceSession({
        discordGuildId: access.guild.discordGuildId,
        closedByDiscordUserId: auth.user.discordUserId,
      });

      if (result.status !== 200) {
        res.status(result.status).json(result.body);
        return;
      }

      await editAttendanceDiscordMessage(result.body.session.id, result.body.session.discordChannelId, result.body.session.discordMessageId, true);

      const state = await getUserAppState(auth.user.id, auth.session.activeGuildId);
      res.json(state);
    } catch (err) {
      next(err);
    }
  });

  router.post('/api/attendance/sessions/active/refresh', async (req, res, next) => {
    try {
      const auth = await requireAuth(req, res);
      if (!auth) return;

      const access = await requireAccessibleGuild(auth.user.id, 'manage:lineup', auth.session.activeGuildId);
      if (!access) {
        res.status(404).json({ error: 'Chưa có server nào được import.' });
        return;
      }

      if (access.forbidden) {
        res.status(403).json({ error: 'Bạn không có quyền refresh điểm danh.' });
        return;
      }

      const result = await refreshAttendanceSession(access.guild.discordGuildId);
      if (result.status !== 200) {
        res.status(result.status).json(result.body);
        return;
      }

      await editAttendanceDiscordMessage(result.body.session.id, result.body.session.discordChannelId, result.body.session.discordMessageId, false);

      const state = await getUserAppState(auth.user.id, auth.session.activeGuildId);
      res.json(state);
    } catch (err) {
      next(err);
    }
  });

  router.post('/api/attendance/sessions/:sessionId/votes', async (req, res, next) => {
    try {
      const auth = await requireAuth(req, res);
      if (!auth) return;

      const access = await requireAccessibleGuild(auth.user.id, 'view:guild', auth.session.activeGuildId);
      if (!access) {
        res.status(404).json({ error: 'Chưa có server nào được import.' });
        return;
      }

      if (access.forbidden) {
        res.status(403).json({ error: 'Bạn không có quyền điểm danh.' });
        return;
      }

      const choice = parseAttendanceChoice(req.body?.choice);
      if (!choice) {
        res.status(400).json({ error: 'Lựa chọn điểm danh không hợp lệ.' });
        return;
      }

      const result = await castAttendanceVote({
        discordGuildId: access.guild.discordGuildId,
        discordUserId: auth.user.discordUserId,
        sessionId: req.params.sessionId,
        choice,
      });

      if (result.status !== 200) {
        res.status(result.status).json(result.body);
        return;
      }

      await editAttendanceDiscordMessage(result.body.session.id, result.body.session.discordChannelId, result.body.session.discordMessageId, false);

      const state = await getUserAppState(auth.user.id, auth.session.activeGuildId);
      res.json(state);
    } catch (err) {
      next(err);
    }
  });

  return router;
}
