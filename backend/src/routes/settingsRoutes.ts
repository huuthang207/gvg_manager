import { Router } from 'express';
import { requireAuth } from '../auth.js';
import { normalizeRoleConfigInput, updateGuildAccessRoles, updateGuildRoleConfig } from '../services/settingsService.js';

export function createSettingsRoutes() {
  const router = Router();

  router.put('/api/discord/role-config', async (req, res, next) => {
    try {
      const auth = await requireAuth(req, res);
      if (!auth) return;

      const { classRoleMap, requiredRoles } = req.body as {
        classRoleMap?: Record<string, string>;
        requiredRoles?: string[];
      };

      if (!classRoleMap || !Array.isArray(requiredRoles)) {
        res.status(400).json({ error: 'Cấu hình role không hợp lệ.' });
        return;
      }

      const { classRoles } = normalizeRoleConfigInput(classRoleMap, requiredRoles);
      if (classRoles.some(role => !role)) {
        res.status(400).json({ error: 'Vui lòng gán role cho tất cả các phái.' });
        return;
      }
      if (new Set(classRoles).size !== classRoles.length) {
        res.status(400).json({ error: 'Một role không thể gán cho nhiều phái.' });
        return;
      }

      const result = await updateGuildRoleConfig(auth.user.id, auth.session.activeGuildId, classRoleMap, requiredRoles);
      res.status(result.status).json(result.body);
    } catch (err) {
      next(err);
    }
  });

  router.put('/api/discord/access-roles', async (req, res, next) => {
    try {
      const auth = await requireAuth(req, res);
      if (!auth) return;

      const managerRoles = Array.isArray(req.body?.managerRoles) ? req.body.managerRoles : [];
      const memberRoles = Array.isArray(req.body?.memberRoles) ? req.body.memberRoles : [];

      const result = await updateGuildAccessRoles(auth.user.id, auth.session.activeGuildId, managerRoles, memberRoles);
      res.status(result.status).json(result.body);
    } catch (err) {
      next(err);
    }
  });

  return router;
}
