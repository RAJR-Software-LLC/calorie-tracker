import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import type { NotificationsSettings } from '@/types';

export const MEAL_REMINDER_DATA_TAG = 'meal_reminder';

function parseHHMM(s: string): { hour: number; minute: number } | null {
  const m = /^(\d{1,2}):(\d{2})$/.exec(s.trim());
  if (!m) return null;
  const hour = Number(m[1]);
  const minute = Number(m[2]);
  if (!Number.isFinite(hour) || !Number.isFinite(minute)) return null;
  if (hour < 0 || hour > 23 || minute < 0 || minute > 59) return null;
  return { hour, minute };
}

/**
 * Cancel prior meal reminder schedules and reschedule from settings (device-local wall clock).
 */
export async function syncLocalMealReminders(settings: NotificationsSettings): Promise<void> {
  if (Platform.OS === 'web') return;

  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  for (const n of scheduled) {
    const tag = n.content.data?.tag;
    if (tag === MEAL_REMINDER_DATA_TAG) {
      await Notifications.cancelScheduledNotificationAsync(n.identifier);
    }
  }

  if (!settings.enabled || !settings.categories.mealReminders) {
    return;
  }

  for (let i = 0; i < settings.reminderTimes.length; i++) {
    const hm = parseHHMM(settings.reminderTimes[i] ?? '');
    if (!hm) continue;

    await Notifications.scheduleNotificationAsync({
      content: {
        title: 'Meal reminder',
        body: 'Time for a quick log when it works for you.',
        sound: true,
        data: { tag: MEAL_REMINDER_DATA_TAG, slotIndex: i },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        hour: hm.hour,
        minute: hm.minute,
      },
    });
  }
}
