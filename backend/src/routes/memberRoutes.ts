import { Router } from 'express';
import { requireAuth } from '../auth.js';
import { requireInternalBotToken } from '../http/requireInternalBotToken.js';
import { validateIngameName } from '../http/validators.js';
import {
  acknowledgeMemberClassChange,
  deleteInactiveMemberFromDatabase,
  removeBangVienRoleFromMember,
  updateBotMemberIngameName,
  updateMemberIngameNameForManager,
  updateMyIngameName,
} from '../services/memberService.js';

export function createMemberRoutes() {
  const router = Router();

  router.patch('/api/bot/guilds/:discordGuildId/members/:discordUserId/ingame-name', async (req, res, next) => {
    try {
      if (!requireInternalBotToken(req, res)) return;

      const { discordGuildId, discordUserId } = req.params;
      const ingameName = validateIngameName(req.body?.ingameName);

      if (!ingameName) {
        res.status(400).json({ error: 'Tên ingame không hợp lệ. Vui lòng nhập từ 1-32 ký tự và không xuống dòng.' });
        return;
      }

      const result = await updateBotMemberIngameName(discordGuildId, discordUserId, ingameName);
      res.status(result.status).json(result.body);
    } catch (err) {
      next(err);
    }
  });

  router.patch('/api/members/:memberId', async (req, res, next) => {
    try {
      const auth = await requireAuth(req, res);
      if (!auth) return;

      const { memberId } = req.params;
      const ingameName = validateIngameName(req.body?.ingameName);

      if (!ingameName) {
        res.status(400).json({ error: 'Tên ingame không hợp lệ. Vui lòng nhập từ 1-32 ký tự và không xuống dòng.' });
        return;
      }

      const result = await updateMemberIngameNameForManager(auth.user.id, auth.session.activeGuildId, memberId, ingameName);
      res.status(result.status).json(result.body);
    } catch (err) {
      next(err);
    }
  });

  router.delete('/api/members/:memberId/database', async (req, res, next) => {
    try {
      const auth = await requireAuth(req, res);
      if (!auth) return;

      const { memberId } = req.params;
      const result = await deleteInactiveMemberFromDatabase(auth.user.id, auth.session.activeGuildId, memberId);
      res.status(result.status).json(result.body);
    } catch (err) {
      next(err);
    }
  });

  router.delete('/api/members/:memberId', async (req, res, next) => {
    try {
      const auth = await requireAuth(req, res);
      if (!auth) return;

      const { memberId } = req.params;
      const result = await removeBangVienRoleFromMember(auth.user.id, auth.session.activeGuildId, memberId);
      res.status(result.status).json(result.body);
    } catch (err: any) {
      if (err.response?.status === 403) {
        res.status(403).json({ error: 'Bot không có quyền gỡ role Bang Viên hoặc role của bot thấp hơn role này.' });
        return;
      }
      if (err.response?.status === 404) {
        res.status(404).json({ error: 'Không tìm thấy thành viên hoặc role Bang Viên trên Discord.' });
        return;
      }
      next(err);
    }
  });

  router.patch('/api/members/me/ingame-name', async (req, res, next) => {
    try {
      const auth = await requireAuth(req, res);
      if (!auth) return;

      const ingameName = validateIngameName(req.body?.ingameName);

      if (!ingameName) {
        res.status(400).json({ error: 'Tên ingame không hợp lệ. Vui lòng nhập từ 1-32 ký tự và không xuống dòng.' });
        return;
      }

      const result = await updateMyIngameName(auth.user.id, auth.user.discordUserId, auth.session.activeGuildId, ingameName);
      res.status(result.status).json(result.body);
    } catch (err) {
      next(err);
    }
  });

  router.post('/api/members/:memberId/class-change/ack', async (req, res, next) => {
    try {
      const auth = await requireAuth(req, res);
      if (!auth) return;

      const { memberId } = req.params;
      const result = await acknowledgeMemberClassChange(auth.user.id, auth.session.activeGuildId, memberId);
      res.status(result.status).json(result.body);
    } catch (err) {
      next(err);
    }
  });

  return router;
}
