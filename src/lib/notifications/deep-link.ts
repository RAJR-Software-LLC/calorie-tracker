import * as Linking from 'expo-linking';
import type { Router } from 'expo-router';

import { captureMonitoringMessage } from '@/lib/monitoring';

/**
 * Deterministic parser for `app://host` and `app://host/a/b` (matches backend deep links).
 */
function parseManualAppScheme(trimmed: string): string[] | null {
  const m = /^app:\/\/([^/?#]+)(?:\/(.*))?$/i.exec(trimmed);
  if (!m) return null;
  const head = (m[1] ?? '').trim().toLowerCase();
  if (!head) return null;
  const tail = (m[2] ?? '')
    .split('/')
    .map((s) => s.trim())
    .filter(Boolean)
    .map((s) => s.toLowerCase());
  return [head, ...tail];
}

/**
 * Parse `app://...` URIs into route segments for routing tests and debugging.
 */
export function parseAppDeepLinkToSegments(deepLink: string): string[] | null {
  const trimmed = deepLink.trim();
  if (!trimmed) return null;

  const manual = parseManualAppScheme(trimmed);
  if (manual) return manual;

  let parsed: Linking.ParsedURL;
  try {
    parsed = Linking.parse(trimmed);
  } catch {
    return null;
  }

  const scheme = (parsed.scheme ?? '').toLowerCase();
  if (scheme !== 'app') return null;

  const host = (parsed.hostname ?? '').toLowerCase();
  const pathParts = (parsed.path ?? '')
    .replace(/^\//, '')
    .split('/')
    .map((s) => s.trim())
    .filter(Boolean);

  if (host) {
    return [host, ...pathParts];
  }
  return pathParts.length > 0 ? pathParts : [];
}

/**
 * Navigate from push `data.deepLink` (HIPAA-generic UX; sensitive load happens on-screen).
 */
export function routeFromDeepLink(deepLink: string | undefined | null, router: Router): void {
  if (!deepLink || typeof deepLink !== 'string' || deepLink.trim() === '') {
    router.replace('/(tabs)');
    return;
  }

  const segments = parseAppDeepLinkToSegments(deepLink);
  if (segments === null) {
    captureMonitoringMessage('notifications/deeplink_parse_error', {
      deepLink: deepLink.trim(),
    });
    router.replace('/(tabs)');
    return;
  }

  if (segments.length === 0) {
    router.replace('/(tabs)');
    return;
  }

  const [a, b, c] = segments;

  if (a === 'log' || a === 'dashboard') {
    router.replace('/(tabs)');
    return;
  }

  if (a === 'settings') {
    router.replace('/(tabs)/settings');
    return;
  }

  if (a === 'family') {
    if (b && c === 'shared') {
      router.replace({
        pathname: '/(tabs)/family',
        params: { deepLinkFamilyId: b },
      });
    } else if (b) {
      router.replace({
        pathname: '/(tabs)/family',
        params: { deepLinkFamilyId: b },
      });
    } else {
      router.replace('/(tabs)/family');
    }
    return;
  }

  captureMonitoringMessage('notifications/unknown_deeplink', {
    deepLink: deepLink.trim(),
  });
  router.replace('/(tabs)');
}
