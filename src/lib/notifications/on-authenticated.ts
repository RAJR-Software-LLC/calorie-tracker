import { getDefaultNotifications, withNotificationDefaults } from './defaults';
import { flushPendingNotificationPatch } from './preference-sync';
import { flushPendingPushSync, registerPushToken, unregisterPushToken } from './push-token';
import { syncLocalMealReminders } from './local-reminders';
import { fetchMeIfStale, queryClient } from '@/lib/queries';
import { queryKeys } from '@/lib/queries/keys';

/**
 * After Firebase session is ready: sync preferences retry, push token, and local meal reminders.
 */
export async function runNotificationStartup(uid: string): Promise<void> {
  await flushPendingNotificationPatch(uid);
  await flushPendingPushSync(uid);

  let settings = getDefaultNotifications();
  const cached = queryClient.getQueryData(queryKeys.me(uid));
  if (cached && typeof cached === 'object' && 'notifications' in cached && cached.notifications) {
    settings = withNotificationDefaults(cached.notifications);
  } else {
    try {
      const me = await fetchMeIfStale(queryClient, uid);
      if (me?.notifications) {
        settings = withNotificationDefaults(me.notifications);
      }
    } catch {
      // offline / dev without API — keep defaults for local reminders only
    }
  }

  await syncLocalMealReminders(settings);

  if (settings.enabled) {
    await registerPushToken(uid);
  } else {
    try {
      await unregisterPushToken(uid);
    } catch {
      // pending delete flag set inside unregisterPushToken
    }
  }
}
