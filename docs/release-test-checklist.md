# Release Candidate Test Checklist

## Automated Gates

- `npm run check`
- `npm test`
- `npx expo-doctor`

## High-Risk Flow Regression

- Data cache (see [`docs/client-caching-and-revalidation.md`](client-caching-and-revalidation.md)):
  - Sign in with a profile photo; open Settings — photo appears immediately on revisit (no initials flash).
  - Tab switch Home → Calendar → Settings → Family → Home (5 cycles); backend day GETs stay low while within `staleTime` (no spam on Dashboard re-focus).
  - Background app ≥5 minutes, then foreground — stale active queries refetch; brief background does not burst GETs.
  - Pull-to-refresh on Dashboard / Exercise / Family / Calendar / Settings refreshes the expected keys.
  - Edit profile height → save → UI updates via `updateMeCache` without needless day refetches.
  - Upload a new profile photo → avatar updates; expired photo URL triggers `invalidateMe` + ETag clear (no endless 304).
  - Second `GET /me` with matching ETag → `304` and UI stays correct.
  - Sign out → sign in as a different user — no stale photo, profile, or ETag from the prior account.
  - Exercise tab and Dashboard share one exercise cache for the same date; Family uses RQ for family + shared-items.
  - Presets still load offline from AsyncStorage; version bump still refreshes.
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
