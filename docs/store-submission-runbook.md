# Store Submission and Rollout Runbook

## Release Inputs

- Green CI: typecheck, lint, format check, tests, expo-doctor.
- Completed checklist from `docs/release-test-checklist.md`.
- Updated store metadata and policy declarations.
- Production build profile secrets configured.

## Versioning

- Source of truth: app version in `app.config.ts`.
- EAS build numbering: remote auto-increment in `eas.json`.
- Release tag format: `v<appVersion>-build<storeBuildNumber>`.

## Build and Submission

1. Build production binaries:
   - `eas build --platform ios --profile production`
   - `eas build --platform android --profile production`
2. Validate legal URLs and disclaimers in built app.
3. Submit builds:
   - `eas submit --platform ios --profile production`
   - `eas submit --platform android --profile production`

## Staged Rollout Strategy

- Phase 1 (internal): TestFlight internal + Play internal testing.
- Phase 2 (limited): Play staged rollout at 5%, App Store manual release with controlled audience.
- Phase 3 (expand): 25% after 24h if health metrics are green.
- Phase 4 (full): 100% after 72h with no threshold breaches.

## Monitoring Gates Per Phase

- Crash-free sessions >= 99.5%.
- Auth/login error rate < 2%.
- API 5xx + timeout rate < 1%.
- No new P0/P1 issues in monitoring.

If any gate fails, stop rollout progression.

## Rollback Playbook

1. Halt staged rollout in Play Console and pause App Store release promotion.
2. Disable risky feature flags if applicable.
3. Ship emergency fix build or OTA update for non-native changes.
4. Communicate incident status and ETA to stakeholders.
5. Publish post-incident summary with root cause and prevention actions.

## Roles and Ownership

- Release manager: owns go/no-go decision and checklist completion.
- Engineering on-call: triages runtime incidents during rollout window.
- QA owner: confirms regression pass and sign-off evidence.

## Day-0 / Day-7 Cadence

- Day 0: monitor every 2 hours for first 12 hours.
- Day 1-2: monitor at least 3 times daily.
- Day 3-7: daily review of crash and funnel trends.
