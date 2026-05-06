import AsyncStorage from '@react-native-async-storage/async-storage';

import { patchMe } from '@/lib/api';
import { ApiError } from '@/lib/api/errors';
import { captureMonitoringError } from '@/lib/monitoring';

import type { PatchNotificationsBody } from '@/types';

const key = (uid: string) => `pendingNotificationsPatch:${uid}`;

const BACKOFF_MS = [1000, 5000, 30_000, 120_000];

const patchRetryTimers: Record<string, ReturnType<typeof setTimeout>> = {};

export async function savePendingNotificationPatch(
  uid: string,
  body: PatchNotificationsBody
): Promise<void> {
  await AsyncStorage.setItem(key(uid), JSON.stringify(body));
}

export async function clearPendingNotificationPatch(uid: string): Promise<void> {
  await AsyncStorage.removeItem(key(uid));
}

/**
 * Retry a previously failed `PATCH /me` notifications payload (e.g. offline).
 */
export async function flushPendingNotificationPatch(uid: string): Promise<void> {
  const raw = await AsyncStorage.getItem(key(uid));
  if (!raw) return;

  let body: PatchNotificationsBody;
  try {
    body = JSON.parse(raw) as PatchNotificationsBody;
  } catch {
    await AsyncStorage.removeItem(key(uid));
    return;
  }

  try {
    await patchMe({ notifications: body });
    await AsyncStorage.removeItem(key(uid));
    clearNotificationPatchRetry(uid);
  } catch (e) {
    if (e instanceof ApiError && e.status === 401) {
      return;
    }
    captureMonitoringError(e, 'notifications/flush_pending_notification_patch', { uid });
  }
}

function clearNotificationPatchRetry(uid: string): void {
  const t = patchRetryTimers[uid];
  if (t) clearTimeout(t);
  delete patchRetryTimers[uid];
}

/**
 * Schedule bounded exponential backoff retries while a pending patch remains on disk.
 */
export function scheduleNotificationPatchRetry(uid: string, attempt = 0): void {
  clearNotificationPatchRetry(uid);
  if (attempt >= BACKOFF_MS.length) return;

  const delay = BACKOFF_MS[attempt] ?? 120_000;
  patchRetryTimers[uid] = setTimeout(() => {
    void (async () => {
      const raw = await AsyncStorage.getItem(key(uid));
      if (!raw) return;

      await flushPendingNotificationPatch(uid);
      const still = await AsyncStorage.getItem(key(uid));
      if (still) {
        scheduleNotificationPatchRetry(uid, attempt + 1);
      }
    })();
  }, delay);
}
