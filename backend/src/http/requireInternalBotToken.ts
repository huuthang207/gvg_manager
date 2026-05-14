import { Request, Response } from 'express';

export function requireInternalBotToken(req: Request, res: Response) {
  const token = process.env.BOT_INTERNAL_TOKEN;
  if (!token) {
    res.status(500).json({ error: 'BOT_INTERNAL_TOKEN not configured' });
    return false;
  }

  const authHeader = req.headers.authorization;
  if (authHeader !== `Bearer ${token}`) {
    res.status(401).json({ error: 'Unauthorized' });
    return false;
  }

  return true;
}
