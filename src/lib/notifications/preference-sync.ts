import AsyncStorage from '@react-native-async-storage/async-storage';

import { getMe, patchMe } from '@/lib/api';
import { ApiError } from '@/lib/api/errors';
import { captureMonitoringError } from '@/lib/monitoring';
import type { NotificationsSettings, PatchNotificationsBody } from '@/types';

import { withNotificationDefaults } from './defaults';

const key = (uid: string) => `pendingNotificationsPatch:${uid}`;

const BACKOFF_MS = [1000, 5000, 30_000, 120_000];

const patchRetryTimers: Record<string, ReturnType<typeof setTimeout>> = {};

type PendingEnvelope = { savedAtMs: number; body: PatchNotificationsBody };

function parsePendingRaw(raw: string): PatchNotificationsBody | null {
  try {
    const v = JSON.parse(raw) as unknown;
    if (v && typeof v === 'object' && 'body' in v) {
      return (v as PendingEnvelope).body;
    }
    return v as PatchNotificationsBody;
  } catch {
    return null;
  }
}

export async function savePendingNotificationPatch(
  uid: string,
  body: PatchNotificationsBody
): Promise<void> {
  const envelope: PendingEnvelope = { savedAtMs: Date.now(), body };
  await AsyncStorage.setItem(key(uid), JSON.stringify(envelope));
}

export async function clearPendingNotificationPatch(uid: string): Promise<void> {
  clearNotificationPatchRetry(uid);
  await AsyncStorage.removeItem(key(uid));
}

/**
 * Retry a previously failed `PATCH /me` notifications payload (e.g. offline).
 */
export async function flushPendingNotificationPatch(uid: string): Promise<void> {
  const raw = await AsyncStorage.getItem(key(uid));
  if (!raw) return;

  const body = parsePendingRaw(raw);
  if (!body) {
    await AsyncStorage.removeItem(key(uid));
    clearNotificationPatchRetry(uid);
    return;
  }

  try {
    const me = await getMe();
    if (me?.notifications) {
      const server = withNotificationDefaults(me.notifications);
      const desired = withNotificationDefaults(body as Partial<NotificationsSettings>);
      if (JSON.stringify(server) === JSON.stringify(desired)) {
        await AsyncStorage.removeItem(key(uid));
        clearNotificationPatchRetry(uid);
        return;
      }
    }
  } catch {
    // offline — still try to apply pending below
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
