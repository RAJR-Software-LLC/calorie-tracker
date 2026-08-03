# Calorie calculator (client)

Backend-owned BMR/TDEE/PAL and recommended goals. The Expo app **previews and applies** results over REST; it does **not** implement Mifflin–St Jeor, Harris–Benedict, or Schofield locally.

Backend contract: sibling repo `calorie-tracker-backend/docs/calculator.md` and OpenAPI `/api/v1/me/calculator/*`. Sync types with `npm run sync-types`.

## Ownership

| Concern                                            | Owner                                                                                                     |
| -------------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| BMR, TDEE, activity multipliers, recommended goals | Backend `POST …/estimate` and `POST …/apply`                                                              |
| Formula catalog + citations                        | `GET …/formulas`                                                                                          |
| Persist snapshot + goals                           | Apply only (`calorieCalculation`, `preferredFormulaId`, `maintenanceCalories`, `calorieGoal`, `goalType`) |
| Display helpers (units, goal formatting)           | Client (`profile-measurements`, `calorie-goal`, display-only `calories.ts`)                               |
| Manual goal override                               | Optional `PATCH /me` (`calorieGoal` / `maintenanceCalories` / `goalType` only)                            |

**Do not** send `calorieCalculation` or `preferredFormulaId` on `PATCH /me` (API rejects unknown/strict keys).

## Endpoints

Base: `/api/v1/me/calculator`

| Method | Path        | Purpose                                                |
| ------ | ----------- | ------------------------------------------------------ |
| `GET`  | `/formulas` | Catalog + `defaultFormulaId` (`mifflin_st_jeor`)       |
| `POST` | `/estimate` | Preview (no write). Omit `formulaId` for all formulas. |
| `POST` | `/apply`    | Persist snapshot and sync maintenance/goal             |

After apply, refetch `GET /me` (ETag changes) via `useCalculatorApply` → `updateMeCache`.

## Client modules

| Path                                                                        | Role                                                                                   |
| --------------------------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| [`src/lib/api/v1.ts`](../src/lib/api/v1.ts)                                 | `getCalculatorFormulas`, `postCalculatorEstimate`, `postCalculatorApply` (+ 429 retry) |
| [`src/lib/queries/use-calculator.ts`](../src/lib/queries/use-calculator.ts) | TanStack Query hooks                                                                   |
| [`src/lib/calculator/`](../src/lib/calculator/)                             | Stale/override detection, missing fields, body builders, safe citation links           |
| [`components/calculator/`](../components/calculator/)                       | Catalog, estimate cards, warnings, explanations, banners, profile form                 |
| [`app/(tabs)/calculator.tsx`](<../app/(tabs)/calculator.tsx>)               | Settings / change-formula UX                                                           |
| [`app/(onboarding)/goals.tsx`](<../app/(onboarding)/goals.tsx>)             | First-run goals flow                                                                   |

## Caching

- Formula catalog: query key `calculatorFormulas`; long `staleTime`. Entries share a `formulaVersion` string — treat snapshot as stale when versions diverge.
- `/me`: existing ETag + `updateMeCache` after apply / profile patch.
- Offline: never invent BMR/TDEE. Show last `calorieCalculation` from `/me` cache + reconnect copy.

## Stale vs custom override

- **Stale snapshot**: `calorieCalculation.inputs` ≠ current profile (age, sex, heightCm, weightKg, activityLevel), or catalog `formulaVersion` ≠ snapshot version. Banner: recalculate → estimate → apply.
- **Custom override**: snapshot exists but `maintenanceCalories` / `calorieGoal` / `goalType` diverge (manual `PATCH /me`). Banner until user re-applies a formula.

## Onboarding gate

In [`app/_layout.tsx`](../app/_layout.tsx), after auth and a successful `/me`:

`!calorieCalculation && calorieGoal == null && maintenanceCalories == null` → `/(onboarding)/goals`.

If `/me` fails (offline), do **not** trap the user in onboarding — go to tabs.

## Unit-aware payloads

Height/weight on estimate/apply overrides and `PATCH /me` use the same shapes as profile patches (`HeightInput` / `WeightInput`). Canonical storage remains `heightCm` / `weightKg`. UI converts with user unit prefs.

## Errors

| Status                | Shape / behavior                                                              |
| --------------------- | ----------------------------------------------------------------------------- |
| `400` validation      | `{ error: 'Validation failed', details }`                                     |
| `400` incomplete      | `{ error: 'Incomplete calculator inputs', missingFields }` → field list in UI |
| `400` unknown formula | Fall back to catalog default selection                                        |
| `401`                 | Re-auth                                                                       |
| `429`                 | Honor `Retry-After` via `withRetryAfter429`                                   |

Soft `warnings` on estimates are **non-blocking**. Apply stays enabled. Future legal ack gates can plug into [`CalculatorWarnings`](../components/calculator/calculator-warnings.tsx) without treating warnings as hard errors by default.

## UX flows

1. **First-run**: profile → `PATCH /me` → estimate all → select recommended → apply → tabs.
2. **Calculator tab**: catalog, preview, apply; secondary manual goal override.
3. **Settings**: Daily Goal / Weight Goal link to calculator; stale/override banners with Recalculate CTA.

## Verification checklist

- [ ] `lib/utils/calories.ts` has no BMR/TDEE/PAL/goal math
- [ ] Formula list shows three options; Mifflin recommended/default
- [ ] Estimate without `formulaId` returns three results
- [ ] Estimate with one `formulaId` returns a single result
- [ ] Apply persists; `GET /me` shows matching `calorieCalculation` / maintenance / goal
- [ ] Switching formula and re-applying updates snapshot
- [ ] Incomplete profile surfaces `missingFields`
- [ ] Soft warnings render; Apply still works
- [ ] Profile change after apply shows stale UX
- [ ] `PATCH /me` never sends `calorieCalculation`
- [ ] Unit-aware height/weight overrides work (ft/in, lb)
- [ ] Single vs range goal modes display correctly
- [ ] Offline shows cached snapshot + reconnect copy

## Out of scope

Body-fat % / Katch–McArdle, macros, MET exercise calories, inclusive sex demographics, hard calorie floors / legal acknowledgment gates.
