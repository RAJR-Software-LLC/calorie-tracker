import { QueryClient } from '@tanstack/react-query';

import { clearEtagCache, getEtagEntry, setEtagEntry } from '@/lib/api/etag-cache';
import { invalidateMe, queryKeys, updateMeCache } from '@/lib/queries';

jest.mock('@/lib/api', () => ({
  getMe: jest.fn(),
}));

describe('me cache + etag invalidation', () => {
  beforeEach(() => {
    clearEtagCache();
  });

  it('clearMeEtag via invalidateMe so photo refresh cannot 304-loop', async () => {
    setEtagEntry('u1', 'GET', 'https://api.example.com/api/v1/me', '"old"', {
      profilePhoto: { downloadUrl: 'https://expired' },
    });
    const client = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    client.setQueryData(queryKeys.me('u1'), { uid: 'u1' });

    await invalidateMe(client, 'u1');

    expect(getEtagEntry('u1', 'GET', 'https://api.example.com/api/v1/me')).toBeUndefined();
    client.clear();
  });

  it('updateMeCache clears me ETag after PATCH body apply', () => {
    setEtagEntry('u1', 'GET', 'https://api.example.com/api/v1/me', '"old"', { a: 1 });
    const client = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    updateMeCache(client, 'u1', { uid: 'u1' } as never);
    expect(getEtagEntry('u1', 'GET', 'https://api.example.com/api/v1/me')).toBeUndefined();
    expect(client.getQueryData(queryKeys.me('u1'))).toEqual({ uid: 'u1' });
    client.clear();
  });
});
