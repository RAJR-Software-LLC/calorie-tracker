import { getApiBaseUrl } from '@/lib/env';
import { getFirebaseAuth, getFirebaseIdTokenForApi } from '@/lib/firebase';

import { clearEtagEntry, getEtagEntry, setEtagEntry } from './etag-cache';
import { ApiError, parseRetryAfterHeader } from './errors';

export type RequestOptions = Omit<RequestInit, 'body'> & {
  /** When false, do not attach Authorization (defaults to true). */
  auth?: boolean;
  /** JSON body — serialized with JSON.stringify */
  json?: unknown;
  /**
   * When true (default for authenticated GET), send If-None-Match and honor 304.
   * Set false for export, account delete, upload URL sessions, push-token, etc.
   */
  conditional?: boolean;
};

async function parseJsonSafe(text: string): Promise<unknown> {
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return text;
  }
}

/**
 * Resolve `{EXPO_PUBLIC_API_URL}/api/v1/{path}` with validation so `path` cannot redirect
 * fetch to another origin (mitigates SSRF / "user-controlled URL" findings on `fetch(url)`).
 */
function resolveApiRequestUrl(path: string): string {
  const baseHref = getApiBaseUrl();
  let originUrl: URL;
  try {
    originUrl = new URL(baseHref);
  } catch {
    throw new Error('EXPO_PUBLIC_API_URL is not a valid URL');
  }
  if (originUrl.protocol !== 'http:' && originUrl.protocol !== 'https:') {
    throw new Error('EXPO_PUBLIC_API_URL must use http or https');
  }

  const apiRoot = new URL('/api/v1/', originUrl);
  const relative = path.startsWith('/') ? path.slice(1) : path;
  if (
    relative === '' ||
    relative.startsWith('//') ||
    relative.includes('..') ||
    /^[a-zA-Z][a-zA-Z\d+.-]*:/.test(relative)
  ) {
    throw new Error(`Invalid API path: ${path}`);
  }

  const resolved = new URL(relative, apiRoot);
  if (resolved.origin !== originUrl.origin) {
    throw new Error('Resolved API URL left configured origin');
  }
  return resolved.href;
}

function resolveRequestMethod(options: RequestOptions): string {
  return (options.method ?? 'GET').toUpperCase();
}

function shouldUseConditional(options: RequestOptions, method: string, auth: boolean): boolean {
  if (options.conditional === false) return false;
  if (options.conditional === true) return auth && method === 'GET';
  return auth && method === 'GET' && options.json === undefined;
}

function currentUid(): string | null {
  try {
    if (typeof getFirebaseAuth !== 'function') return null;
    const auth = getFirebaseAuth();
    return auth?.currentUser?.uid ?? null;
  } catch {
    return null;
  }
}

/**
 * Low-level fetch to `{EXPO_PUBLIC_API_URL}/api/v1{path}` with optional Bearer token.
 * Authenticated GETs send If-None-Match and treat 304 as success with the prior body.
 */
export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { auth = true, json, headers: initHeaders, conditional: _conditional, ...rest } = options;
  const url = resolveApiRequestUrl(path);
  const method = resolveRequestMethod(options);
  const useConditional = shouldUseConditional(options, method, auth);
  const uid = currentUid();

  async function fetchWithToken(
    forceRefresh: boolean,
    omitIfNoneMatch: boolean
  ): Promise<Response> {
    const headers = new Headers(initHeaders);
    if (!headers.has('Content-Type') && json !== undefined) {
      headers.set('Content-Type', 'application/json');
    }

    if (auth) {
      const token = await getFirebaseIdTokenForApi(
        forceRefresh ? { forceRefresh: true } : undefined
      );
      if (!token) {
        throw new ApiError(
          401,
          'Not authenticated: no Firebase ID token or EXPO_PUBLIC_MOCK_ID_TOKEN',
          undefined,
          url
        );
      }
      headers.set('Authorization', `Bearer ${token}`);
    }

    if (useConditional && uid && !omitIfNoneMatch && !headers.has('If-None-Match')) {
      const cached = getEtagEntry(uid, method, url);
      if (cached?.etag) {
        headers.set('If-None-Match', cached.etag);
      }
    }

    const request = new Request(url, {
      // Avoid `no-store` / `no-cache` here: whatwg-fetch (used on some RN targets)
      // appends `&_=timestamp` to GET/HEAD URLs for cache busting, which breaks
      // strict query validation on the API (e.g. GET /me/water?date=…).
      cache: 'reload',
      ...rest,
      method,
      headers,
      body: json !== undefined ? JSON.stringify(json) : undefined,
    });
    return fetch(request);
  }

  async function execute(omitIfNoneMatch: boolean): Promise<T> {
    let res = await fetchWithToken(false, omitIfNoneMatch);
    if (auth && res.status === 401) {
      res = await fetchWithToken(true, omitIfNoneMatch);
    }

    // 304 Not Modified — never parse body; return prior payload.
    if (res.status === 304) {
      if (uid) {
        const cached = getEtagEntry(uid, method, url);
        if (cached) {
          return cached.body as T;
        }
      }
      // Edge case: server returned 304 but we have no body — retry once without validators.
      if (!omitIfNoneMatch && useConditional) {
        if (uid) clearEtagEntry(uid, method, url);
        return execute(true);
      }
      throw new ApiError(304, 'Not Modified with empty cache', undefined, url);
    }

    const text = await res.text();
    const parsed = text ? await parseJsonSafe(text) : undefined;

    if (res.status === 204 || res.status === 205) {
      return undefined as T;
    }

    if (!res.ok) {
      const msg =
        typeof parsed === 'object' && parsed !== null && 'error' in parsed
          ? String((parsed as { error?: unknown }).error)
          : res.statusText;
      const retryAfterSeconds = parseRetryAfterHeader(res.headers.get('Retry-After'));
      throw new ApiError(res.status, msg || 'Request failed', parsed, url, retryAfterSeconds);
    }

    if (useConditional && uid) {
      const etag = res.headers.get('ETag');
      if (etag) {
        setEtagEntry(uid, method, url, etag, parsed);
      }
    }

    return parsed as T;
  }

  return execute(false);
}
