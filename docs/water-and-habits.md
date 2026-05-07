# Water tracking and habit toggles

This document describes how the mobile app integrates **account-level habits** and **daily water totals** with the REST API.

## Habits (`GET/PATCH /api/v1/me`)

- **`habits.calorieTrackingEnabled`**: Always on at the account level; the Settings UI shows a **locked** switch (not editable).
- **`habits.exerciseTrackingEnabled`**: When off, the Dashboard **hides** the exercise block and the server rejects exercise writes with **403**.
- **`habits.waterTrackingEnabled`**: When off, the Dashboard **hides** the water block and the server rejects water writes with **403**. **`GET /me/water` still succeeds** when called (no 403 on read); the client skips fetching while tracking is off to avoid unnecessary traffic.

Optional water preference fields (also under `habits`):

- `waterDefaultUnit`, `waterGoalAmount`, `waterGoalUnit`

Types live in [`types/index.d.ts`](../types/index.d.ts) (`UserHabits`, `PatchUserHabitsBody`, `WaterUnit`).

## Water endpoints

| Method | Path                               | Notes                                                                          |
| ------ | ---------------------------------- | ------------------------------------------------------------------------------ |
| GET    | `/api/v1/me/water?date=YYYY-MM-DD` | **`date` query is required.** Returns `WaterDailyWithId` (`id` equals `date`). |
| PUT    | `/api/v1/me/water`                 | Idempotent set daily total + unit + optional goal fields.                      |
| PATCH  | `/api/v1/me/water`                 | Body `{ "deltaAmount": number }` only (strict schema — no unknown keys).       |

Water API helpers use a **single bounded 429 retry** (see [`src/lib/api/water-429-retry.ts`](../src/lib/api/water-429-retry.ts)).

## Client UX

- **Settings**: “Habits and water” card — toggles, water defaults, optional goal; calorie row locked.
- **Dashboard**: Water card with total (and goal when present), **quick-add** presets (amounts in the **current row `unit`** from `GET`), and **Log water** (PUT).
- **403** on writes: user-facing copy distinguishes water vs exercise (see [`src/lib/app-errors.ts`](../src/lib/app-errors.ts)); the app calls **`refreshAll`** on the dashboard context to re-sync `GET /me` after a feature-disabled 429/403 on water writes.

## Date boundaries

The dashboard uses **today’s calendar date in `notifications.timezone`** (from `GET /me`, default `UTC`) via [`formatDateInTimeZone`](../src/lib/date.ts) for entries, exercise, and water, so `GET /me/water?date=` matches the server’s day bucket. See `calendarDay` on the dashboard context.

## Verification

**Automated**

- `npm run typecheck`
- `npx jest` (includes `v1.water.test.ts`, `water-units.test.ts`, `habits-settings.test.tsx`, `api-validation-details.test.ts`)

**Manual**

1. Sign in; open **Settings** → confirm **Calorie tracking** is on and locked; toggle **Exercise** / **Water**; save **water preferences**.
2. Open **Dashboard** with water on: confirm total loads; quick-add increases total; **Log water** replaces total.
3. Turn **Water** off in Settings; return to Dashboard — water section hidden; turn on again — data returns after tab focus triggers refresh (or pull refresh if added later).
4. Turn **Exercise** off — exercise section hidden.
5. Optional: force a **403** (e.g. second device toggles off) and confirm toast copy and recovery after refresh.

## OpenAPI

Do not treat the OpenAPI stub’s **GET `/me/water` 200 schema** as canonical; align runtime types with the backend contract and [`types/index.d.ts`](../types/index.d.ts).
