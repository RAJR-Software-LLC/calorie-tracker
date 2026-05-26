import * as Notifications from 'expo-notifications';

import {
  MEAL_REMINDER_DATA_TAG,
  syncLocalMealReminders,
} from '@/lib/notifications/local-reminders';
import type { NotificationsSettings } from '@/types';

jest.mock('expo-notifications', () => ({
  SchedulableTriggerInputTypes: { DAILY: 'daily' },
  getAllScheduledNotificationsAsync: jest.fn(async () => []),
  cancelScheduledNotificationAsync: jest.fn(async () => {}),
  scheduleNotificationAsync: jest.fn(async () => 'id'),
}));

describe('syncLocalMealReminders', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  function baseSettings(): NotificationsSettings {
    return {
      enabled: true,
      reminderTimes: ['09:00'],
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
    };
  }

  it('schedules daily triggers when meal reminders enabled', async () => {
    await syncLocalMealReminders(baseSettings());

    expect(Notifications.scheduleNotificationAsync).toHaveBeenCalledTimes(1);
    expect(Notifications.scheduleNotificationAsync).toHaveBeenCalledWith(
      expect.objectContaining({
        content: expect.objectContaining({
          data: expect.objectContaining({ tag: MEAL_REMINDER_DATA_TAG }),
        }),
        trigger: expect.objectContaining({
          type: 'daily',
          hour: 9,
          minute: 0,
        }),
      })
    );
  });

  it('does not schedule when mealReminders category off', async () => {
    const s = baseSettings();
    s.categories.mealReminders = false;
    await syncLocalMealReminders(s);

    expect(Notifications.scheduleNotificationAsync).not.toHaveBeenCalled();
  });

  it('clears existing meal reminders before reschedule', async () => {
    (Notifications.getAllScheduledNotificationsAsync as jest.Mock).mockResolvedValue([
      {
        identifier: 'x',
        content: { data: { tag: MEAL_REMINDER_DATA_TAG } },
      },
    ]);

    await syncLocalMealReminders(baseSettings());

    expect(Notifications.cancelScheduledNotificationAsync).toHaveBeenCalledWith('x');
  });
});
