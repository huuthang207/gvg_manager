import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';
import { createServer } from 'http';
import { WebSocketServer } from 'ws';
import { startDiscordBot } from './bot.js';
import { createHealthRoutes } from './routes/healthRoutes.js';
import { createAuthRoutes } from './routes/authRoutes.js';
import { createGuildRoutes } from './routes/guildRoutes.js';
import { createMemberRoutes } from './routes/memberRoutes.js';
import { createLineupRoutes } from './routes/lineupRoutes.js';
import { createSettingsRoutes } from './routes/settingsRoutes.js';
import { createAttendanceRoutes } from './routes/attendanceRoutes.js';
import { createGvgParticipationRoutes } from './routes/gvgParticipationRoutes.js';
import { syncAllPersistedGuilds } from './services/syncService.js';
import { attachRealtimeGateway } from './services/realtimeGateway.js';
import { deleteExpiredSessions } from './session.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;
const corsOrigins = (process.env.CORS_ORIGINS || process.env.FRONTEND_URL || 'http://localhost:3000,http://127.0.0.1:3000')
  .split(',')
  .map(origin => origin.trim())
  .filter(Boolean);

app.use(cors({
  origin: corsOrigins,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
  credentials: true,
}));

app.use(cookieParser());
app.use(express.json());

app.use(createHealthRoutes());
app.use(createAuthRoutes());
app.use(createGuildRoutes());
app.use(createMemberRoutes());
app.use(createLineupRoutes());
app.use(createSettingsRoutes());
app.use(createAttendanceRoutes());
app.use(createGvgParticipationRoutes());

function errorHandler(err: Error, _req: Request, res: Response, _next: NextFunction) {
  console.error('[Discord API Error]', err.message);
  res.status(500).json({ error: err.message });
}

app.use(errorHandler);

const server = createServer(app);
const wss = new WebSocketServer({ server, path: '/ws' });
attachRealtimeGateway(wss);

server.listen(PORT, () => {
  console.log(`[GvG Backend] Server listening on port ${PORT}`);
  console.log('[GvG Backend] Health endpoint available at /api/health');
  console.log('[GvG Backend] WebSocket endpoint available at /ws');
  console.log(`[GvG Backend] Bot token: ${process.env.DISCORD_BOT_TOKEN ? '✓ configured' : '✗ NOT SET'}`);
  console.log(`[GvG Backend] OAuth2 Client ID: ${process.env.DISCORD_CLIENT_ID ? '✓ configured' : '✗ NOT SET'}`);

  startDiscordBot().catch(err => {
    console.error('[Discord Bot] Failed to start:', err.message);
  });

  const fallbackIntervalMs = Number(process.env.DISCORD_SYNC_FALLBACK_INTERVAL_MS ?? 300000);
  console.log(`[Discord Sync] Fallback scheduler enabled: every ${fallbackIntervalMs}ms`);

  void deleteExpiredSessions().catch(err => {
    console.error('[Session] Initial cleanup failed:', err?.message || err);
  });

  setInterval(() => {
    void deleteExpiredSessions().catch(err => {
      console.error('[Session] Cleanup failed:', err?.message || err);
    });
  }, 60 * 60 * 1000);

  void syncAllPersistedGuilds().catch(err => {
    console.error('[Discord Sync] Initial fallback sync failed:', err?.message || err);
  });

  setInterval(() => {
    void syncAllPersistedGuilds().catch(err => {
      console.error('[Discord Sync] Fallback sync failed:', err?.message || err);
    });
  }, Math.max(60000, fallbackIntervalMs));
});
