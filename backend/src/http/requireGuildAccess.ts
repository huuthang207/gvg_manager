import type { Request, Response } from 'express';
import { requireAuth } from '../auth.js';
import { Permission, requireAccessibleGuild } from '../permissions.js';

type AccessErrorMessages = {
  notFound?: string;
  forbidden: string;
};

export async function requireGuildAccess(
  req: Request,
  res: Response,
  permission: Permission,
  messages: AccessErrorMessages,
) {
  const auth = await requireAuth(req, res);
  if (!auth) return null;

  const access = await requireAccessibleGuild(auth.user.id, permission, auth.session.activeGuildId);
  if (!access) {
    res.status(404).json({ error: messages.notFound ?? 'Chưa có server nào được import.' });
    return null;
  }

  if (access.forbidden) {
    res.status(403).json({ error: messages.forbidden });
    return null;
  }

  return { auth, access };
}
