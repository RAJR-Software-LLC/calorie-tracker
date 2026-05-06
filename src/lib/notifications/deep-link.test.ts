import { parseAppDeepLinkToSegments, routeFromDeepLink } from '@/lib/notifications/deep-link';

describe('parseAppDeepLinkToSegments', () => {
  it('parses app://log', () => {
    expect(parseAppDeepLinkToSegments('app://log')).toEqual(['log']);
  });

  it('parses app://family and family with id', () => {
    expect(parseAppDeepLinkToSegments('app://family')).toEqual(['family']);
    expect(parseAppDeepLinkToSegments('app://family/fam1')).toEqual(['family', 'fam1']);
    expect(parseAppDeepLinkToSegments('app://family/fam1/shared')).toEqual(['family', 'fam1', 'shared']);
  });

  it('returns null for wrong scheme', () => {
    expect(parseAppDeepLinkToSegments('https://example.com')).toBeNull();
  });
});

describe('routeFromDeepLink', () => {
  const router = {
    replace: jest.fn(),
    push: jest.fn(),
    back: jest.fn(),
    canGoBack: jest.fn(() => true),
    setParams: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('routes known paths', () => {
    routeFromDeepLink('app://settings', router as never);
    expect(router.replace).toHaveBeenCalledWith('/(tabs)/settings');

    routeFromDeepLink('app://dashboard', router as never);
    expect(router.replace).toHaveBeenCalledWith('/(tabs)');
  });

  it('falls back to tabs for empty', () => {
    routeFromDeepLink('', router as never);
    expect(router.replace).toHaveBeenCalledWith('/(tabs)');
  });
});
