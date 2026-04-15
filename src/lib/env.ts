/**
 * Public env vars are exposed via EXPO_PUBLIC_* (see `.env.example`).
 */
export function getApiBaseUrl(): string {
  const url = process.env.EXPO_PUBLIC_API_URL;
  if (!url || url.trim() === '') {
    throw new Error(
      'EXPO_PUBLIC_API_URL is not set. Copy .env.example to .env and set your API base URL (no trailing slash).'
    );
  }
  return url.replace(/\/$/, '');
}

function optionalUrl(name: string): string | undefined {
  // We intentionally read a validated dynamic EXPO_PUBLIC_* key by name here.
  // eslint-disable-next-line expo/no-dynamic-env-var
  const raw = process.env[name];
  if (!raw || raw.trim() === '') return undefined;
  try {
    const parsed = new URL(raw.trim());
    if (parsed.protocol !== 'https:') return undefined;
    return parsed.toString();
  } catch {
    return undefined;
  }
}

export function getLegalLinks() {
  return {
    privacyPolicyUrl: optionalUrl('EXPO_PUBLIC_PRIVACY_POLICY_URL'),
    termsOfUseUrl: optionalUrl('EXPO_PUBLIC_TERMS_OF_USE_URL'),
    accountDeletionUrl: optionalUrl('EXPO_PUBLIC_ACCOUNT_DELETION_URL'),
  };
}
