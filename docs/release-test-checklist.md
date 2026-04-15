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
- Calculator:
  - Quick calculator returns expected calorie estimate.
  - Advanced calculator handles edge inputs without crashes.
- Family/shared:
  - Shared items render for account.
  - Add/remove shared item flow behaves as expected.
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
- Monitoring dashboard green for preview build.
