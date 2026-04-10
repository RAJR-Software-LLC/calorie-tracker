# Shared types (`types/index.d.ts`)

This file is copied from **calorie-tracker-backend** so the mobile app uses the same shapes as the REST API and Firestore-backed models. When the backend changes, update this file (or re-copy from `calorie-tracker-backend/types/index.d.ts`).

## Conventions

- **`ApiTimestamp`**: In JSON responses, Firestore timestamps are **ISO 8601 strings**, not raw Firestore objects.
- **`DateString`**: Calendar day `YYYY-MM-DD` for entry and exercise dates.
- **`unknown` on `createdAt`**: Allows gradual typing if a client still receives non-string values during migration; prefer treating API data as ISO strings.

## Domain documents

| Type                                                  | Meaning                                                                                                              |
| ----------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| `UserDocument`                                        | Profile row for the signed-in user (`GET/PATCH /api/v1/me`). Includes `profile`, goals, `familyId`, `notifications`. |
| `CalorieEntryDocument` / `CalorieEntryWithId`         | Food log line items; list + create + delete under `/api/v1/me/entries`.                                              |
| `SavedItemDocument` / `SavedItemWithId`               | Reusable items; `/api/v1/me/saved-items` plus usage increment.                                                       |
| `ExerciseDocument` / `ExerciseWithId`                 | Exercise log lines; `/api/v1/me/exercise`.                                                                           |
| `FamilyDocument` / `FamilyWithId`                     | Family group; create/join/get under `/api/v1/families`.                                                              |
| `FamilySharedItemDocument` / `FamilySharedItemWithId` | Items shared into a family; `/api/v1/families/:id/shared-items`.                                                     |

## Enums

- `ActivityLevel`, `Sex`, `GoalType`: same string unions as backend validation (Zod) and Firestore.

## Request/response helpers

| Type                                                               | Endpoint                                                    |
| ------------------------------------------------------------------ | ----------------------------------------------------------- | ----- |
| `GetMeResponse`                                                    | `GET /api/v1/me` — `UserDocument                            | null` |
| `PatchMeBody`                                                      | `PATCH /api/v1/me` — partial update; `notifications` merges |
| `PostEntryBody`, `PostSavedItemBody`, `PostExerciseBody`           | POST bodies for entries, saved items, exercise              |
| `PostFamilyBody`, `PostJoinFamilyBody`, `PostFamilySharedItemBody` | Family create/join/shared item                              |
| `CreateFamilyResponse`, `JoinFamilyResponse`                       | JSON bodies returned from family POST routes                |

## Keeping types in sync

1. When the backend `types/index.d.ts` changes, run `npm run sync-types` (see [`scripts/sync-types.sh`](../scripts/sync-types.sh)) or copy the file manually.
2. Run `npm run typecheck` and fix any call sites in `src/lib/api/` or screens.
