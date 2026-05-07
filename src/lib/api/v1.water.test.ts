/* eslint-disable import/first -- jest.mock must run before importing modules under test */
jest.mock('@/lib/firebase', () => ({
  getFirebaseIdTokenForApi: jest.fn(),
}));

import { getMeWater, patchMeWater, putMeWater } from '@/lib/api/v1';

describe('water API', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    const { getFirebaseIdTokenForApi } = jest.requireMock('@/lib/firebase') as {
      getFirebaseIdTokenForApi: jest.Mock;
    };
    getFirebaseIdTokenForApi.mockResolvedValue('mock-token');
  });

  it('GET /me/water requires date query', async () => {
    const fetchSpy = jest.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      status: 200,
      text: async () =>
        JSON.stringify({
          id: '2026-05-06',
          date: '2026-05-06',
          totalAmount: 0,
          unit: 'ml',
          goalAmount: null,
          goalUnit: null,
        }),
    } as Response);

    const row = await getMeWater({ date: '2026-05-06' });
    expect(row.id).toBe('2026-05-06');
    expect(fetchSpy).toHaveBeenCalledTimes(1);
    const req = fetchSpy.mock.calls[0][0] as Request;
    expect(req.url).toContain('/api/v1/me/water?');
    expect(req.url).toContain('date=2026-05-06');
    expect(req.method).toBe('GET');
  });

  it('PUT /me/water sends JSON body', async () => {
    const fetchSpy = jest.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      status: 200,
      text: async () =>
        JSON.stringify({
          id: '2026-05-06',
          date: '2026-05-06',
          totalAmount: 500,
          unit: 'ml',
          goalAmount: 2000,
          goalUnit: 'ml',
        }),
    } as Response);

    await putMeWater({
      date: '2026-05-06',
      totalAmount: 500,
      unit: 'ml',
      goalAmount: 2000,
      goalUnit: 'ml',
    });

    const req = fetchSpy.mock.calls[0][0] as Request;
    expect(req.method).toBe('PUT');
    const body = JSON.parse(await req.text());
    expect(body).toEqual({
      date: '2026-05-06',
      totalAmount: 500,
      unit: 'ml',
      goalAmount: 2000,
      goalUnit: 'ml',
    });
  });

  it('PATCH /me/water sends deltaAmount only', async () => {
    const fetchSpy = jest.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      status: 200,
      text: async () =>
        JSON.stringify({
          id: '2026-05-06',
          date: '2026-05-06',
          totalAmount: 250,
          unit: 'ml',
          goalAmount: null,
          goalUnit: null,
        }),
    } as Response);

    await patchMeWater({ deltaAmount: 250 });
    const req = fetchSpy.mock.calls[0][0] as Request;
    expect(req.method).toBe('PATCH');
    expect(JSON.parse(await req.text())).toEqual({ deltaAmount: 250 });
  });
});
