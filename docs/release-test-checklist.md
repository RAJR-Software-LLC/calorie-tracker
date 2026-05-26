# Release Candidate Test Checklist

## Automated Gates

- `npm run check`
- `npm test`
- `npx expo-doctor`

## High-Risk Flow Regression

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
  - Manual add, edit (PATCH-safe fields), and delete on Exercise tab.
  - Dashboard exercise summary matches Exercise tab after mutations.
  - Settings **Exercise logging** off hides Exercise tab and blocks writes with 403.
  - Native sync (dev/production build only, not Expo Go):
    - iOS: HealthKit read permission prompt; synced workouts appear with preset mapping.
    - Android: Health Connect read permissions; synced workouts appear with preset mapping.
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
