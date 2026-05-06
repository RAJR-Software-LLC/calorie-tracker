import type { NotificationsSettings } from '@/types';

export function getDeviceTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  } catch {
    return 'UTC';
  }
}

export function getDefaultNotifications(): NotificationsSettings {
  return {
    enabled: true,
    reminderTimes: ['08:30', '12:30', '18:30'],
    categories: {
      mealReminders: true,
      goalStatus: true,
      streaks: true,
      familyEvents: true,
      accountAdmin: true,
    },
    quietHours: null,
    timezone: getDeviceTimezone(),
    goalStatusTime: '19:00',
  };
}

/**
 * Backfill legacy API shapes and defaults so UI always receives a full object.
 */
export function withNotificationDefaults(
  partial: Partial<NotificationsSettings> | null | undefined
): NotificationsSettings {
  const d = getDefaultNotifications();
  if (!partial) return d;

  return {
    enabled: partial.enabled ?? d.enabled,
    reminderTimes: Array.isArray(partial.reminderTimes) ? partial.reminderTimes : d.reminderTimes,
    categories: {
      ...d.categories,
      ...(partial.categories ?? {}),
    },
    quietHours:
      partial.quietHours === undefined ? d.quietHours : partial.quietHours,
    timezone: partial.timezone?.trim() ? partial.timezone.trim() : d.timezone,
    goalStatusTime: partial.goalStatusTime ?? d.goalStatusTime,
  };
}
