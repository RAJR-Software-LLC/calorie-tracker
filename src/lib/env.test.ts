import { getApiBaseUrl, getLegalLinks } from '@/lib/env';

describe('env helpers', () => {
  it('normalizes API base URL by trimming trailing slash', () => {
    process.env.EXPO_PUBLIC_API_URL = 'https://api.example.com/';
    expect(getApiBaseUrl()).toBe('https://api.example.com');
  });

  it('returns only https legal links', () => {
    process.env.EXPO_PUBLIC_PRIVACY_POLICY_URL = 'https://example.com/privacy';
    process.env.EXPO_PUBLIC_TERMS_OF_USE_URL = 'http://example.com/terms';
    process.env.EXPO_PUBLIC_ACCOUNT_DELETION_URL = 'not-a-url';

    expect(getLegalLinks()).toEqual({
      privacyPolicyUrl: 'https://example.com/privacy',
      termsOfUseUrl: undefined,
      accountDeletionUrl: undefined,
    });
  });
});
