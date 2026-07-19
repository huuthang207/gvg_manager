import { Router } from 'express';
import { requireGuildAccess } from '../http/requireGuildAccess.js';
import { clearGvgLineupSquad, ensureGvgLineup, saveGvgLineup } from '../services/gvgLineupService.js';
import { publishGuildAppStateChanged } from '../services/realtimeGateway.js';

function requireGuildOwner(role: string, res: { status: (code: number) => { json: (body: unknown) => void } }) {
  if (role === 'owner') return true;
  res.status(403).json({ error: 'Chỉ bang chủ có quyền chỉnh sửa đội hình Bang Chiến.' });
  return false;
}

export type GvgLineupRouteDependencies = {
  requireGuildAccess: typeof requireGuildAccess;
  ensureGvgLineup: typeof ensureGvgLineup;
  saveGvgLineup: typeof saveGvgLineup;
  clearGvgLineupSquad: typeof clearGvgLineupSquad;
  publishGuildAppStateChanged: typeof publishGuildAppStateChanged;
};

export function createGvgLineupRoutes(dependencies: Partial<GvgLineupRouteDependencies> = {}) {
  const {
    requireGuildAccess: requireGuildAccessForRoute = requireGuildAccess,
    ensureGvgLineup: ensureGvgLineupForRoute = ensureGvgLineup,
    saveGvgLineup: saveGvgLineupForRoute = saveGvgLineup,
    clearGvgLineupSquad: clearGvgLineupSquadForRoute = clearGvgLineupSquad,
    publishGuildAppStateChanged: publishGuildAppStateChangedForRoute = publishGuildAppStateChanged,
  } = dependencies;
  const router = Router();

  router.get('/api/gvg-lineup', async (req, res, next) => {
    try {
      const context = await requireGuildAccessForRoute(req, res, 'view:guild', {
        forbidden: 'Bạn không có quyền xem đội hình Bang Chiến.',
      });
      if (!context) return;
      res.json(await ensureGvgLineupForRoute(context.access.guild.id));
    } catch (err) {
      next(err);
    }
  });

  router.put('/api/gvg-lineup', async (req, res, next) => {
    try {
      const context = await requireGuildAccessForRoute(req, res, 'view:guild', {
        forbidden: 'Bạn không có quyền chỉnh sửa đội hình Bang Chiến.',
      });
      if (!context || !requireGuildOwner(context.access.role, res)) return;

      const result = await saveGvgLineupForRoute(context.access.guild.id, req.body);
      if (result.status !== 200) {
        res.status(result.status).json(result.body);
        return;
      }
      publishGuildAppStateChangedForRoute({ guildId: context.access.guild.id, reason: 'gvg_lineup_updated' });
      res.json(result.body);
    } catch (err) {
      next(err);
    }
  });

  router.post('/api/gvg-lineup/squads/:squadNumber/clear', async (req, res, next) => {
    try {
      const context = await requireGuildAccessForRoute(req, res, 'view:guild', {
        forbidden: 'Bạn không có quyền chỉnh sửa đội hình Bang Chiến.',
      });
      if (!context || !requireGuildOwner(context.access.role, res)) return;

      const squadNumber = Number.parseInt(req.params.squadNumber, 10);
      const result = await clearGvgLineupSquadForRoute(context.access.guild.id, squadNumber);
      if (result.status !== 200) {
        res.status(result.status).json(result.body);
        return;
      }
      publishGuildAppStateChangedForRoute({ guildId: context.access.guild.id, reason: 'gvg_lineup_updated' });
      res.json(result.body);
    } catch (err) {
      next(err);
    }
  });

  return router;
}
