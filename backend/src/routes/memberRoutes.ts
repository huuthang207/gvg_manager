import { Router } from 'express';
import { requireAuth } from '../auth.js';
import { requireInternalBotToken } from '../http/requireInternalBotToken.js';
import { validateIngameName } from '../http/validators.js';
import {
  deleteInactiveMemberFromDatabase,
  deleteInactiveMembersFromDatabase,
  removeBangVienRoleFromMember,
  updateBotMemberIngameName,
  updateMemberClassRoleForManager,
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

  router.patch('/api/members/:memberId/class-role', async (req, res, next) => {
    try {
      const auth = await requireAuth(req, res);
      if (!auth) return;

      const { memberId } = req.params;
      const classType = typeof req.body?.classType === 'string' ? req.body.classType.trim() : '';

      if (!classType) {
        res.status(400).json({ error: 'Môn phái không hợp lệ.' });
        return;
      }

      const result = await updateMemberClassRoleForManager(auth.user.id, auth.session.activeGuildId, memberId, classType);
      res.status(result.status).json(result.body);
    } catch (err: any) {
      if (err.response?.status === 403) {
        res.status(403).json({ error: 'Bot không có quyền quản lý role này hoặc role của bot thấp hơn role cần gán/gỡ.' });
        return;
      }
      if (err.response?.status === 404) {
        res.status(404).json({ error: 'Không tìm thấy thành viên hoặc role môn phái trên Discord.' });
        return;
      }
      next(err);
    }
  });

  router.delete('/api/members/inactive/database', async (req, res, next) => {
    try {
      const auth = await requireAuth(req, res);
      if (!auth) return;

      const result = await deleteInactiveMembersFromDatabase(auth.user.id, auth.session.activeGuildId);
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

  return router;
}
