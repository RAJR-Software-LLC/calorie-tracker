# Exercise Tracking (Frontend)

This document describes the Expo mobile implementation for exercise logging and native health sync against `/api/v1`.

## Architecture overview

- API access runs through `src/lib/api/client.ts` with Firebase bearer auth and automatic one-time 401 retry + token refresh.
- Exercise endpoint wrappers live in `src/lib/api/v1.ts`.
- Shared exercise contracts are in `types/index.d.ts`.
- Preset caching lives in `src/lib/exercise/presets-store.ts`.
- Native sync logic lives in `src/lib/exercise/native-sync/`.
- UI route is `app/(tabs)/exercise.tsx`.

## API contract usage

- Presets: `GET /me/exercise/presets`
- List day: `GET /me/exercise?date=YYYY-MM-DD`
- List range: `GET /me/exercise?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD`
- Create: `POST /me/exercise`
- Bulk sync: `POST /me/exercise/bulk` (`<=100` items per request)
- Edit user fields: `PATCH /me/exercise/:exerciseId` (`name`, `caloriesBurned`, `notes`, `presetId`, `intensity`)
- Delete: `DELETE /me/exercise/:exerciseId`

### Identity and dedupe rules

- For synced workouts, always send `externalSource` and `externalId` together.
- Re-sending the same pair is idempotent and should update the same record server-side.
- Do not PATCH immutable identity/date fields; delete + re-import if linkage replacement is required.

## Preset cache strategy

- On screen load, fetches presets through `loadExercisePresets()`.
- Cache key stores `{ version, fetchedAt, presets }`.
- Network success:
  - If version changed, overwrite cache.
  - If version unchanged, continue using cached payload.
- Network failure:
  - Return cached payload if present.
  - Bubble error if no cache exists.

## Native health sync

## Current implementation

- `syncNativeHealthAdapter()` performs:
  - permission gate (`ensurePermissions`)
  - incremental read from adapter cursor
  - native-type to preset mapping with fallback to `other`
  - payload normalization
  - dedupe by `externalSource:externalId` in-client
  - chunking into batches of `<=100`
  - retry/backoff on `429` and `5xx` with jitter
  - cursor persistence after successful sync cycle

- Adapters currently expose a production-safe integration surface and should be connected to concrete SDK readers in platform modules:
  - iOS HealthKit adapter
  - Android Health Connect adapter

## Platform compliance requirements

## iOS / App Store (HealthKit)

- Enable HealthKit capability and entitlements for release builds.
- Add and validate all required `Info.plist` permission usage descriptions.
- Request least-privilege read permissions only for used metrics/workout classes.
- Keep in-app permission rationale, App Store privacy labels, and privacy policy consistent.
- Ensure no medical diagnosis/treatment claims are made in copy or metadata.

## Android / Play Store (Health Connect)

- Declare Health Connect permissions in Android manifest and runtime prompts.
- Match Play Console Data Safety disclosures to actual collected/synced data.
- Support denied/revoked permission paths gracefully.
- Keep privacy policy and listing language aligned with behavior.

## Cross-platform guardrails

- Data minimization: upload only fields needed for feature behavior.
- Security: TLS transport, no auth token logging, safe local storage practices.
- User control: explicit sync trigger, transparent policy link, delete pathways.
- Incident path: feature-flag/rollback plan if policy review blocks rollout.

## Verification plan

## Automated checks

- `npm run typecheck`
- `npm test -- exercise-api presets-store native-sync exercise-flow`

## Manual checks

1. Presets load and display; simulate version change and verify cache updates.
2. Manual add creates record and appears in day list.
3. Range query returns expected records.
4. Edit flow updates only allowed fields without creating duplicates.
5. Delete flow removes record.
6. Native sync button:
   - permission allowed -> sync runs
   - permission denied/revoked -> user-facing error, no crash
7. Bulk behavior:
   - verify chunking never exceeds 100
   - verify 429 handling backs off and retries

## Test files

- `src/lib/api/exercise-api.test.ts`
- `src/lib/exercise/presets-store.test.ts`
- `src/lib/exercise/native-sync/mapping.test.ts`
- `src/lib/exercise/native-sync/bulk-sync.test.ts`
- `app/__tests__/exercise-flow.test.tsx`
