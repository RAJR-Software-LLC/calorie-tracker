/* eslint-disable import/first -- jest.mock must run before importing modules under test */
jest.mock('@/lib/firebase', () => ({
  getFirebaseIdTokenForApi: jest.fn(),
}));

import {
  getExercisePresets,
  getExercisesByDate,
  getExercisesByRange,
  patchExercise,
  postExerciseBulk,
} from '@/lib/api/v1';

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
      text: async () => JSON.stringify({ version: 1, presets: [] }),
    } as Response);

    const response = await getExercisePresets();
    expect(response.version).toBe(1);
    const req = fetchSpy.mock.calls[0][0] as Request;
    expect(req.url).toBe('https://api.example.com/api/v1/me/exercise/presets');
  });

  it('supports day and range exercise queries', async () => {
    const fetchSpy = jest.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      status: 200,
      text: async () => JSON.stringify([]),
    } as Response);

    await getExercisesByDate('2026-05-08');
    await getExercisesByRange('2026-05-01', '2026-05-08');

    const firstReq = fetchSpy.mock.calls[0][0] as Request;
    const secondReq = fetchSpy.mock.calls[1][0] as Request;
    expect(firstReq.url).toContain('/api/v1/me/exercise?date=2026-05-08');
    expect(secondReq.url).toContain('/api/v1/me/exercise?startDate=2026-05-01&endDate=2026-05-08');
  });

  it('posts bulk exercises and patches allowed fields', async () => {
    const fetchSpy = jest
      .spyOn(global, 'fetch')
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: async () => JSON.stringify({ created: 1, updated: 0, skipped: 0, items: [] }),
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        status: 204,
        text: async () => '',
      } as Response);

    await postExerciseBulk({
      exercises: [{ date: '2026-05-08', name: 'Run', caloriesBurned: 300, presetId: 'running' }],
    });
    await patchExercise('abc123', { name: 'Run 2', caloriesBurned: 330, intensity: 'high' });

    const bulkReq = fetchSpy.mock.calls[0][0] as Request;
    const patchReq = fetchSpy.mock.calls[1][0] as Request;
    expect(bulkReq.method).toBe('POST');
    expect(bulkReq.url).toContain('/api/v1/me/exercise/bulk');
    expect(patchReq.method).toBe('PATCH');
    expect(patchReq.url).toContain('/api/v1/me/exercise/abc123');
  });
});
