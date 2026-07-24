import { Router } from 'express';

export function createHealthRoutes() {
  const router = Router();

  router.get('/', (_req, res) => {
    res.json({ service: 'gvg-manager-backend', health: '/api/health' });
  });

  router.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  return router;
}
