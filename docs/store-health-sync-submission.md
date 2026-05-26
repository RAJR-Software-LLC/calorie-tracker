# Store Health Sync Submission Checklist

Use this checklist when submitting builds that include **Apple HealthKit** or **Android Health Connect** workout sync. Technical setup lives in [`exercise-tracking.md`](exercise-tracking.md).

Last updated: 2026-05-26

## Shared (both stores)

- [ ] In-app copy uses **general wellness** framing only (no diagnosis/treatment claims).
- [ ] Privacy policy describes:
  - What health/workout data is read from the device
  - That data is uploaded to your account backend for calorie tracking
  - That health data is **not** sold or used for advertising
- [ ] In-app **View privacy policy** link on Exercise tab opens the same URL declared in store consoles.
- [ ] Exercise logging can be disabled in Settings (`habits.exerciseTrackingEnabled`).
- [ ] Native sync is **opt-in** (user taps sync; no background upload without action).
- [ ] QA completed exercise items in [`release-test-checklist.md`](release-test-checklist.md) on physical devices with a **dev/production build** (not Expo Go).

## Apple App Store

### App Store Connect — App Privacy

Declare data collected when sync is used:

| Data type | Linked to user | Used for tracking | Purpose           |
| --------- | -------------- | ----------------- | ----------------- |
| Fitness   | Yes            | No                | App functionality |
| Health    | Yes            | No                | App functionality |

Adjust exact labels to match Apple's current questionnaire wording.

### App Store Connect — metadata

- [ ] **Subtitle / description** mention optional Apple Health workout import for calorie tracking (wellness only).
- [ ] **Privacy Policy URL** matches `EXPO_PUBLIC_PRIVACY_POLICY_URL` / API `/privacy-policy`.
- [ ] **App Review notes** explain:
  - How to enable Exercise logging in Settings
  - How to trigger sync on Exercise tab
  - Test account credentials if login required
  - That HealthKit read access is requested only for workout import

### Capabilities (already in `app.config.ts`)

- [ ] HealthKit capability enabled in provisioning profile for release builds.
- [ ] `NSHealthShareUsageDescription` present (workout read rationale).
- [ ] No HealthKit **write** permissions unless product adds write features later.

### Guideline 5.1.3 alignment

See [`health-policy-mapping.md`](health-policy-mapping.md). Do not use HealthKit data for advertising or data mining.

## Google Play Console

### Health apps declaration

- [ ] Complete **Health apps** declaration.
- [ ] Category: **Nutrition and weight management** (or current equivalent).
- [ ] Declare that the app reads fitness/exercise data from Health Connect when the user syncs.

### Data safety form

When native sync is enabled, declare (align with actual behavior):

| Data type    | Collected                           | Shared | Purpose           |
| ------------ | ----------------------------------- | ------ | ----------------- |
| Fitness info | Yes (optional, user-initiated sync) | No     | App functionality |
| Health info  | Yes (optional, user-initiated sync) | No     | App functionality |

- [ ] Data is **encrypted in transit** (HTTPS API).
- [ ] Users can **delete** uploaded exercise records in-app.
- [ ] Data is **not** required for core calorie logging (manual entry works without sync).

### Android manifest / permissions

Verified in build (via `expo-health-connect` + `app.config.ts`):

- `android.permission.health.READ_EXERCISE`
- `android.permission.health.READ_ACTIVE_CALORIES_BURNED`

- [ ] Health Connect privacy policy link matches store listing.
- [ ] App handles Health Connect unavailable / permissions denied gracefully (tested on device).

## Pre-submission smoke test

1. Fresh install → sign in → enable Exercise in Settings.
2. Exercise tab → manual log → appears on Dashboard.
3. Native sync → grant permissions → workouts import once (no duplicates on re-sync).
4. Disable Exercise in Settings → tab hidden, writes blocked.
5. Revoke Health permissions in OS settings → sync shows error, app stable.

## Rollback

If store review blocks health sync:

1. Disable sync UI copy in release notes and pause marketing of the feature.
2. Ship build with sync button hidden via remote config **or** hotfix if needed.
3. Manual exercise logging remains available without store re-review of HealthKit/Health Connect scope.
