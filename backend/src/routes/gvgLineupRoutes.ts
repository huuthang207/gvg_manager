import { Router } from 'express';
import { requireGuildAccess } from '../http/requireGuildAccess.js';
import {
  clearGvgLineupSquadById,
  createGvgLineupDivision,
  createGvgLineupSquad,
  deleteGvgLineupDivisionResource,
  deleteGvgLineupSquad,
  getGvgLineup,
  moveGvgLineupSquad,
  reorderGvgLineupDivisions,
  reorderGvgLineupSquads,
  updateGvgLineupDivisionNote,
  updateGvgLineupSquadName,
  updateGvgLineupSquadSlots,
} from '../services/gvgLineupService.js';
import { publishGuildAppStateChanged } from '../services/realtimeGateway.js';

function requireGuildOwner(role: string, res: { status: (code: number) => { json: (body: unknown) => void } }) {
  if (role === 'owner') return true;
  res.status(403).json({ error: 'Chỉ bang chủ có quyền chỉnh sửa đội hình Bang Chiến.' });
  return false;
}

export type GvgLineupRouteDependencies = {
  requireGuildAccess: typeof requireGuildAccess;
  getGvgLineup: typeof getGvgLineup;
  createGvgLineupDivision: typeof createGvgLineupDivision;
  createGvgLineupSquad: typeof createGvgLineupSquad;
  deleteGvgLineupDivisionResource: typeof deleteGvgLineupDivisionResource;
  deleteGvgLineupSquad: typeof deleteGvgLineupSquad;
  moveGvgLineupSquad: typeof moveGvgLineupSquad;
  reorderGvgLineupDivisions: typeof reorderGvgLineupDivisions;
  reorderGvgLineupSquads: typeof reorderGvgLineupSquads;
  updateGvgLineupSquadSlots: typeof updateGvgLineupSquadSlots;
  clearGvgLineupSquadById: typeof clearGvgLineupSquadById;
  updateGvgLineupDivisionNote: typeof updateGvgLineupDivisionNote;
  updateGvgLineupSquadName: typeof updateGvgLineupSquadName;
  publishGuildAppStateChanged: typeof publishGuildAppStateChanged;
};

export function createGvgLineupRoutes(dependencies: Partial<GvgLineupRouteDependencies> = {}) {
  const services = {
    requireGuildAccess: dependencies.requireGuildAccess ?? requireGuildAccess,
    getGvgLineup: dependencies.getGvgLineup ?? getGvgLineup,
    createGvgLineupDivision: dependencies.createGvgLineupDivision ?? createGvgLineupDivision,
    createGvgLineupSquad: dependencies.createGvgLineupSquad ?? createGvgLineupSquad,
    deleteGvgLineupDivisionResource: dependencies.deleteGvgLineupDivisionResource ?? deleteGvgLineupDivisionResource,
    deleteGvgLineupSquad: dependencies.deleteGvgLineupSquad ?? deleteGvgLineupSquad,
    moveGvgLineupSquad: dependencies.moveGvgLineupSquad ?? moveGvgLineupSquad,
    reorderGvgLineupDivisions: dependencies.reorderGvgLineupDivisions ?? reorderGvgLineupDivisions,
    reorderGvgLineupSquads: dependencies.reorderGvgLineupSquads ?? reorderGvgLineupSquads,
    updateGvgLineupSquadSlots: dependencies.updateGvgLineupSquadSlots ?? updateGvgLineupSquadSlots,
    clearGvgLineupSquadById: dependencies.clearGvgLineupSquadById ?? clearGvgLineupSquadById,
    updateGvgLineupDivisionNote: dependencies.updateGvgLineupDivisionNote ?? updateGvgLineupDivisionNote,
    updateGvgLineupSquadName: dependencies.updateGvgLineupSquadName ?? updateGvgLineupSquadName,
    publish: dependencies.publishGuildAppStateChanged ?? publishGuildAppStateChanged,
  };
  const router = Router();

  const ownerMutation = (handler: (guildId: string, req: any) => Promise<{ status: number; body: unknown }>, status = 200) => async (req: any, res: any, next: any) => {
    try {
      const context = await services.requireGuildAccess(req, res, 'view:guild', { forbidden: 'Bạn không có quyền chỉnh sửa đội hình Bang Chiến.' });
      if (!context || !requireGuildOwner(context.access.role, res)) return;
      const result = await handler(context.access.guild.id, req);
      if (result.status < 200 || result.status >= 300) return res.status(result.status).json(result.body);
      services.publish({ guildId: context.access.guild.id, reason: 'gvg_lineup_updated' });
      res.status(status).json(result.body);
    } catch (error) { next(error); }
  };

  router.get('/api/gvg-lineup', async (req, res, next) => {
    try {
      const context = await services.requireGuildAccess(req, res, 'view:guild', { forbidden: 'Bạn không có quyền xem đội hình Bang Chiến.' });
      if (context) res.json(await services.getGvgLineup(context.access.guild.id));
    } catch (error) { next(error); }
  });

  router.post('/api/gvg-lineup/divisions', ownerMutation(guildId => services.createGvgLineupDivision(guildId), 201));
  router.patch('/api/gvg-lineup/divisions/reorder', ownerMutation((guildId, req) => services.reorderGvgLineupDivisions(guildId, req.body?.divisionIds)));
  router.patch('/api/gvg-lineup/divisions/:divisionId/note', ownerMutation((guildId, req) => services.updateGvgLineupDivisionNote(guildId, req.params.divisionId, req.body?.note)));
  router.delete('/api/gvg-lineup/divisions/:divisionId', ownerMutation((guildId, req) => services.deleteGvgLineupDivisionResource(guildId, req.params.divisionId)));
  router.post('/api/gvg-lineup/divisions/:divisionId/squads', ownerMutation((guildId, req) => services.createGvgLineupSquad(guildId, req.params.divisionId), 201));
  router.patch('/api/gvg-lineup/divisions/:divisionId/squads/reorder', ownerMutation((guildId, req) => services.reorderGvgLineupSquads(guildId, req.params.divisionId, req.body?.squadIds)));
  router.delete('/api/gvg-lineup/squads/:squadId', ownerMutation((guildId, req) => services.deleteGvgLineupSquad(guildId, req.params.squadId)));
  router.patch('/api/gvg-lineup/squads/:squadId/move', ownerMutation((guildId, req) => services.moveGvgLineupSquad(guildId, req.params.squadId, req.body?.divisionId)));
  router.put('/api/gvg-lineup/squads/:squadId/slots', ownerMutation((guildId, req) => services.updateGvgLineupSquadSlots(guildId, req.params.squadId, req.body?.memberIds)));
  router.post('/api/gvg-lineup/squads/:squadId/clear', ownerMutation((guildId, req) => services.clearGvgLineupSquadById(guildId, req.params.squadId)));
  router.patch('/api/gvg-lineup/squads/:squadNumber/name', ownerMutation((guildId, req) => services.updateGvgLineupSquadName(guildId, Number.parseInt(req.params.squadNumber, 10), req.body?.name)));

  return router;
}
