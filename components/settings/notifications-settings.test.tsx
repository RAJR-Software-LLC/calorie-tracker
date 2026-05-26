import { fireEvent, render, waitFor } from '@testing-library/react-native';

import { NotificationsSettings } from '@/components/settings/notifications-settings';
import { patchMe } from '@/lib/api';
import type { NotificationsSettings as NotificationsSettingsType, UserDocument } from '@/types';

jest.mock('@/components/auth/auth-provider', () => ({
  useAuth: () => ({ user: { uid: 'user-1', email: 'test@example.com' } }),
}));

jest.mock('@/lib/api', () => ({
  patchMe: jest.fn(),
}));

jest.mock('@/lib/notifications/local-reminders', () => ({
  syncLocalMealReminders: jest.fn(async () => {}),
}));

jest.mock('@/lib/notifications/preference-sync', () => ({
  clearPendingNotificationPatch: jest.fn(async () => {}),
  savePendingNotificationPatch: jest.fn(async () => {}),
  scheduleNotificationPatchRetry: jest.fn(),
}));

jest.mock('@/lib/notifications/push-token', () => ({
  registerPushToken: jest.fn(async () => {}),
  unregisterPushToken: jest.fn(async () => {}),
}));

jest.mock('@/lib/monitoring', () => ({
  captureMonitoringError: jest.fn(),
}));

jest.mock('@/lib/toast', () => ({
  showToast: jest.fn(),
}));

function makeNotifications(
  overrides: Partial<NotificationsSettingsType> = {}
): NotificationsSettingsType {
  return {
    enabled: false,
    reminderTimes: ['08:30'],
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

function makeMe(notifications: NotificationsSettingsType): UserDocument {
  return {
    displayName: 'Tester',
    email: 'test@example.com',
    createdAt: '2026-01-01T00:00:00.000Z',
    profile: {
      heightCm: null,
      weightKg: null,
      heightUnit: 'cm',
      weightUnit: 'kg',
      age: null,
      sex: null,
      activityLevel: null,
    },
    maintenanceCalories: null,
    calorieGoal: null,
    goalType: null,
    familyId: null,
    notifications,
  };
}

describe('NotificationsSettings PATCH response handling', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  it('uses notifications.enabled from server PATCH response', async () => {
    const serverNotifications = makeNotifications({ enabled: true, timezone: 'America/New_York' });
    const meResponse = makeMe(serverNotifications);
    (patchMe as jest.Mock).mockResolvedValue(meResponse);
    const onSaved = jest.fn();

    const { getByLabelText } = render(
      <NotificationsSettings initial={makeNotifications({ enabled: false })} onSaved={onSaved} />
    );

    const masterToggle = getByLabelText('Push Notifications');
    fireEvent(masterToggle, 'valueChange', true);

    jest.advanceTimersByTime(550);

    await waitFor(() => expect(patchMe).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(onSaved).toHaveBeenCalledWith(meResponse));
    await waitFor(() => expect(getByLabelText('Push Notifications').props.value).toBe(true));
  });

  it('keeps notification fields exactly as returned for partial category updates', async () => {
    const initial = makeNotifications({
      enabled: true,
      timezone: 'America/Los_Angeles',
      reminderTimes: ['08:30', '12:30'],
      goalStatusTime: '20:15',
    });
    const serverNotifications = makeNotifications({
      enabled: false,
      timezone: 'America/Chicago',
      reminderTimes: ['09:45'],
      goalStatusTime: '18:10',
      categories: {
        mealReminders: true,
        goalStatus: false,
        streaks: true,
        familyEvents: false,
        accountAdmin: true,
      },
    });
    const meResponse = makeMe(serverNotifications);
    (patchMe as jest.Mock).mockResolvedValue(meResponse);
    const onSaved = jest.fn();

    const { getByLabelText } = render(
      <NotificationsSettings initial={initial} onSaved={onSaved} />
    );

    fireEvent(getByLabelText('Goal Status'), 'valueChange', false);
    jest.advanceTimersByTime(550);

    await waitFor(() => expect(patchMe).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(onSaved).toHaveBeenCalledWith(meResponse));
    await waitFor(() => expect(getByLabelText('Push Notifications').props.value).toBe(false));
    expect(onSaved.mock.calls[0][0]?.notifications).toEqual(serverNotifications);
  });
});
