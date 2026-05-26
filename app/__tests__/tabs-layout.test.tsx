import { render } from '@testing-library/react-native';
import type { ReactNode } from 'react';

import TabLayout from '@/app/(tabs)/_layout';
import { useDashboard } from '@/components/dashboard/dashboard-context';

const capturedScreens: { name: string; href?: string | null }[] = [];

jest.mock('expo-router', () => {
  const React = jest.requireActual<typeof import('react')>('react');
  const { View } = jest.requireActual<typeof import('react-native')>('react-native');

  function MockTabs({ children }: { children: ReactNode }) {
    return <View>{children}</View>;
  }

  function MockTabsScreen({
    name,
    options,
  }: {
    name: string;
    options?: { href?: string | null; title?: string };
  }) {
    capturedScreens.push({ name, href: options?.href });
    return null;
  }

  MockTabs.Screen = MockTabsScreen;

  return { Tabs: MockTabs };
});

jest.mock('@/components/useColorScheme', () => ({
  useColorScheme: () => 'light',
}));

jest.mock('@/components/dashboard/dashboard-context', () => {
  const actual = jest.requireActual('@/components/dashboard/dashboard-context');
  return {
    ...actual,
    useDashboard: jest.fn(),
  };
});

const mockUseDashboard = useDashboard as jest.MockedFunction<typeof useDashboard>;

function mockHabits(exerciseTrackingEnabled: boolean) {
  mockUseDashboard.mockReturnValue({
    habits: {
      calorieTrackingEnabled: true,
      exerciseTrackingEnabled,
      waterTrackingEnabled: true,
      waterDefaultUnit: 'ml',
      waterGoalAmount: null,
      waterGoalUnit: null,
    },
  } as ReturnType<typeof useDashboard>);
}

describe('Tab layout exercise gating', () => {
  beforeEach(() => {
    capturedScreens.length = 0;
    jest.clearAllMocks();
  });

  it('shows exercise tab when exercise tracking is enabled', () => {
    mockHabits(true);
    render(<TabLayout />);

    const exercise = capturedScreens.find((screen) => screen.name === 'exercise');
    expect(exercise?.href).not.toBeNull();
  });

  it('hides exercise tab when exercise tracking is disabled', () => {
    mockHabits(false);
    render(<TabLayout />);

    const exercise = capturedScreens.find((screen) => screen.name === 'exercise');
    expect(exercise?.href).toBeNull();
  });
});
