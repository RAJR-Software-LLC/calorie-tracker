import {
  _etagCacheSizeForTests,
  clearEtagCache,
  clearEtagEntry,
  clearMeEtag,
  getEtagEntry,
  setEtagEntry,
} from '@/lib/api/etag-cache';

describe('etag-cache', () => {
  beforeEach(() => {
    clearEtagCache();
  });

  it('stores and retrieves entries by uid, method, and url', () => {
    setEtagEntry('u1', 'GET', 'https://api.example.com/api/v1/me', '"v1"', { id: 1 });
    expect(getEtagEntry('u1', 'GET', 'https://api.example.com/api/v1/me')).toEqual({
      etag: '"v1"',
      body: { id: 1 },
    });
    expect(getEtagEntry('u2', 'GET', 'https://api.example.com/api/v1/me')).toBeUndefined();
  });

  it('clearMeEtag removes only exact /me and not nested paths', () => {
    setEtagEntry('u1', 'GET', 'https://api.example.com/api/v1/me', '"a"', { me: true });
    setEtagEntry(
      'u1',
      'GET',
      'https://api.example.com/api/v1/me/entries?date=2026-01-01',
      '"b"',
      []
    );
    clearMeEtag('u1');
    expect(getEtagEntry('u1', 'GET', 'https://api.example.com/api/v1/me')).toBeUndefined();
    expect(
      getEtagEntry('u1', 'GET', 'https://api.example.com/api/v1/me/entries?date=2026-01-01')
    ).toEqual({ etag: '"b"', body: [] });
  });

  it('clearEtagCache empties the store', () => {
    setEtagEntry('u1', 'GET', 'https://api.example.com/api/v1/me', '"a"', {});
    clearEtagEntry('u1', 'GET', 'https://api.example.com/api/v1/me');
    expect(_etagCacheSizeForTests()).toBe(0);
    setEtagEntry('u1', 'GET', 'https://api.example.com/api/v1/me', '"a"', {});
    clearEtagCache();
    expect(_etagCacheSizeForTests()).toBe(0);
  });
});
