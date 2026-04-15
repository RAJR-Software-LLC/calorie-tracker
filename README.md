# Calorie Tracker (Expo)

Mobile client for the [calorie-tracker-backend](https://github.com/) REST API: TypeScript, **Expo Router**, **NativeWind** (Tailwind for React Native), Firebase Auth–ready API calls, and shared domain types aligned with the backend.

## Prerequisites

- Node.js 20+ (see `engines` in [package.json](package.json))
- npm
- For device testing: Xcode (iOS) and/or Android Studio (Android), or Expo Go

## Quick start

```bash
cp .env.example .env
# Set EXPO_PUBLIC_API_URL to your API base URL (no trailing slash), e.g. http://localhost:3000
# Optional: EXPO_PUBLIC_MOCK_ID_TOKEN for local testing against a running backend

npm install
npm run start
```

In another terminal, run the backend from `calorie-tracker-backend` so authenticated requests can succeed when you use a real or mock ID token.

### Quality checks

```bash
npm run check    # typecheck + lint + Prettier check
npm test
npx expo-doctor
```

### ESLint disable policy

- Any `eslint-disable` directive must have a specific explanation comment on the line immediately above it.
- The explanation must describe why the disable is required in that code location (not just restate the rule name).
- Project hook enforcement lives in `.cursor/hooks.json` and `.cursor/hooks/require-eslint-disable-reason.sh`.

## Environment variables

| Variable                    | Purpose                                                                                                                          |
| --------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| `EXPO_PUBLIC_API_URL`       | Base URL of the API (required for `src/lib/api`). No trailing slash.                                                             |
| `EXPO_PUBLIC_MOCK_ID_TOKEN` | Optional Firebase **ID token** string for development when Auth UI is not wired; sent as `Authorization: Bearer`.                |
| `EXPO_PUBLIC_FIREBASE_*`    | Optional real Firebase web config; see [app.config.ts](app.config.ts). Placeholder values skip initializing a real Firebase app. |
| `EAS_PROJECT_ID`            | Expo project UUID for EAS Build/Update (set after `eas init` or in CI secrets).                                                  |

Copy [.env.example](.env.example) to `.env` and adjust. Never commit secrets.

## Project layout

| Path                                       | Role                                                               |
| ------------------------------------------ | ------------------------------------------------------------------ |
| [app/](app/)                               | Expo Router routes: `(tabs)` main app, `(auth)` login/signup shell |
| [src/lib/api/](src/lib/api/)               | Typed `/api/v1` client (`getMe`, `getEntries`, …)                  |
| [src/lib/firebase.ts](src/lib/firebase.ts) | Firebase init + `getFirebaseIdTokenForApi`                         |
| [src/lib/utils/](src/lib/utils/)           | Pure helpers (e.g. calorie calculators)                            |
| [types/index.d.ts](types/index.d.ts)       | Shared API/domain types (keep in sync with backend)                |

More detail: [docs/architecture.md](docs/architecture.md), [docs/types.md](docs/types.md), [docs/contributing.md](docs/contributing.md).

## Production compliance docs

- [docs/privacy-policy.md](docs/privacy-policy.md)
- [docs/terms-of-use.md](docs/terms-of-use.md)
- [docs/account-deletion.md](docs/account-deletion.md)
- [docs/store-listing-language.md](docs/store-listing-language.md)
- [docs/health-policy-mapping.md](docs/health-policy-mapping.md)
- [docs/monitoring-and-alerts.md](docs/monitoring-and-alerts.md)
- [docs/release-test-checklist.md](docs/release-test-checklist.md)
- [docs/store-submission-runbook.md](docs/store-submission-runbook.md)

## EAS (builds and OTA updates)

1. Install EAS CLI: `npm install -g eas-cli` (or use `npx eas-cli`).
2. Log in: `eas login`; create/link a project: `eas init`.
3. Set `EAS_PROJECT_ID` in your environment or in `app.config.ts` / EAS secrets so `extra.eas.projectId` is populated.
4. GitHub Actions can run `eas update` for PR previews when `EXPO_TOKEN` is configured (see workflow comments in [.github/workflows/](.github/workflows/)).

Until `EXPO_TOKEN` and a valid project ID exist, the EAS Update workflow is expected to fail; CI still validates lint, types, tests, and `expo-doctor`.

## GitHub Actions

- **CI** ([`.github/workflows/ci.yml`](.github/workflows/ci.yml)): on push and pull requests to `main`, runs `typecheck`, ESLint, Prettier check, Jest, and `expo-doctor`. Sets `EXPO_PUBLIC_API_URL` for tooling that reads env at build time.
- **EAS Update** ([`.github/workflows/eas-update.yml`](.github/workflows/eas-update.yml)): on pull requests (and manual `workflow_dispatch`), runs `eas update` on a branch named `pr-<number>`. Add a repository secret **`EXPO_TOKEN`** from [Expo access tokens](https://expo.dev/accounts/_/settings/access-tokens). Run `eas login` / `eas init` locally so `EAS_PROJECT_ID` and `eas.json` match your Expo project.

## Scripts

| Script                            | Description                     |
| --------------------------------- | ------------------------------- |
| `npm run start`                   | Expo dev server                 |
| `npm run ios` / `android` / `web` | Platform shortcuts              |
| `npm run lint` / `lint:fix`       | ESLint                          |
| `npm run format` / `format:check` | Prettier                        |
| `npm run typecheck`               | `tsc --noEmit`                  |
| `npm run check`                   | typecheck + lint + format check |
| `npm test` / `test:watch`         | Jest                            |

## Reference UI

The Next.js mock in `calorie-tracker-from-v0-dev` is a **UX reference only** (navigation areas, flows). This app reimplements screens with React Native and NativeWind.
