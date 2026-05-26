import { withNotificationDefaults } from '@/lib/notifications/defaults';
import type { NotificationsSettings } from '@/types';

function makeNotifications(overrides: Partial<NotificationsSettings> = {}): NotificationsSettings {
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
    timezone: 'UTC',
    goalStatusTime: '19:00',
    ...overrides,
  };
}

describe('withNotificationDefaults', () => {
  it('hydrates PATCH and immediate GET responses through the same normalized shape', () => {
    const patchResponse = makeNotifications({
      enabled: true,
      reminderTimes: ['09:00'],
      categories: {
        mealReminders: true,
        goalStatus: false,
        streaks: true,
        familyEvents: false,
        accountAdmin: true,
      },
      quietHours: { start: '22:30', end: '06:30' },
      timezone: 'America/New_York',
      goalStatusTime: '18:15',
    });

    const getResponse = { ...patchResponse };

    expect(withNotificationDefaults(patchResponse)).toEqual(withNotificationDefaults(getResponse));
  });

  it('preserves server-returned notification fields for partial category updates', () => {
    const serverResponse = {
      categories: {
        goalStatus: false,
      },
      enabled: false,
      reminderTimes: ['10:15'],
      timezone: 'America/Chicago',
      goalStatusTime: '17:45',
      quietHours: { start: '23:00', end: '07:00' },
    };

    expect(
      withNotificationDefaults(serverResponse as import('@/types').PatchNotificationsBody)
    ).toEqual({
      enabled: false,
      reminderTimes: ['10:15'],
      categories: {
        mealReminders: true,
        goalStatus: false,
        streaks: true,
        familyEvents: true,
        accountAdmin: true,
      },
      quietHours: { start: '23:00', end: '07:00' },
      timezone: 'America/Chicago',
      goalStatusTime: '17:45',
    });
  });
});
