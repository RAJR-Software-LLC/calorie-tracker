# Client caching and revalidation

Production client cache strategy for the Expo app: **TanStack Query v5** for server state, plus **HTTP conditional GET** (`ETag` / `If-None-Match` / `304`) in the REST client. No second query library, no Redis, no Firestore client reads, and no persisting the full `QueryClient` to disk.

**Related:** [`docs/architecture.md`](architecture.md), [`docs/data-fetching-and-caching-plan.md`](data-fetching-and-caching-plan.md) (historical plan; this doc is the source of truth), [`src/lib/api/client.ts`](../src/lib/api/client.ts), [`src/lib/api/etag-cache.ts`](../src/lib/api/etag-cache.ts), [`src/lib/queries/`](../src/lib/queries/)

---

## Backend hybrid cache contract

Authenticated GETs return `Cache-Control: private, max-age=N, must-revalidate`, an `ETag`, and `Vary: Authorization`. Treat them as **private** only — never public/CDN-cacheable. Auth still runs on every request (including `304`).

| Resource            | Path                             | Typical `max-age` | Invalidate / refresh when                         |
| ------------------- | -------------------------------- | ----------------- | ------------------------------------------------- |
| Profile / goals     | `GET /me`                        | ~180s             | `PATCH /me`, profile photo upload/complete/delete |
| Saved foods         | `GET /me/saved-items`            | ~120s             | POST/PATCH/DELETE saved-items                     |
| Day entries         | `GET /me/entries?date=`          | ~30s              | POST/DELETE entry for that date                   |
| Day exercise        | `GET /me/exercise?date=`         | ~30s              | POST/PATCH/DELETE/bulk exercise                   |
| Day water           | `GET /me/water?date=`            | ~30s              | PUT/PATCH water                                   |
| Family              | `GET /families/:id`              | ~120s             | Create/join / membership changes                  |
| Family shared items | `GET /families/:id/shared-items` | ~120s             | POST shared-item                                  |
| Exercise presets    | `GET /me/exercise/presets`       | ~86400s           | Catalog version bump / deploy                     |

**Not cached:** export, account delete, profile-photo upload URL sessions, push-token mutations, internal dispatch. Pass `conditional: false` on those GETs if needed.

---

## Client ETag map

In-memory store keyed by `` `${uid}|GET|${absoluteUrl}` `` holding `{ etag, body }`.

| Event                                                  | Behavior                                                                      |
| ------------------------------------------------------ | ----------------------------------------------------------------------------- |
| Authenticated GET `200` with `ETag`                    | Store etag + parsed body                                                      |
| Later GET                                              | Send `If-None-Match`                                                          |
| `304`                                                  | **Do not** parse body; return stored body to TanStack Query                   |
| `304` with empty cache                                 | One unconditional retry, then error                                           |
| `401`                                                  | Existing force-refresh token retry — never a cache hit                        |
| Sign-out                                               | `queryClient.clear()` + `clearEtagCache()`                                    |
| Profile photo error / `invalidateMe` / `updateMeCache` | `clearMeEtag(uid)` so the next `/me` cannot 304-loop on an expired signed URL |

The map is **never** written to AsyncStorage (sensitive profile payloads). Presets may still use their versioned AsyncStorage envelope separately.

---

## TanStack Query `staleTime`

| Query key                                       | `staleTime`            | Notes                                 |
| ----------------------------------------------- | ---------------------- | ------------------------------------- |
| `me`                                            | 10 min                 | Well under ~2h signed photo URL TTL   |
| `savedItems` / `family` / `familySharedItems`   | 3–5 min                | Invalidate on mutate                  |
| Day `entries` / `water` / `exercise` (+ ranges) | 45s                    | Invalidate affected date key on write |
| Presets                                         | hours / versioned disk | Keep AsyncStorage envelope            |

Global defaults: `refetchOnWindowFocus: false`, `gcTime` ~10–30 min, `retry: 1`.

---

## Focus, AppState, and pull-to-refresh

1. **Dashboard tab focus** — `refreshDayDataIfStale()` refetches only day queries that are already stale (skips first mount).
2. **AppState resume** — after background **≥ 5 minutes**, `refetchQueries({ type: 'active', stale: true })` via `useAppStateRevalidate`.
3. **Pull-to-refresh** — `RefreshControl` on Dashboard, Exercise, Family, Calendar, and Settings (via `AppScreen` `refreshControl` prop). Explicit user refresh may invalidate more broadly (`refreshAll`, me + saved, etc.).

Do **not** enable TanStack `focusManager` globally; RN focus is handled explicitly.

---

## Mutation → cache update

Prefer `setQueryData` when the response body is enough; otherwise `invalidateQueries` for **specific** keys (date-scoped day keys, not a global wipe).

- `PATCH /me` → `updateMeCache` (clears `/me` ETag).
- Saved-item CRUD → local patch/remove + invalidate; keep `409` refresh + retry UX.
- Entry / water / exercise writes → invalidate that date (+ related ranges for calendar).
- Avoid blanket `me` + all day invalidation unless the mutation truly affects them.

---

## Shared query keys (no duplicate fetches)

| Surface            | Keys / hooks                                                                                   |
| ------------------ | ---------------------------------------------------------------------------------------------- |
| Dashboard          | `useMe`, `useEntries`, `useWaterDaily`, `useExercise`, `useSavedItems`, `useFamilySharedItems` |
| Exercise tab       | Same `queryKeys.exercise` / `useExercise`; ranges via `useExerciseRange`                       |
| Family             | `useFamily` + `useFamilySharedItems`; share modal uses `useSavedItems`                         |
| Calendar day modal | `useEntries(date)`                                                                             |

---

## Edge cases

- **304 empty body** — never `JSON.parse`; never clear RQ cache.
- **Multi-device** — short day TTLs + invalidate-on-write; no assumption of server Redis.
- **Offline** — in-memory RQ helps mid-session; presets disk cache for cold catalog; do not persist sensitive `/me` to disk by default.
- **429** — existing water/exercise retry helpers; caching reduces how often you hit rate limits.

### UI states

- Loading spinner only when no cached data (`isPending` && no `data`).
- Background refresh: prefer subtle `isFetching && data` over full-screen spinner.
- Pull-to-refresh for explicit refresh.
- Saved-item `409` stale conflict toasts (existing).

---

## Frontend verification checklist

- [ ] Tab away and back to Dashboard within `staleTime` does **not** spam `GET entries/water/exercise`.
- [ ] Background app ≥5 minutes, resume → stale active queries refetch; brief background does not.
- [ ] Pull-to-refresh works on Dashboard, Exercise, Family, Calendar, Settings.
- [ ] Logging a food / water / exercise updates the UI without a full app reload.
- [ ] `PATCH /me` updates Settings and header without unnecessary day refetches.
- [ ] Saved-item create/edit/delete refreshes suggestions; `409` path still works.
- [ ] Exercise tab and Dashboard share one exercise cache for the same date.
- [ ] Family screen uses RQ for family + shared-items.
- [ ] Second `GET /me` with matching ETag yields `304` and UI stays correct.
- [ ] After profile photo change (or expired URL image error), new photo appears (ETag cleared + `me` invalidated).
- [ ] Sign-out clears RQ + ETag map before another account signs in.
- [ ] Presets still load offline from AsyncStorage when network fails; version bump still refreshes.
