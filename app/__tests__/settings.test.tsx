import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import type { EffectCallback } from 'react';

import SettingsScreen from '@/app/(tabs)/settings';
import type { UserDocument } from '@/types';

const mockPush = jest.fn();
const mockUseAuth = jest.fn();
const mockGetMe = jest.fn();
const mockPatchMe = jest.fn();

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush }),
}));

jest.mock('@react-navigation/native', () => ({
  useFocusEffect: (callback: EffectCallback) => {
    const mockReact = jest.requireActual<typeof import('react')>('react');
    mockReact.useEffect(() => {
      callback();
    }, [callback]);
  },
}));

jest.mock('@/components/auth/auth-provider', () => ({
  useAuth: () => mockUseAuth(),
}));

jest.mock('@/lib/api', () => ({
  getMe: () => mockGetMe(),
  patchMe: (...args: unknown[]) => mockPatchMe(...args),
}));

jest.mock('@/components/layout/app-screen', () => ({
  AppScreen: ({ children }: { children: React.ReactNode }) => children,
}));

jest.mock('@/components/settings/notifications-settings', () => ({
  NotificationsSettings: () => null,
}));

jest.mock('@/components/ExternalLink', () => ({
  ExternalLink: ({ children }: { children: React.ReactNode }) => children,
}));

jest.mock('@/components/ui/card', () => ({
  Card: ({ children }: { children: React.ReactNode }) => children,
  CardContent: ({ children }: { children: React.ReactNode }) => children,
}));

jest.mock('@/components/ui/avatar', () => ({
  Avatar: () => null,
}));

function makeMe(overrides: Partial<UserDocument> = {}): UserDocument {
  return {
    displayName: 'Tester',
    email: 'test@example.com',
    createdAt: '2026-01-01T00:00:00.000Z',
    profile: {
      heightCm: null,
      weightKg: null,
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
    ...overrides,
  };
}

describe('SettingsScreen profile editing', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseAuth.mockReturnValue({ user: { uid: 'u1', email: 'test@example.com' } });
    mockGetMe.mockResolvedValue(makeMe({ goalType: 'lose' }));
    mockPatchMe.mockImplementation(async (body: { profile?: Record<string, unknown> }) =>
      makeMe({ goalType: 'lose', profile: { ...makeMe().profile, ...(body.profile ?? {}) } })
    );
  });

  it('shows goal type in profile card', async () => {
    render(<SettingsScreen />);

    await waitFor(() => expect(mockGetMe).toHaveBeenCalled());
    expect(screen.getByText('Weight Goal')).toBeTruthy();
    expect(screen.getByText('Lose weight')).toBeTruthy();
    expect(screen.getByText('Legal Disclosures')).toBeTruthy();
  });

  it('autosaves numeric profile fields on blur', async () => {
    render(<SettingsScreen />);

    await waitFor(() => expect(mockGetMe).toHaveBeenCalled());
    const heightInput = screen.getByLabelText('Height (cm)');
    fireEvent.changeText(heightInput, '170');
    fireEvent(heightInput, 'blur');

    await waitFor(() => {
      expect(mockPatchMe).toHaveBeenCalledWith({ profile: { heightCm: 170 } });
    });
  });

  it('sends null when a profile numeric field is cleared', async () => {
    mockGetMe.mockResolvedValue(makeMe({ profile: { ...makeMe().profile, age: 31 } }));
    render(<SettingsScreen />);

    await waitFor(() => expect(mockGetMe).toHaveBeenCalled());
    const ageInput = screen.getByLabelText('Age');
    fireEvent.changeText(ageInput, '');
    fireEvent(ageInput, 'blur');

    await waitFor(() => {
      expect(mockPatchMe).toHaveBeenCalledWith({ profile: { age: null } });
    });
  });
});
