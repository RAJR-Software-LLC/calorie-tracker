# Contributing

## Before you open a PR

```bash
npm run check
npm test
npx expo-doctor
```

Fix any failures. CI runs the same checks (see `.github/workflows/ci.yml`).

## Branches and commits

- Use short, descriptive branch names (e.g. `feature/calendar-entries`).
- Write commit messages in plain language: what changed and why.

## Adding a screen (Expo Router)

1. Add a file under `app/`, for example `app/(tabs)/new-screen.tsx`.
2. If it should appear in the tab bar, register it in `app/(tabs)/_layout.tsx` with `Tabs.Screen`.
3. Prefer **NativeWind** (`className`) for layout and typography; keep shared styles consistent with existing screens.

## Adding an API method

1. Confirm the backend route and JSON shape in `calorie-tracker-backend`.
2. If types changed, run `npm run sync-types` (see [`scripts/sync-types.sh`](../scripts/sync-types.sh)) with `CALORIE_TRACKER_BACKEND_ROOT`, or update [`types/index.d.ts`](../types/index.d.ts) manually.
3. Add a function in [`src/lib/api/v1.ts`](../src/lib/api/v1.ts) using `apiRequest` from [`client.ts`](../src/lib/api/client.ts).
4. Handle `204` responses (delete/usage) — `apiRequest<void>` already returns `undefined` for empty bodies.

## Auth during development

- Set `EXPO_PUBLIC_MOCK_ID_TOKEN` to a valid Firebase **ID token** from your dev project so `Authorization: Bearer` works against a local API.
- When Firebase Auth UI is implemented, `getFirebaseIdTokenForApi` will use `auth.currentUser.getIdToken()` when mock env is unset.

## Formatting and lint

- **Prettier** is the source of truth for formatting; run `npm run format` before pushing if needed.
- **ESLint** uses `eslint-config-expo` + `eslint-config-prettier`; do not disable rules broadly without discussion.

## Optional hardening

- Dependency review or CodeQL on GitHub can be added for additional security; they are not Expo-specific.
