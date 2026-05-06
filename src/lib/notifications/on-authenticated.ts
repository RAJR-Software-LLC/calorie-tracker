import { getMe } from '@/lib/api';

import { getDefaultNotifications, withNotificationDefaults } from './defaults';
import { flushPendingNotificationPatch } from './preference-sync';
import { flushPendingPushSync, registerPushToken, unregisterPushToken } from './push-token';
import { syncLocalMealReminders } from './local-reminders';

/**
 * After Firebase session is ready: sync preferences retry, push token, and local meal reminders.
 */
export async function runNotificationStartup(uid: string): Promise<void> {
  await flushPendingNotificationPatch(uid);
  await flushPendingPushSync(uid);

  let settings = getDefaultNotifications();
  try {
    const me = await getMe();
    if (me?.notifications) {
      settings = withNotificationDefaults(me.notifications);
    }
  } catch {
    // offline / dev without API — keep defaults for local reminders only
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
