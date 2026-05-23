import { randomUUID } from 'crypto';
import { prisma } from './db.js';

export interface Session {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
  userId: string;
  activeGuildId?: string | null;
  authBlockedReason?: string | null;
}

function serializeSession(session: {
  accessToken: string;
  refreshToken: string;
  expiresAt: Date;
  userId: string;
  activeGuildId: string | null;
  authBlockedReason: string | null;
}): Session {
  return {
    accessToken: session.accessToken,
    refreshToken: session.refreshToken,
    expiresAt: session.expiresAt.getTime(),
    userId: session.userId,
    activeGuildId: session.activeGuildId,
    authBlockedReason: session.authBlockedReason,
  };
}

export async function createSession(data: Session): Promise<string> {
  const sessionId = randomUUID();
  await prisma.session.create({
    data: {
      id: sessionId,
      accessToken: data.accessToken,
      refreshToken: data.refreshToken,
      expiresAt: new Date(data.expiresAt),
      userId: data.userId,
      activeGuildId: data.activeGuildId ?? null,
      authBlockedReason: data.authBlockedReason ?? null,
    },
  });
  return sessionId;
}

export async function getSession(sessionId: string): Promise<Session | null> {
  const session = await prisma.session.findUnique({ where: { id: sessionId } });
  if (!session) return null;

  if (session.expiresAt.getTime() <= Date.now()) {
    await prisma.session.delete({ where: { id: sessionId } }).catch(() => undefined);
    return null;
  }

  return serializeSession(session);
}

export async function updateSessionActiveGuild(sessionId: string, activeGuildId: string | null): Promise<Session | null> {
  const session = await prisma.session.update({
    where: { id: sessionId },
    data: { activeGuildId },
  }).catch(() => null);

  return session ? serializeSession(session) : null;
}

export async function deleteSession(sessionId: string): Promise<void> {
  await prisma.session.deleteMany({ where: { id: sessionId } });
}

export async function deleteExpiredSessions(): Promise<void> {
  await prisma.session.deleteMany({ where: { expiresAt: { lte: new Date() } } });
}

function getOrigin(value: string | undefined): string | null {
  if (!value) return null;
  try {
    return new URL(value).origin;
  } catch {
    return null;
  }
}

function shouldUseCrossSiteCookie(): boolean {
  const configuredSameSite = process.env.SESSION_COOKIE_SAME_SITE;
  if (configuredSameSite) return configuredSameSite.toLowerCase() === 'none';

  const frontendOrigin = getOrigin(process.env.FRONTEND_URL);
  const redirectOrigin = getOrigin(process.env.DISCORD_REDIRECT_URI);
  return !!frontendOrigin && !!redirectOrigin && frontendOrigin !== redirectOrigin;
}

function getSessionCookieAttributes(): string {
  const crossSiteCookie = shouldUseCrossSiteCookie();
  const sameSite = process.env.SESSION_COOKIE_SAME_SITE || (crossSiteCookie ? 'None' : 'Lax');
  const secureCookie = process.env.SESSION_COOKIE_SECURE === 'true' || sameSite.toLowerCase() === 'none';
  const secure = secureCookie ? '; Secure' : '';
  return `HttpOnly; SameSite=${sameSite}; Path=/${secure}`;
}

export function getSessionCookie(sessionId: string): string {
  return `session_id=${sessionId}; ${getSessionCookieAttributes()}`;
}

export function getClearSessionCookie(): string {
  return `session_id=; ${getSessionCookieAttributes()}; Max-Age=0`;
}
