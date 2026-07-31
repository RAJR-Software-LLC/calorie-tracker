import { apiRequest } from '@/lib/api/client';
import { clearEtagCache, getEtagEntry, setEtagEntry } from '@/lib/api/etag-cache';

jest.mock('@/lib/firebase', () => ({
  getFirebaseIdTokenForApi: jest.fn(),
  getFirebaseAuth: jest.fn(),
}));

function mockResponse(init: {
  status: number;
  ok?: boolean;
  statusText?: string;
  body?: string;
  headers?: Record<string, string>;
}) {
  const headerMap = new Map(
    Object.entries(init.headers ?? {}).map(([k, v]) => [k.toLowerCase(), v])
  );
  return {
    status: init.status,
    ok: init.ok ?? (init.status >= 200 && init.status < 300),
    statusText: init.statusText ?? '',
    headers: {
      get: (name: string) => headerMap.get(name.toLowerCase()) ?? null,
    },
    text: async () => init.body ?? '',
  };
}

describe('apiRequest conditional GET', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    process.env.EXPO_PUBLIC_API_URL = 'https://api.example.com';
    clearEtagCache();
    const firebase = jest.requireMock('@/lib/firebase') as {
      getFirebaseIdTokenForApi: jest.Mock;
      getFirebaseAuth: jest.Mock;
    };
    firebase.getFirebaseIdTokenForApi.mockResolvedValue('token-1');
    firebase.getFirebaseAuth.mockReturnValue({
      currentUser: { uid: 'user-1' },
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
    global.fetch = originalFetch;
    clearEtagCache();
  });

  it('retries once with force refresh after 401', async () => {
    const fetchMock = jest
      .fn()
      .mockResolvedValueOnce(
        mockResponse({
          status: 401,
          ok: false,
          statusText: 'Unauthorized',
          body: '{"error":"Unauthorized"}',
        })
      )
      .mockResolvedValueOnce(
        mockResponse({
          status: 200,
          body: '{"ok":true}',
          headers: { ETag: '"e1"' },
        })
      );
    global.fetch = fetchMock as unknown as typeof fetch;

    const result = await apiRequest<{ ok: boolean }>('/entries');

    expect(result.ok).toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    const firstReq = fetchMock.mock.calls[0][0] as Request;
    expect(firstReq.cache).toBe('reload');
  });

  it('throws ApiError with request URL when response is non-ok', async () => {
    global.fetch = jest.fn().mockResolvedValue(
      mockResponse({
        status: 422,
        ok: false,
        statusText: 'Unprocessable',
        body: '{"error":"Validation failed"}',
      })
    ) as unknown as typeof fetch;

    await expect(
      apiRequest('/entries', { method: 'POST', json: { calories: -1 } })
    ).rejects.toMatchObject({
      status: 422,
      requestUrl: 'https://api.example.com/api/v1/entries',
    });
  });

  it('stores ETag on 200 and sends If-None-Match on the next GET', async () => {
    const fetchMock = jest
      .fn()
      .mockResolvedValueOnce(
        mockResponse({
          status: 200,
          body: '{"name":"Ada"}',
          headers: { ETag: '"me-1"' },
        })
      )
      .mockResolvedValueOnce(
        mockResponse({
          status: 304,
          ok: false,
          statusText: 'Not Modified',
          body: '',
          headers: { ETag: '"me-1"' },
        })
      );
    global.fetch = fetchMock as unknown as typeof fetch;

    const first = await apiRequest<{ name: string }>('/me');
    expect(first).toEqual({ name: 'Ada' });
    expect(getEtagEntry('user-1', 'GET', 'https://api.example.com/api/v1/me')?.etag).toBe('"me-1"');

    const second = await apiRequest<{ name: string }>('/me');
    expect(second).toEqual({ name: 'Ada' });
    expect(fetchMock).toHaveBeenCalledTimes(2);
    const secondReq = fetchMock.mock.calls[1][0] as Request;
    expect(secondReq.headers.get('If-None-Match')).toBe('"me-1"');
  });

  it('does not JSON-parse a 304 body and returns the cached payload', async () => {
    setEtagEntry('user-1', 'GET', 'https://api.example.com/api/v1/me', '"cached"', {
      name: 'Cached',
    });
    const fetchMock = jest.fn().mockResolvedValue(
      mockResponse({
        status: 304,
        ok: false,
        body: 'NOT-JSON',
        headers: { ETag: '"cached"' },
      })
    );
    global.fetch = fetchMock as unknown as typeof fetch;

    const result = await apiRequest<{ name: string }>('/me');
    expect(result).toEqual({ name: 'Cached' });
  });

  it('skips conditional headers when conditional: false', async () => {
    setEtagEntry('user-1', 'GET', 'https://api.example.com/api/v1/me', '"x"', { a: 1 });
    const fetchMock = jest.fn().mockResolvedValue(
      mockResponse({
        status: 200,
        body: '{"a":2}',
        headers: { ETag: '"y"' },
      })
    );
    global.fetch = fetchMock as unknown as typeof fetch;

    await apiRequest('/me', { conditional: false });
    const req = fetchMock.mock.calls[0][0] as Request;
    expect(req.headers.get('If-None-Match')).toBeNull();
  });

  it('does not treat 401 as a cache hit', async () => {
    setEtagEntry('user-1', 'GET', 'https://api.example.com/api/v1/me', '"x"', { a: 1 });
    const fetchMock = jest
      .fn()
      .mockResolvedValueOnce(
        mockResponse({
          status: 401,
          ok: false,
          statusText: 'Unauthorized',
          body: '{"error":"Unauthorized"}',
        })
      )
      .mockResolvedValueOnce(
        mockResponse({
          status: 401,
          ok: false,
          statusText: 'Unauthorized',
          body: '{"error":"Unauthorized"}',
        })
      );
    global.fetch = fetchMock as unknown as typeof fetch;

    await expect(apiRequest('/me')).rejects.toMatchObject({ status: 401 });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
