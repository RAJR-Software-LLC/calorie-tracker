/**
 * In-memory conditional-GET store for authenticated API responses.
 * Keyed by uid + method + absolute URL. Cleared on sign-out — never persisted.
 */

export type EtagCacheEntry = {
  etag: string;
  body: unknown;
};

const store = new Map<string, EtagCacheEntry>();

export function etagCacheKey(uid: string, method: string, url: string): string {
  return `${uid}|${method.toUpperCase()}|${url}`;
}

export function getEtagEntry(uid: string, method: string, url: string): EtagCacheEntry | undefined {
  return store.get(etagCacheKey(uid, method, url));
}

export function setEtagEntry(
  uid: string,
  method: string,
  url: string,
  etag: string,
  body: unknown
): void {
  const trimmed = etag.trim();
  if (!trimmed) return;
  store.set(etagCacheKey(uid, method, url), { etag: trimmed, body });
}

/** Drop a single URL entry (e.g. force fresh GET after mutation or photo expiry). */
export function clearEtagEntry(uid: string, method: string, url: string): void {
  store.delete(etagCacheKey(uid, method, url));
}

/**
 * Clear GET /api/v1/me for this uid (exact path only — not /me/entries etc.).
 * Used when profile photo signed URL expires so the next fetch cannot 304-loop.
 */
export function clearMeEtag(uid: string): void {
  for (const key of [...store.keys()]) {
    if (!key.startsWith(`${uid}|GET|`)) continue;
    const urlPart = key.slice(`${uid}|GET|`.length);
    try {
      const { pathname } = new URL(urlPart);
      if (pathname === '/api/v1/me' || pathname === '/api/v1/me/') {
        store.delete(key);
      }
    } catch {
      // ignore malformed keys
    }
  }
}

export function clearEtagCache(): void {
  store.clear();
}

/** Test helper */
export function _etagCacheSizeForTests(): number {
  return store.size;
}
