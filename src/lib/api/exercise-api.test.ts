/* eslint-disable import/first -- jest.mock must run before importing modules under test */
jest.mock('@/lib/firebase', () => ({
  getFirebaseIdTokenForApi: jest.fn(),
}));

import {
  getExercisePresets,
  getExerciseSyncState,
  getExercisesByDate,
  getExercisesByRange,
  getExercisesUpdatedSince,
  patchExercise,
  postExerciseBulk,
  putExerciseSyncState,
} from '@/lib/api/v1';
import { ApiError, parseRetryAfterHeader } from '@/lib/api/errors';
import { apiRequest } from '@/lib/api/client';

describe('exercise API', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    process.env.EXPO_PUBLIC_API_URL = 'https://api.example.com';
    const { getFirebaseIdTokenForApi } = jest.requireMock('@/lib/firebase') as {
      getFirebaseIdTokenForApi: jest.Mock;
    };
    getFirebaseIdTokenForApi.mockResolvedValue('mock-token');
  });

  it('fetches presets from /me/exercise/presets', async () => {
    const fetchSpy = jest.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      status: 200,
      headers: new Headers(),
      text: async () => JSON.stringify({ version: 1, presets: [] }),
    } as Response);

    const response = await getExercisePresets();
    expect(response.version).toBe(1);
    const req = fetchSpy.mock.calls[0][0] as Request;
    expect(req.url).toBe('https://api.example.com/api/v1/me/exercise/presets');
  });

  it('supports day, range, and updatedSince exercise queries', async () => {
    const fetchSpy = jest.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      status: 200,
      headers: new Headers(),
      text: async () => JSON.stringify([]),
    } as Response);

    await getExercisesByDate('2026-05-08');
    await getExercisesByRange('2026-05-01', '2026-05-08');
    await getExercisesUpdatedSince('2026-05-08T00:00:00.000Z');

    const firstReq = fetchSpy.mock.calls[0][0] as Request;
    const secondReq = fetchSpy.mock.calls[1][0] as Request;
    const thirdReq = fetchSpy.mock.calls[2][0] as Request;
    expect(firstReq.url).toContain('/api/v1/me/exercise?date=2026-05-08');
    expect(secondReq.url).toContain('/api/v1/me/exercise?startDate=2026-05-01&endDate=2026-05-08');
    expect(thirdReq.url).toContain(
      `/api/v1/me/exercise?updatedSince=${encodeURIComponent('2026-05-08T00:00:00.000Z')}`
    );
  });

  it('gets and puts exercise sync-state', async () => {
    const fetchSpy = jest
      .spyOn(global, 'fetch')
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers(),
        text: async () =>
          JSON.stringify({
            lastSuccessfulSyncAt: null,
            lastAttemptAt: null,
            lastError: null,
            platforms: {},
          }),
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        status: 204,
        headers: new Headers(),
        text: async () => '',
      } as Response);

    const state = await getExerciseSyncState();
    expect(state.platforms).toEqual({});
    await putExerciseSyncState({ lastAttemptAt: '2026-05-08T12:00:00.000Z' });

    expect((fetchSpy.mock.calls[0][0] as Request).url).toContain('/me/exercise/sync-state');
    expect((fetchSpy.mock.calls[1][0] as Request).method).toBe('PUT');
  });

  it('posts bulk exercises and patches allowed fields', async () => {
    const fetchSpy = jest
      .spyOn(global, 'fetch')
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers(),
        text: async () => JSON.stringify({ created: 1, updated: 0, skipped: 0, items: [] }),
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        status: 204,
        headers: new Headers(),
        text: async () => '',
      } as Response);

    await postExerciseBulk({
      exercises: [{ date: '2026-05-08', name: 'Run', caloriesBurned: 300, presetId: 'running' }],
    });
    await patchExercise('abc123', {
      name: 'Run 2',
      caloriesBurned: 330,
      intensity: 'high',
      durationMinutes: 40,
      distanceMeters: 5000,
    });

    const bulkReq = fetchSpy.mock.calls[0][0] as Request;
    const patchReq = fetchSpy.mock.calls[1][0] as Request;
    expect(bulkReq.method).toBe('POST');
    expect(bulkReq.url).toContain('/api/v1/me/exercise/bulk');
    expect(patchReq.method).toBe('PATCH');
    expect(patchReq.url).toContain('/api/v1/me/exercise/abc123');
  });

  it('surfaces Retry-After on ApiError', async () => {
    jest.spyOn(global, 'fetch').mockResolvedValue({
      ok: false,
      status: 429,
      statusText: 'Too Many Requests',
      headers: new Headers({ 'Retry-After': '12' }),
      text: async () => JSON.stringify({ error: 'Rate limited' }),
    } as Response);

    await expect(
      apiRequest('/me/exercise/bulk', { method: 'POST', json: { exercises: [] } })
    ).rejects.toMatchObject({
      status: 429,
      retryAfterSeconds: 12,
    } satisfies Partial<ApiError>);
  });
});

describe('parseRetryAfterHeader', () => {
  it('parses delay-seconds and ignores invalid values', () => {
    expect(parseRetryAfterHeader('5')).toBe(5);
    expect(parseRetryAfterHeader('0')).toBe(0);
    expect(parseRetryAfterHeader(null)).toBeUndefined();
    expect(parseRetryAfterHeader('Wed, 21 Oct 2015 07:28:00 GMT')).toBeUndefined();
  });
});
