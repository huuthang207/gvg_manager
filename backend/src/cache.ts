interface CacheEntry<T> {
  data: T;
  expiresAt: number;
}

const cache = new Map<string, CacheEntry<unknown>>();

const DEFAULT_TTL = 5 * 60 * 1000; // 5 minutes

export function getCache<T>(key: string): T | null {
  const entry = cache.get(key);
  if (!entry) return null;

  if (Date.now() > entry.expiresAt) {
    cache.delete(key);
    return null;
  }

  return entry.data as T;
}

export function setCache<T>(key: string, data: T, ttl = DEFAULT_TTL): void {
  cache.set(key, {
    data,
    expiresAt: Date.now() + ttl,
  });
}

export function clearCache(key?: string): void {
  if (key) {
    cache.delete(key);
  } else {
    cache.clear();
  }
}

export function getCacheStats(): { size: number; keys: string[] } {
  const keys: string[] = [];
  for (const [key, entry] of cache.entries()) {
    if (Date.now() <= entry.expiresAt) {
      keys.push(key);
    } else {
      cache.delete(key);
    }
  }
  return { size: cache.size, keys };
}
