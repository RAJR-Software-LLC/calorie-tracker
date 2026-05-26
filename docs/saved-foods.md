# Saved foods (personal + family suggestions)

Personal saved foods are reusable meal shortcuts stored under `/api/v1/me/saved-items`. Family shared foods come from `/api/v1/families/:familyId/shared-items` and appear in meal-logging suggestions only (not in the personal management list).

## User flows

| Flow | Entry point | Behavior |
| ---- | ----------- | -------- |
| Create saved food | Dashboard → Log a meal → “Save to My Items” | `POST /me/saved-items` |
| Manage saved foods | Settings → Saved foods | List, edit, delete personal items only |
| Use suggestion | Log a meal combobox | Merged personal + family rows with badges |
| Share to family | Family tab → Share an item | Requires numeric calories (not `'unknown'`) |

## API client

Helpers in [`src/lib/api/v1.ts`](../src/lib/api/v1.ts):

- `getSavedItems()` — active personal items
- `patchSavedItem(id, body, ifUnmodifiedSince)` — sends `If-Unmodified-Since`
- `deleteSavedItem(id, ifUnmodifiedSince)` — soft delete with concurrency header

Shared utilities in [`src/lib/utils/saved-items.ts`](../src/lib/utils/saved-items.ts):

- `formatSavedItemCalories`, `isKnownCalories`
- `mergeSavedFoodSuggestions` — combobox merge
- `classifySavedItemMutationError` — 409/404 message discrimination

## State

[`components/dashboard/dashboard-context.tsx`](../components/dashboard/dashboard-context.tsx) loads personal and family items on dashboard refresh. Family fetch is skipped when `familyId` is null; `403` clears family suggestions.

After successful edit/delete, the UI updates optimistically and silently re-fetches personal items to sync `updatedAt`.

## Error handling

| Status | Message (exact) | UX |
| ------ | ----------------- | -- |
| 409 | `Saved item name already exists` | Inline name error; keep edit modal open |
| 409 | `Saved item was modified, refresh and retry` | Toast + refresh list |
| 404 | `Saved item not found` | Remove row + refresh |
| 400 | `Missing or invalid If-Unmodified-Since header` | Same as stale |

## `defaultCalories: 'unknown'`

- Personal create/edit: allowed; edit uses **Calories unknown** toggle ([`saved-foods-management-modal.tsx`](../components/settings/saved-foods-management-modal.tsx)).
- Family share: rejected by API if `'unknown'`; share chips exclude unknown items.
- Combobox: shows **Unknown calories** (muted); selecting does not prefill entry calories.

## Legacy saved items (pre–soft-delete)

Older Firestore rows may omit `deletedAt`, `itemNameNormalized`, or `updatedAt`. The API read path includes those active rows and uses `lastUsed` as a concurrency fallback. A one-time backfill was run in production to normalize existing documents.

After backend deploy, pull to refresh on Dashboard or reopen Settings → Saved foods.

## Verification checklist

- [ ] Settings → Saved foods opens management modal
- [ ] Empty state explains create-via-log flow
- [ ] Edit sends correct `If-Unmodified-Since`
- [ ] Duplicate name shows inline error (409)
- [ ] Stale edit/delete refreshes list (409)
- [ ] Delete removes item from list and combobox
- [ ] Log combobox shows Personal / Family badges and sharer name
- [ ] Family suggestions absent when not in a family
- [ ] Family fetch 403 clears family suggestions
- [ ] Unknown-calorie personal item selectable without prefilling calories
- [ ] No unshare controls on family rows

## Tests

- `src/lib/utils/__tests__/saved-items.test.ts`
- `src/lib/api/__tests__/saved-items.test.ts`
- `components/settings/__tests__/saved-foods-management-modal.test.tsx`
- `components/dashboard/__tests__/log-entry-suggestions.test.tsx`

Run: `npm test -- saved-items log-entry-suggestions saved-foods-management`
