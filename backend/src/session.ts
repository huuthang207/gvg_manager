import { randomUUID } from 'crypto';

interface Session {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
  userId: string;
  activeGuildId?: string | null;
  authBlockedReason?: string | null;
}

// In-memory session store (resets on server restart)
const sessions = new Map<string, Session>();

export function createSession(data: Omit<Session, never>): string {
  const sessionId = randomUUID();
  sessions.set(sessionId, data);
  return sessionId;
}

export function getSession(sessionId: string): Session | null {
  const session = sessions.get(sessionId);
  if (!session) return null;

  // Check if expired
  if (Date.now() > session.expiresAt) {
    sessions.delete(sessionId);
    return null;
  }

  return session;
}

export function updateSessionActiveGuild(sessionId: string, activeGuildId: string | null): Session | null {
  const session = sessions.get(sessionId);
  if (!session) return null;
  const nextSession: Session = {
    ...session,
    activeGuildId,
  };
  sessions.set(sessionId, nextSession);
  return nextSession;
}

export function deleteSession(sessionId: string): void {
  sessions.delete(sessionId);
}

export function getSessionCookie(sessionId: string): string {
  return `session_id=${sessionId}; HttpOnly; SameSite=Lax; Path=/`;
}

export function getClearSessionCookie(): string {
  return `session_id=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0`;
}
