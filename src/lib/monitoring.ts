import * as Sentry from '@sentry/react-native';
import Constants from 'expo-constants';

type EventMeta = Record<string, string | number | boolean | null | undefined>;

let initialized = false;

function normalizeMeta(meta?: EventMeta): Record<string, unknown> | undefined {
  if (!meta) return undefined;
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(meta)) {
    if (value !== undefined) out[key] = value;
  }
  return Object.keys(out).length > 0 ? out : undefined;
}

export function initMonitoring(): void {
  if (initialized) return;
  const dsn = process.env.EXPO_PUBLIC_SENTRY_DSN;
  if (!dsn || dsn.trim() === '') {
    initialized = true;
    return;
  }

  Sentry.init({
    dsn: dsn.trim(),
    enabled: !__DEV__,
    environment: process.env.EXPO_PUBLIC_APP_ENV ?? 'development',
    release:
      Constants.expoConfig?.version && Constants.expoConfig?.ios?.buildNumber
        ? `${Constants.expoConfig.version}+${Constants.expoConfig.ios.buildNumber}`
        : Constants.expoConfig?.version,
    tracesSampleRate: 0.05,
  });
  initialized = true;
}

export function captureMonitoringError(
  err: unknown,
  context: string,
  meta?: EventMeta
): void {
  if (!initialized) return;
  Sentry.withScope((scope) => {
    scope.setTag('context', context);
    const extras = normalizeMeta(meta);
    if (extras) scope.setExtras(extras);
    Sentry.captureException(err);
  });
}

export function captureMonitoringMessage(message: string, meta?: EventMeta): void {
  if (!initialized) return;
  Sentry.withScope((scope) => {
    const extras = normalizeMeta(meta);
    if (extras) scope.setExtras(extras);
    Sentry.captureMessage(message);
  });
}
