import { getApiBaseUrl } from '@/lib/env';
import { getFirebaseIdTokenForApi } from '@/lib/firebase';

import { ApiError } from './errors';

export type RequestOptions = Omit<RequestInit, 'body'> & {
  /** When false, do not attach Authorization (defaults to true). */
  auth?: boolean;
  /** JSON body — serialized with JSON.stringify */
  json?: unknown;
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

/**
 * Low-level fetch to `{EXPO_PUBLIC_API_URL}/api/v1{path}` with optional Bearer token.
 */
export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { auth = true, json, headers: initHeaders, ...rest } = options;
  const url = resolveApiRequestUrl(path);

  async function fetchWithToken(forceRefresh: boolean): Promise<Response> {
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

    const request = new Request(url, {
      // Avoid `no-store` / `no-cache` here: whatwg-fetch (used on some RN targets)
      // appends `&_=timestamp` to GET/HEAD URLs for cache busting, which breaks
      // strict query validation on the API (e.g. GET /me/water?date=…).
      cache: 'reload',
      ...rest,
      headers,
      body: json !== undefined ? JSON.stringify(json) : undefined,
    });
    return fetch(request);
  }

  let res = await fetchWithToken(false);
  if (auth && res.status === 401) {
    res = await fetchWithToken(true);
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
    throw new ApiError(res.status, msg || 'Request failed', parsed, url);
  }

  return parsed as T;
}
