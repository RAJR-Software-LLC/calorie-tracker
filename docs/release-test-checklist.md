# Release Candidate Test Checklist

## Automated Gates

- `npm run check`
- `npm test`
- `npx expo-doctor`

## High-Risk Flow Regression

- Data cache (see [`docs/data-fetching-and-caching-plan.md`](data-fetching-and-caching-plan.md)):
  - Sign in with a profile photo; open Settings — photo appears immediately on revisit (no initials flash).
  - Tab switch Home → Calendar → Settings → Family → Home (5 cycles); backend `GET /me` count stays low (≤ 2 per session when cache is fresh).
  - Edit profile height → save → UI updates after a single refetch.
  - Upload a new profile photo → avatar updates from mutation/cache without duplicate flashes.
  - Background app ~30s, foreground — notifications still work; no burst of many `GET /me` calls.
  - Sign out → sign in as a different user — no stale photo or profile from the prior account.
- Auth:
  - Email/password login succeeds.
  - Sign out returns to login screen.
  - Invalid credentials show safe user message.
- Dashboard logging:
  - Create log entry.
  - Edit log entry.
  - Delete log entry.
  - Saved food combobox shows personal + family rows with badges.
- Saved foods (see [`docs/saved-foods.md`](saved-foods.md)):
  - Settings → Saved foods lists personal items alphabetically.
  - Edit/delete send `If-Unmodified-Since`; stale 409 refreshes list.
  - Duplicate name 409 keeps edit form open with inline error.
  - Unknown-calorie personal items show toggle in edit UI.
- Calculator:
  - Quick calculator returns expected calorie estimate.
  - Advanced calculator handles edge inputs without crashes.
- Family/shared:
  - Shared items render for account.
  - Add/remove shared item flow behaves as expected.
- Exercise (see also [`docs/exercise-tracking.md`](exercise-tracking.md)):
  - Presets load on Exercise tab; cached presets survive offline refresh.
  - Manual add/edit with duration, distance, start/end, notes; delete on Exercise tab.
  - Dashboard exercise summary matches Exercise tab after mutations (including TanStack invalidation).
  - Settings **Exercise logging** off keeps Exercise tab visible (read-only + Settings CTA); writes return 403.
  - Native sync (dev/production build only, not Expo Go):
    - First-sync lookback picker (7 / 30 / 90 days).
    - iOS: HealthKit read permission; bulk upsert; same workout twice → `updated`.
    - Android: Health Connect read permissions; `externalSource: health_connect`.
    - Chunked sync >100 respects max 100 and `429` / `Retry-After` backoff.
    - Server sync-state cursors advance only after successful bulk; failures leave cursor.
    - Optional background sync toggle; status shows last success / attempt / error / platform.
    - After sync, `updatedSince` refresh keeps dashboard coherent.
    - Workouts without reported calories show **Not reported** (not `0 kcal`).
    - Permission denied shows user-facing error without crash.
  - Tab bar remains usable on a small-width device (e.g. iPhone SE width).
- Legal/compliance:
  - Settings shows legal screen entry.
  - Privacy/terms/account deletion URLs open when configured.

## Device Matrix (Minimum)

- iOS:
  - Latest iOS on modern device.
  - One older supported iOS version.
- Android:
  - Latest Android on Pixel-class device.
  - One mid-range older Android version.
- UI variants:
  - Small and large screens.
  - Dark and light mode.
  - Offline startup and retry behavior.

## Release Sign-Off

- QA sign-off completed.
- Product sign-off completed.
- Health sync store disclosures completed (see [`docs/store-health-sync-submission.md`](store-health-sync-submission.md)).
- Monitoring dashboard green for preview build.
