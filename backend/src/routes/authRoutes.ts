import { Router } from 'express';
import { deleteSession, getSessionCookie, getClearSessionCookie } from '../session.js';
import { getAuthStatusBySessionId, handleOAuthCallback } from '../services/authService.js';

export function createAuthRoutes() {
  const router = Router();

  router.get('/api/discord/oauth/authorize', (_req, res) => {
    const clientId = process.env.DISCORD_CLIENT_ID;
    const redirectUri = process.env.DISCORD_REDIRECT_URI || 'http://localhost:3001/api/discord/oauth/callback';

    if (!clientId) {
      res.status(500).json({ error: 'DISCORD_CLIENT_ID not configured. Add it to .env file.' });
      return;
    }

    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: 'identify guilds',
    });

    const authUrl = `https://discord.com/oauth2/authorize?${params.toString()}`;
    console.log('[OAuth] Redirecting to:', authUrl);
    res.redirect(authUrl);
  });

  router.get('/api/discord/oauth/callback', async (req, res) => {
    const { code, error } = req.query;
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';

    if (error || !code) {
      console.log('[OAuth] User denied or error:', error);
      res.redirect(`${frontendUrl}?oauth_error=${error || 'unknown'}`);
      return;
    }

    try {
      const redirectUri = process.env.DISCORD_REDIRECT_URI || 'http://localhost:3001/api/discord/oauth/callback';
      const { sessionId } = await handleOAuthCallback(code as string, redirectUri);

      res.setHeader('Set-Cookie', getSessionCookie(sessionId));
      console.log('[OAuth] Session created, redirecting to frontend');
      res.redirect(`${frontendUrl}?oauth=success`);
    } catch (err: any) {
      console.error('[OAuth] Token exchange failed:', err.message);
      res.redirect(`${frontendUrl}?oauth_error=${encodeURIComponent(err.message)}`);
    }
  });

  router.delete('/api/discord/session', (req, res) => {
    const sessionId = req.cookies?.session_id;
    if (sessionId) {
      deleteSession(sessionId);
    }
    res.setHeader('Set-Cookie', getClearSessionCookie());
    res.json({ success: true });
  });

  router.get('/api/discord/auth/status', async (req, res) => {
    const data = await getAuthStatusBySessionId(req.cookies?.session_id);
    res.json(data);
  });

  return router;
}
