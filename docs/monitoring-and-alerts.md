# Monitoring and Release Health Alerts

## Monitoring Stack

- Error and crash telemetry: Sentry (`@sentry/react-native`).
- Initialization: `initMonitoring()` in app root layout.
- Error capture: routed through `logAppError()` and forwarded to monitoring.

## Required Environment Variables

- `EXPO_PUBLIC_SENTRY_DSN`
- `EXPO_PUBLIC_APP_ENV` (`development`, `preview`, `production`)

## Release Tags

- Release value is derived from Expo config version and iOS build number when available.
- Environment is sourced from `EXPO_PUBLIC_APP_ENV`.

## Alert Thresholds (Initial)

- Crash-free sessions < 99.5% over 1 hour: page on-call.
- New issue event count > 25 in 15 minutes for same fingerprint: page on-call.
- Auth errors (`auth/configuration-not-found`, `401`) > 2% of sessions over 30 minutes: investigate and rollback gate.
- API 5xx or timeout trend > 1% for 30 minutes: block rollout progression.

## Release Gate Policy

- Before increasing rollout, verify no critical regressions in:
  - crash-free sessions
  - sign-in success rate
  - core logging flow error rate

If any threshold is breached, halt rollout and trigger rollback procedure from release runbook.
