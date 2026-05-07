import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';

import { HabitsSettings } from '@/components/settings/habits-settings';
import type { UserDocument } from '@/types';

const mockPatchMe = jest.fn();
const mockGetMe = jest.fn();

jest.mock('@/lib/api', () => ({
  getMe: () => mockGetMe(),
  patchMe: (...args: unknown[]) => mockPatchMe(...args),
}));

jest.mock('@/components/ui/button', () => {
  const { Pressable, Text } = jest.requireActual('react-native');
  return {
    Button: ({ children, onPress, disabled }: { children: string; onPress: () => void; disabled?: boolean }) => (
      <Pressable onPress={onPress} disabled={disabled} accessibilityRole="button">
        <Text>{children}</Text>
      </Pressable>
    ),
  };
});

jest.mock('@/components/ui/card', () => {
  const { View } = jest.requireActual('react-native');
  return {
    Card: ({ children }: { children: React.ReactNode }) => <View>{children}</View>,
    CardContent: ({ children }: { children: React.ReactNode }) => <View>{children}</View>,
  };
});

function makeProfile(overrides: Partial<UserDocument> = {}): UserDocument {
  return {
    displayName: 'T',
    email: 't@example.com',
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
    profilePhoto: null,
    maintenanceCalories: null,
    calorieGoal: null,
    goalType: null,
    familyId: null,
    notifications: {
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
    },
    habits: {
      calorieTrackingEnabled: true,
      exerciseTrackingEnabled: true,
      waterTrackingEnabled: true,
      waterDefaultUnit: 'ml',
      waterGoalAmount: null,
      waterGoalUnit: null,
    },
    ...overrides,
  };
}

describe('HabitsSettings', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('PATCH /me when exercise toggle changes', async () => {
    const profile = makeProfile();
    const onUpdated = jest.fn();
    mockPatchMe.mockResolvedValue({ ...profile, habits: { ...profile.habits!, exerciseTrackingEnabled: false } });

    render(<HabitsSettings profile={profile} disabled={false} onUpdated={onUpdated} />);

    const exerciseSwitch = screen.getByLabelText('Toggle exercise logging');
    fireEvent(exerciseSwitch, 'valueChange', false);

    await waitFor(() => {
      expect(mockPatchMe).toHaveBeenCalledWith({
        habits: { exerciseTrackingEnabled: false, waterTrackingEnabled: true },
      });
    });
  });
});
