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
