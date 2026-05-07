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

jest.mock('@/components/settings/habits-settings', () => ({
  HabitsSettings: () => null,
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
    ...overrides,
  };
}

/** Simulates backend: maps unit-aware height/weight patch into canonical profile fields. */
function applyProfilePatch(
  profile: UserDocument['profile'],
  patch: Record<string, unknown>
): UserDocument['profile'] {
  const next: UserDocument['profile'] = { ...profile };
  for (const key of Object.keys(patch)) {
    const val = patch[key];
    if (key === 'height') {
      if (val && typeof val === 'object' && 'unit' in val) {
        const u = val as { unit: string; value?: number; feet?: number; inches?: number };
        if (u.unit === 'cm' && typeof u.value === 'number') next.heightCm = u.value;
        if (
          u.unit === 'ft_in' &&
          typeof u.feet === 'number' &&
          typeof u.inches === 'number'
        ) {
          next.heightCm = (u.feet * 12 + u.inches) * 2.54;
        }
      } else if (val === null) {
        next.heightCm = null;
      }
    } else if (key === 'weight') {
      if (val && typeof val === 'object' && 'unit' in val) {
        const u = val as { unit: string; value: number };
        if (u.unit === 'kg') next.weightKg = u.value;
        if (u.unit === 'lb') next.weightKg = u.value * 0.45359237;
      } else if (val === null) {
        next.weightKg = null;
      }
    } else if (
      key === 'age' ||
      key === 'sex' ||
      key === 'activityLevel' ||
      key === 'heightUnit' ||
      key === 'weightUnit'
    ) {
      (next as unknown as Record<string, unknown>)[key] = val;
    }
  }
  return next;
}

async function expandProfileForEditing() {
  fireEvent.press(screen.getByLabelText('Expand profile section'));
}

describe('SettingsScreen profile editing', () => {
  let serverMe: UserDocument;

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseAuth.mockReturnValue({ user: { uid: 'u1', email: 'test@example.com' } });
    serverMe = makeMe({ goalType: 'lose' });
    mockGetMe.mockImplementation(async () => ({ ...serverMe }));
    mockPatchMe.mockImplementation(async (body: { profile?: Record<string, unknown> }) => {
      if (body.profile) {
        serverMe = makeMe({
          ...serverMe,
          profile: applyProfilePatch(serverMe.profile, body.profile),
        });
      }
      return { ...serverMe };
    });
  });

  it('shows goal type in profile card', async () => {
    render(<SettingsScreen />);

    await waitFor(() => expect(mockGetMe).toHaveBeenCalled());
    expandProfileForEditing();
    expect(screen.getByText('Weight Goal')).toBeTruthy();
    expect(screen.getByText('Lose weight (coming soon)')).toBeTruthy();
    expect(screen.getByText('Legal Disclosures')).toBeTruthy();
  });

  it('saves unit-aware anthropometric profile fields from settings form', async () => {
    render(<SettingsScreen />);

    await waitFor(() => expect(mockGetMe).toHaveBeenCalled());
    expandProfileForEditing();
    const heightInput = screen.getByLabelText('Height (cm)');
    fireEvent.changeText(heightInput, '170');
    const weightInput = screen.getByLabelText('Weight (kg)');
    fireEvent.changeText(weightInput, '70.2');
    fireEvent.press(screen.getByText('Save profile'));

    await waitFor(() => {
      expect(mockPatchMe).toHaveBeenCalledWith({
        profile: {
          height: { unit: 'cm', value: 170 },
          weight: { unit: 'kg', value: 70.2 },
        },
      });
    });
  });

  it('stages age and sex changes until save is clicked', async () => {
    render(<SettingsScreen />);

    await waitFor(() => expect(mockGetMe).toHaveBeenCalled());
    expandProfileForEditing();
    fireEvent.changeText(screen.getByLabelText('Age'), '31');
    fireEvent.press(screen.getByText('female'));
    expect(mockPatchMe).not.toHaveBeenCalled();

    fireEvent.press(screen.getByText('Save profile'));
    await waitFor(() => {
      expect(mockPatchMe).toHaveBeenCalledWith(
        expect.objectContaining({
          profile: expect.objectContaining({
            age: 31,
            sex: 'female',
          }),
        })
      );
    });
  });

  it('blocks invalid imperial inches and does not submit malformed height payload', async () => {
    serverMe = makeMe({
      goalType: 'lose',
      profile: { ...makeMe().profile, heightCm: 180, heightUnit: 'ft_in' },
    });
    render(<SettingsScreen />);

    await waitFor(() => expect(mockGetMe).toHaveBeenCalled());
    expandProfileForEditing();
    fireEvent.changeText(screen.getByLabelText('Height feet'), '5');
    fireEvent.changeText(screen.getByLabelText('Height inches'), '12');
    fireEvent.press(screen.getByText('Save profile'));
    expect(mockPatchMe).not.toHaveBeenCalled();
  });
});
