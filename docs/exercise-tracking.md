# Exercise Tracking (Frontend)

This document describes the Expo mobile implementation for exercise logging and native health sync against `/api/v1`.

## Production readiness audit

- **REST only** — no Firestore client SDK for exercise or sync-state (`firestore.rules` deny-all).
- **Auth** — Firebase ID token via `Authorization: Bearer`.
- **External identity** — synced workouts always send `externalSource` + `externalId` together; never unpaired.
- **Bulk** — max 100 items per `POST /me/exercise/bulk`; honor `429` + `Retry-After` header (fallback: body `retryAfter`).
- **Cursor advance** — platform cursors / `lastSuccessfulSyncAt` advance only after all bulk chunks return `200`.
- **Habit gate** — when `habits.exerciseTrackingEnabled === false`, hide write/sync UI; abort sync on `403`; Exercise tab stays visible (read-only + Settings CTA).
- **Expo Go** — native adapters fall back to denied/empty; sync requires a custom/dev or production build.
- **Unreported calories** — native workouts without active energy upload `caloriesBurned: 0` with notes sentinel `__calories_not_reported__`; UI shows **Not reported** (dashboard remaining still treats burn as 0).
- **Background sync** — optional, user-enabled; OS delivery is best-effort (`expo-background-task`).

## Architecture overview

- API access: [`src/lib/api/client.ts`](../src/lib/api/client.ts) (Firebase bearer, one-time 401 retry, `Retry-After` on `ApiError`).
- Exercise wrappers: [`src/lib/api/v1.ts`](../src/lib/api/v1.ts).
- Shared contracts: [`types/index.d.ts`](../types/index.d.ts) (keep in sync with backend via `npm run sync-types`).
- Preset cache: [`src/lib/exercise/presets-store.ts`](../src/lib/exercise/presets-store.ts).
- Native sync: [`src/lib/exercise/native-sync/`](../src/lib/exercise/native-sync/) (adapters, orchestrator, server sync-state, background task).
- UI: [`app/(tabs)/exercise.tsx`](<../app/(tabs)/exercise.tsx>); dashboard section: [`components/dashboard/exercise-section.tsx`](../components/dashboard/exercise-section.tsx).

## API contract usage

| Method | Path                                                             | Notes                                                      |
| ------ | ---------------------------------------------------------------- | ---------------------------------------------------------- |
| GET    | `/me/exercise/presets`                                           | Catalog + `version`                                        |
| GET    | `/me/exercise/sync-state`                                        | Defaults when unset; hydrate local cursor cache            |
| PUT    | `/me/exercise/sync-state`                                        | Attempt / success / error + platform cursors (habit-gated) |
| GET    | `/me/exercise?date=` \| `startDate`+`endDate` \| `updatedSince=` | Mutually exclusive query modes                             |
| POST   | `/me/exercise`                                                   | Manual create (duration, distance, start/end, notes, …)    |
| POST   | `/me/exercise/bulk`                                              | ≤100; native upsert                                        |
| PATCH  | `/me/exercise/:id`                                               | Editable fields only (not `externalId` / `externalSource`) |
| DELETE | `/me/exercise/:id`                                               | Hard delete                                                |

### Habit gate

Writes (`POST`, `PATCH`, `DELETE`, `/bulk`, `PUT /sync-state`) return `403` when exercise tracking is disabled. GET list/presets/sync-state remain allowed.

## Manual CRUD UI

Create and edit forms include: name, calories, preset, intensity, duration, distance, start/end (ISO), notes. Client validates `endTime >= startTime` and rejects empty patches.

## Preset cache strategy

- `loadExercisePresets()` caches `{ version, fetchedAt, presets }`.
- Refresh overwrites cache when `version` changes; network failure falls back to cache.

## Native health sync

- **iOS**: `@kingstinct/react-native-healthkit`
- **Android**: `react-native-health-connect` (+ `expo-health-connect` config plugin)

### Sync orchestration

1. Hydrate `GET /sync-state` → local AsyncStorage mirror.
2. `PUT` `lastAttemptAt`.
3. Read workouts since platform cursor (or user-selected **7 / 30 / 90** day lookback on first sync).
4. Map → payloads (preset match; missing calories → 0 + sentinel).
5. Dedupe by `externalSource:externalId`; chunk ≤100; retry `429`/`5xx`.
6. On full success: `PUT` success + cursor/`deviceId`; clear `lastError`.
7. On failure: `PUT` `lastError`; do not advance cursor.
8. Optionally `GET ?updatedSince=` then invalidate TanStack `queryKeys.exercise`.

### Background sync

- Packages: `expo-background-task`, `expo-task-manager`.
- User opts in once on Exercise tab (“Enable background sync”).
- Task registered at app start via `installExerciseBackgroundSyncTask()` in root layout.
- Also refresh sync status when app becomes active.
- OS may delay or skip runs — disclosed in UI and store docs.

### Dev client required (not Expo Go)

1. Install deps (including background packages).
2. `npx expo prebuild` when native projects need regeneration.
3. `eas build --profile development --platform ios|android`.
4. Physical device for HealthKit / Health Connect.

## Net calories (dashboard)

Client-side remaining: `goal - consumed + burned`. Unreported native calories contribute `0` to burned (honest unknown energy).

## Platform compliance

See [`store-health-sync-submission.md`](store-health-sync-submission.md) and [`health-policy-mapping.md`](health-policy-mapping.md).

## Verification plan

### Automated

```bash
npm run typecheck
npm test -- exercise-api presets-store native-sync exercise-flow calories-display sync-state background-sync tabs-layout
```

### Manual (device build)

1. Manual create with duration, distance, start/end, notes; appears in day list.
2. Edit expanded fields; PATCH never sends `externalId`.
3. Presets load and cache by `version`.
4. HealthKit / Health Connect: same workout twice → one row, second `updated`.
5. Chunked sync >100; `429` backoff.
6. Background/periodic: cursor advances only after successful bulk.
7. `updatedSince` + dashboard refresh after sync.
8. `exerciseTrackingEnabled: false` — tab visible, writes hidden, 403 toast.
9. Not reported label when native calories missing.
10. Export/account-delete still coherent.

## Test files

- `src/lib/api/exercise-api.test.ts`
- `src/lib/exercise/calories-display.test.ts`
- `src/lib/exercise/presets-store.test.ts`
- `src/lib/exercise/native-sync/mapping.test.ts`
- `src/lib/exercise/native-sync/native-type-mapping.test.ts`
- `src/lib/exercise/native-sync/adapters.test.ts`
- `src/lib/exercise/native-sync/bulk-sync.test.ts`
- `src/lib/exercise/native-sync/sync-state.test.ts`
- `src/lib/exercise/native-sync/background-sync.test.ts`
- `app/__tests__/exercise-flow.test.tsx`
- `app/__tests__/tabs-layout.test.tsx`
