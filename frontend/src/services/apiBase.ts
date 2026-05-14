export const API_BASE = import.meta.env.VITE_DISCORD_API_URL || 'http://localhost:3001';

async function ensureOk(res: Response): Promise<void> {
  if (res.ok) return;
  const err = await res.json().catch(() => ({ error: 'Unknown error' }));
  throw new Error(err.error || `HTTP ${res.status}`);
}

export async function requestJson<T>(input: string, init?: RequestInit): Promise<T> {
  const res = await fetch(input, init);
  await ensureOk(res);
  return res.json() as Promise<T>;
}

export async function requestVoid(input: string, init?: RequestInit): Promise<void> {
  const res = await fetch(input, init);
  await ensureOk(res);
}
