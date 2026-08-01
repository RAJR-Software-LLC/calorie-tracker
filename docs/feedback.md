# In-app feedback

Authenticated users can submit feedback reports (bug, feature request, or other), attach up to three screenshots, view past reports, comment while a ticket is open, and soft-delete their own reports. Ops triage uses backend internal APIs (Postman); there is no admin UI in the mobile app.

REST only — the app never reads or writes Firestore for feedback. Message and comment bodies are rendered as plain `Text` (never HTML / WebView).

## User flows

| Flow           | Entry point                          | Behavior                                       |
| -------------- | ------------------------------------ | ---------------------------------------------- |
| Open hub       | Settings → Feedback                  | List of own non-deleted reports, newest first  |
| Create         | Feedback → New report (or FAB)       | Category + message + optional screenshots (≤3) |
| Detail         | Tap a list row                       | Status, message, screenshots, comments         |
| Edit / comment | Detail while `open` or `in_progress` | PATCH message/category; POST comments          |
| Soft-delete    | List or detail → Delete              | `DELETE` → removed from local list             |

## API client

Helpers in [`src/lib/api/v1.ts`](../src/lib/api/v1.ts):

- `getFeedbackList(status?)` — `GET /me/feedback`
- `postFeedback(body)` — `POST /me/feedback` → `{ id }`
- `getFeedbackDetail(id)` — `GET /me/feedback/:id`
- `patchFeedback(id, body)` — `PATCH` (204)
- `deleteFeedback(id)` — soft-delete (204)
- `postFeedbackComment(id, { body })` — `POST .../comments`
- `postFeedbackAttachmentUploadUrl` / `postFeedbackAttachmentComplete`

Create automatically sends `platform` and `appVersion` via [`src/lib/feedback/platform.ts`](../src/lib/feedback/platform.ts).

### Screenshot pipeline

Implemented in [`src/lib/feedback/attachments.ts`](../src/lib/feedback/attachments.ts) (same signed-PUT pattern as profile photos):

1. Pick from photo library (`expo-image-picker`, EXIF off)
2. Re-encode JPEG with `expo-image-manipulator` (strips EXIF)
3. `POST .../attachments/upload-url` → `PUT` bytes to `uploadUrl` → `POST .../attachments/complete` with server `storagePath`
4. Refresh list/detail for ephemeral `downloadUrl` (~2h)

Max **3** attachments / **5 MiB** each. Partial upload failures keep the ticket; detail allows retry.

## State

TanStack Query hooks in [`src/lib/queries/use-feedback.ts`](../src/lib/queries/use-feedback.ts):

- Keys: `queryKeys.feedbackList(uid, status)`, `queryKeys.feedbackDetail(uid, id)`
- Short stale time (60s); refetch on screen focus for signed URLs and ops status changes
- Delete removes the item from list caches immediately

Editable when status is `open` or `in_progress` ([`isFeedbackEditable`](../src/lib/feedback/editable.ts)).

## Error handling

| Status                | UX                                                       |
| --------------------- | -------------------------------------------------------- |
| `400`                 | Inline form error; do not retry blindly                  |
| `401`                 | Handled by `apiRequest` token refresh                    |
| `404`                 | Leave detail; refresh list; toast                        |
| `409`                 | Not editable / max attachments — disable edit UI + toast |
| `429`                 | Honor `Retry-After`; disable submit briefly              |
| Offline / network     | Block submit with “Connect to the internet…”             |
| Expired `downloadUrl` | Refetch on focus / image `onError`                       |

## Screens

Root stack screens (same native header/back pattern as Legal):

| Route  | File                                                              |
| ------ | ----------------------------------------------------------------- |
| List   | [`app/feedback.tsx`](../app/feedback.tsx)                         |
| Create | [`app/feedback-new.tsx`](../app/feedback-new.tsx)                 |
| Detail | [`app/feedback-detail/[id].tsx`](../app/feedback-detail/[id].tsx) |

Shared UI under [`components/feedback/`](../components/feedback/).

## Types

Run `npm run sync-types` after backend type changes. Attachment upload bodies live in [`types/client.d.ts`](../types/client.d.ts).

## Firestore indexes

List queries require composites in the backend [`firestore.indexes.json`](../../calorie-tracker-backend/firestore.indexes.json). After `firebase deploy --only firestore:indexes`, indexes can stay in **Building** for several minutes; until they are **Enabled**, `GET /me/feedback` fails with a precondition error. Check status in the [Firebase console indexes page](https://console.firebase.google.com/project/calorie-tracker-84835/firestore/indexes).

## Verification checklist

- [ ] Settings → Feedback opens the list
- [ ] Create with each category persists and appears as `open`
- [ ] HTML-ish message/comment text displays as plain text (no script execution)
- [ ] Status filter works; soft-deleted items never reappear after DELETE
- [ ] Edit/comment works for `open` / `in_progress` and is blocked after ops marks `resolved` (`409`)
- [ ] User comment appears; ops comment (via Postman) appears
- [ ] Screenshot flow: upload-url → PUT → complete; max 3; thumbnails via `downloadUrl`
- [ ] Rapid creates handle `429` + Retry-After
- [ ] No Firestore client reads/writes for feedback
- [ ] Unit/component tests pass (`npm test`)

## Out of scope

- Ops/admin console UI (`/internal/feedback`)
- Website `POST /support-request`
- Permanent public screenshot URLs
- Offline create queue
- Trial-only client API gate
