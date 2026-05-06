/* eslint-disable import/first -- jest.mock must run before importing modules under test */
jest.mock('@/lib/firebase', () => ({
  getFirebaseIdTokenForApi: jest.fn(),
}));

import { postPushToken, deletePushToken } from '@/lib/api/v1';

describe('push token API', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    const { getFirebaseIdTokenForApi } = jest.requireMock('@/lib/firebase') as {
      getFirebaseIdTokenForApi: jest.Mock;
    };
    getFirebaseIdTokenForApi.mockResolvedValue('mock-token');
  });

  it('POST /me/push-tokens sends JSON body', async () => {
    const fetchSpy = jest.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      status: 200,
      text: async () => JSON.stringify({ id: 'tok-doc-1' }),
    } as Response);

    const res = await postPushToken({
      token: 'ExponentPushToken[abc]',
      platform: 'ios',
      appVersion: '1.0.0',
    });

    expect(res.id).toBe('tok-doc-1');
    expect(fetchSpy).toHaveBeenCalledTimes(1);
    const [url, init] = fetchSpy.mock.calls[0] as [string, RequestInit];
    expect(url).toContain('/api/v1/me/push-tokens');
    expect(init.method).toBe('POST');
    expect(init.headers).toBeInstanceOf(Headers);
    expect((init.headers as Headers).get('Authorization')).toBe('Bearer mock-token');
    expect(JSON.parse(String(init.body))).toMatchObject({
      token: 'ExponentPushToken[abc]',
      platform: 'ios',
      appVersion: '1.0.0',
    });
  });

  it('DELETE /me/push-tokens/:id returns undefined on 204', async () => {
    const fetchSpy = jest.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      status: 204,
      text: async () => '',
    } as Response);

    await expect(deletePushToken('doc-99')).resolves.toBeUndefined();
    expect(fetchSpy).toHaveBeenCalledTimes(1);
    const url = fetchSpy.mock.calls[0][0] as string;
    expect(url).toContain('/api/v1/me/push-tokens/doc-99');
    expect((fetchSpy.mock.calls[0][1] as RequestInit).method).toBe('DELETE');
  });
});
