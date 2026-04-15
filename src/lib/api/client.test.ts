import { apiRequest } from '@/lib/api/client';

jest.mock('@/lib/firebase', () => ({
  getFirebaseIdTokenForApi: jest.fn(),
}));

describe('apiRequest', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    process.env.EXPO_PUBLIC_API_URL = 'https://api.example.com';
    const { getFirebaseIdTokenForApi } = jest.requireMock('@/lib/firebase') as {
      getFirebaseIdTokenForApi: jest.Mock;
    };
    getFirebaseIdTokenForApi.mockResolvedValue('token-1');
  });

  afterEach(() => {
    jest.clearAllMocks();
    global.fetch = originalFetch;
  });

  it('retries once with force refresh after 401', async () => {
    const fetchMock = jest
      .fn()
      .mockResolvedValueOnce({
        status: 401,
        ok: false,
        statusText: 'Unauthorized',
        text: async () => '{"error":"Unauthorized"}',
      })
      .mockResolvedValueOnce({
        status: 200,
        ok: true,
        statusText: 'OK',
        text: async () => '{"ok":true}',
      });
    global.fetch = fetchMock as unknown as typeof fetch;

    const result = await apiRequest<{ ok: boolean }>('/entries');

    expect(result.ok).toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('throws ApiError with request URL when response is non-ok', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      status: 422,
      ok: false,
      statusText: 'Unprocessable',
      text: async () => '{"error":"Validation failed"}',
    }) as unknown as typeof fetch;

    await expect(apiRequest('/entries', { method: 'POST', json: { calories: -1 } })).rejects.toMatchObject({
      status: 422,
      requestUrl: 'https://api.example.com/api/v1/entries',
    });
  });
});
