import { Router } from 'express';
import type { AttendanceChoice, AttendanceType } from '@prisma/client';
import { getUserAppState } from '../appState.js';
import { requireGuildAccess } from '../http/requireGuildAccess.js';
import {
  castAttendanceVote,
  closeAttendanceSession,
  deleteAttendanceSession,
  getAttendanceSessionById,
  getAttendanceStateForGuild,
  listAttendanceSessions,
  normalizeAttendanceType,
  openAttendanceSession,
  refreshAttendanceSession,
  setAttendanceChannel,
} from '../services/attendanceService.js';
import {
  editAttendanceDiscordMessage,
  queueAttendanceDiscordMessageRefresh,
  sendAttendanceDiscordMessage,
} from '../services/attendanceDiscordService.js';

function parseAttendanceChoice(value: unknown): AttendanceChoice | null {
  return value === 'GO' || value === 'NOGO' ? value : null;
}

function parseAttendanceType(value: unknown): AttendanceType {
  return normalizeAttendanceType(value);
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

function parseHistoryOffset(value: unknown) {
  const raw = Array.isArray(value) ? value[0] : value;
  const parsed = typeof raw === 'string' ? Number.parseInt(raw, 10) : 0;
  if (!Number.isFinite(parsed)) return 0;
  return Math.max(parsed, 0);
}

export function createAttendanceRoutes() {
  const router = Router();

  router.get('/api/attendance', async (req, res, next) => {
    try {
      const context = await requireGuildAccess(req, res, 'view:guild', { forbidden: 'Bạn không có quyền xem điểm danh.' });
      if (!context) return;
      res.json(await getAttendanceStateForGuild(context.access.guild.id));
    } catch (err) { next(err); }
  });

  router.get('/api/attendance/history', async (req, res, next) => {
    try {
      const context = await requireGuildAccess(req, res, 'view:guild', { forbidden: 'Bạn không có quyền xem điểm danh.' });
      if (!context) return;
      const result = await listAttendanceSessions(context.access.guild.discordGuildId, parseHistoryLimit(req.query.limit), parseHistoryOffset(req.query.offset), parseAttendanceType(req.query.type));
      res.status(result.status).json(result.body);
    } catch (err) { next(err); }
  });

  router.get('/api/attendance/history/:sessionId', async (req, res, next) => {
    try {
      const context = await requireGuildAccess(req, res, 'view:guild', { forbidden: 'Bạn không có quyền xem điểm danh.' });
      if (!context) return;
      const result = await getAttendanceSessionById(context.access.guild.discordGuildId, req.params.sessionId, parseAttendanceType(req.query.type));
      res.status(result.status).json(result.body);
    } catch (err) { next(err); }
  });

  router.delete('/api/attendance/history/:sessionId', async (req, res, next) => {
    try {
      const context = await requireGuildAccess(req, res, 'manage:attendance', { forbidden: 'Bạn không có quyền xóa lịch sử điểm danh.' });
      if (!context) return;
      const result = await deleteAttendanceSession(context.access.guild.discordGuildId, req.params.sessionId, parseAttendanceType(req.query.type));
      res.status(result.status).json(result.body);
    } catch (err) { next(err); }
  });

  router.put('/api/attendance/config/channel', async (req, res, next) => {
    try {
      const context = await requireGuildAccess(req, res, 'manage:attendance', { forbidden: 'Bạn không có quyền cấu hình điểm danh.' });
      if (!context) return;
      const discordChannelId = typeof req.body?.discordChannelId === 'string' ? req.body.discordChannelId.trim() : '';
      if (!isDiscordSnowflake(discordChannelId)) {
        res.status(400).json({ error: 'Discord channel id không hợp lệ.' });
        return;
      }
      const result = await setAttendanceChannel(context.access.guild.discordGuildId, discordChannelId, parseAttendanceType(req.body?.type));
      if (result.status !== 200) {
        res.status(result.status).json(result.body);
        return;
      }
      res.json(await getUserAppState(context.auth.user.id, context.auth.session.activeGuildId));
    } catch (err) { next(err); }
  });

  router.post('/api/attendance/sessions/open', async (req, res, next) => {
    try {
      const context = await requireGuildAccess(req, res, 'manage:attendance', { forbidden: 'Bạn không có quyền mở điểm danh.' });
      if (!context) return;
      const type = parseAttendanceType(req.body?.type);
      const headerText = typeof req.body?.headerText === 'string' ? req.body.headerText : null;
      const result = await openAttendanceSession({ discordGuildId: context.access.guild.discordGuildId, openedByDiscordUserId: context.auth.user.discordUserId, headerText, type });
      if (result.status !== 201) {
        res.status(result.status).json(result.body);
        return;
      }
      await sendAttendanceDiscordMessage(result.body.session.id, result.body.session.discordChannelId, type);
      res.status(201).json(await getUserAppState(context.auth.user.id, context.auth.session.activeGuildId));
    } catch (err) { next(err); }
  });

  router.post('/api/attendance/sessions/active/close', async (req, res, next) => {
    try {
      const context = await requireGuildAccess(req, res, 'manage:attendance', { forbidden: 'Bạn không có quyền đóng điểm danh.' });
      if (!context) return;
      const result = await closeAttendanceSession({ discordGuildId: context.access.guild.discordGuildId, closedByDiscordUserId: context.auth.user.discordUserId, type: parseAttendanceType(req.body?.type) });
      if (result.status !== 200) {
        res.status(result.status).json(result.body);
        return;
      }
      const session = result.body.session;
      await editAttendanceDiscordMessage(session.id, session.discordChannelId, session.discordMessageId, true, session.type);
      res.json(await getUserAppState(context.auth.user.id, context.auth.session.activeGuildId));
    } catch (err) { next(err); }
  });

  router.post('/api/attendance/sessions/active/refresh', async (req, res, next) => {
    try {
      const context = await requireGuildAccess(req, res, 'manage:attendance', { forbidden: 'Bạn không có quyền refresh điểm danh.' });
      if (!context) return;
      const result = await refreshAttendanceSession(context.access.guild.discordGuildId, parseAttendanceType(req.body?.type));
      if (result.status !== 200) {
        res.status(result.status).json(result.body);
        return;
      }
      const session = result.body.session;
      const edited = await editAttendanceDiscordMessage(session.id, session.discordChannelId, session.discordMessageId, false, session.type, { identitySource: 'live_member' });
      if (!edited) {
        res.status(404).json({ error: 'Không tìm thấy message Discord để refresh.' });
        return;
      }
      res.json(await getUserAppState(context.auth.user.id, context.auth.session.activeGuildId));
    } catch (err) { next(err); }
  });

  router.post('/api/attendance/sessions/:sessionId/votes', async (req, res, next) => {
    try {
      const context = await requireGuildAccess(req, res, 'view:guild', { forbidden: 'Bạn không có quyền điểm danh.' });
      if (!context) return;
      const choice = parseAttendanceChoice(req.body?.choice);
      if (!choice) {
        res.status(400).json({ error: 'Lựa chọn điểm danh không hợp lệ.' });
        return;
      }
      const result = await castAttendanceVote({
        discordGuildId: context.access.guild.discordGuildId,
        discordUserId: context.auth.user.discordUserId,
        sessionId: req.params.sessionId,
        choice,
        type: parseAttendanceType(req.body?.type),
      });
      if (result.status !== 200) {
        res.status(result.status).json(result.body);
        return;
      }
      const session = result.body.session;
      queueAttendanceDiscordMessageRefresh({ sessionId: session.id, type: session.type, discordChannelId: session.discordChannelId, discordMessageId: session.discordMessageId, closed: false });
      res.json(await getUserAppState(context.auth.user.id, context.auth.session.activeGuildId));
    } catch (err) { next(err); }
  });

  return router;
}
