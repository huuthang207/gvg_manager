import { Request, Response } from 'express';
import { getSession } from './session.js';
import { prisma } from './db.js';

export async function requireAuth(req: Request, res: Response) {
  const sessionId = req.cookies?.session_id;

  if (!sessionId) {
    res.status(401).json({ error: 'Not authenticated. Please login first.' });
    return null;
  }

  const session = await getSession(sessionId);
  if (!session) {
    res.status(401).json({ error: 'Session expired. Please login again.' });
    return null;
  }

  const user = await prisma.user.findUnique({ where: { id: session.userId } });
  if (!user) {
    res.status(401).json({ error: 'User not found. Please login again.' });
    return null;
  }

  return { session, user, sessionId };
}
