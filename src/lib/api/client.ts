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
 * Low-level fetch to `{EXPO_PUBLIC_API_URL}/api/v1{path}` with optional Bearer token.
 */
export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { auth = true, json, headers: initHeaders, ...rest } = options;
  const base = getApiBaseUrl();
  const url = `${base}/api/v1${path.startsWith('/') ? path : `/${path}`}`;

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

    return fetch(url, {
      ...rest,
      headers,
      body: json !== undefined ? JSON.stringify(json) : undefined,
    });
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
