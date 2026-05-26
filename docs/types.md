# Shared types (`types/index.d.ts` + `types/client.d.ts`)

Backend types are copied into [`types/index.d.ts`](../types/index.d.ts) via `npm run sync-types`. Mobile-only aliases and extensions live in [`types/client.d.ts`](../types/client.d.ts) (import via `@/types`).

## Conventions

- **`ApiTimestamp`**: In JSON responses, Firestore timestamps are **ISO 8601 strings**, not raw Firestore objects.
- **`DateString`**: Calendar day `YYYY-MM-DD` for entry and exercise dates.
- **`unknown` on `createdAt`**: Allows gradual typing if a client still receives non-string values during migration; prefer treating API data as ISO strings.

## Domain documents

| Type                                                  | Meaning                                                                                                                                 |
| ----------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| `UserDocument`                                        | Profile row for the signed-in user (`GET/PATCH /api/v1/me`). Includes `profile`, goals, `familyId`, `notifications`, optional `habits`. |
| `HabitsSettings` / `UserHabits` (client alias)        | Optional habits under `PATCH /api/v1/me` (`exercise` / `water` toggles, water units & goals).                                           |
| `WaterDailyDocument` / `WaterDailyWithId`             | Daily water row; `GET/PUT/PATCH /api/v1/me/water`.                                                                                      |
| `CalorieEntryDocument` / `CalorieEntryWithId`         | Food log line items; list + create + delete under `/api/v1/me/entries`.                                                                 |
| `SavedItemDocument` / `SavedItemWithId`               | Reusable items; `/api/v1/me/saved-items` plus usage increment.                                                                          |
| `ExerciseDocument` / `ExerciseWithId`                 | Exercise log lines; `/api/v1/me/exercise`.                                                                                              |
| `ExercisePreset` / `GetExercisePresetsResponse`       | Curated preset catalog from `GET /api/v1/me/exercise/presets`.                                                                          |
| `PostExerciseBulkBody` / `BulkExerciseResult`         | Native sync bulk upload to `/api/v1/me/exercise/bulk`.                                                                                  |
| `FamilyDocument` / `FamilyWithId`                     | Family group; create/join/get under `/api/v1/families`.                                                                                 |
| `FamilySharedItemDocument` / `FamilySharedItemWithId` | Items shared into a family; `/api/v1/families/:id/shared-items`.                                                                        |

## Enums

- `ActivityLevel`, `Sex`, `GoalType`: same string unions as backend validation (Zod) and Firestore.
- `ExerciseIntensity`, `ExercisePresetCategory`, `ExerciseSource`, `ExerciseExternalSource`: exercise logging and native sync.

## Request/response helpers

| Type                                                               | Endpoint                                                                                                |
| ------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------- | ----- |
| `GetMeResponse`                                                    | `GET /api/v1/me` — `UserDocument                                                                        | null` |
| `PatchMeBody`                                                      | `PATCH /api/v1/me` — partial update; `notifications` merges; optional `habits`                          |
| `GetWaterDailyQuery`, `PutWaterDailyBody`, `PatchWaterDailyBody`   | Water daily read / idempotent set / delta update (client aliases: `PutMeWaterBody`, `PatchMeWaterBody`) |
| `PostEntryBody`, `PostSavedItemBody`, `PostExerciseBody`           | POST bodies for entries, saved items, exercise                                                          |
| `PatchExerciseBody`                                                | PATCH body for `/api/v1/me/exercise/:id`                                                                |
| `PostFamilyBody`, `PostJoinFamilyBody`, `PostFamilySharedItemBody` | Family create/join/shared item                                                                          |
| `CreateFamilyResponse`, `JoinFamilyResponse`                       | JSON bodies returned from family POST routes                                                            |

## Keeping types in sync

1. When the backend `types/index.d.ts` changes, run `npm run sync-types` (see [`scripts/sync-types.sh`](../scripts/sync-types.sh)) or copy the file manually.
2. Update [`types/client.d.ts`](../types/client.d.ts) if renamed backend types need mobile aliases.
3. Run `npm run typecheck` and fix any call sites in `src/lib/api/` or screens.
