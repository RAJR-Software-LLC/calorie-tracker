import { render } from '@testing-library/react-native';
import type { ReactNode } from 'react';

import TabLayout from '@/app/(tabs)/_layout';
import { TestQueryProvider } from '@/lib/queries/test-utils';

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

jest.mock('react-native/Libraries/Utilities/useWindowDimensions', () => ({
  __esModule: true,
  default: () => ({ width: 390, height: 844, scale: 2, fontScale: 1 }),
}));

jest.mock('@/lib/api', () => ({
  getMe: jest.fn(async () => null),
  getEntries: jest.fn(async () => []),
  getSavedItems: jest.fn(async () => []),
  getFamilySharedItems: jest.fn(async () => []),
  getExerciseForDate: jest.fn(async () => []),
  getMeWater: jest.fn(async () => null),
}));

jest.mock('@/components/auth/auth-provider', () => ({
  useAuth: () => ({ user: null, loading: false }),
}));

describe('Tab layout exercise tab', () => {
  beforeEach(() => {
    capturedScreens.length = 0;
    jest.clearAllMocks();
  });

  it('always shows the exercise tab', () => {
    render(
      <TestQueryProvider>
        <TabLayout />
      </TestQueryProvider>
    );

    const exercise = capturedScreens.find((screen) => screen.name === 'exercise');
    expect(exercise).toBeTruthy();
    expect(exercise?.href).not.toBeNull();
  });
});
