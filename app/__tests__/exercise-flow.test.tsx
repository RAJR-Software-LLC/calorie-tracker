import { render, screen, waitFor } from '@testing-library/react-native';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import ExerciseScreen from '@/app/(tabs)/exercise';

const mockRefreshExercises = jest.fn(async () => undefined);

jest.mock('@/components/dashboard/dashboard-context', () => ({
  useDashboard: () => ({
    refreshExercises: mockRefreshExercises,
  }),
}));

jest.mock('@/lib/api', () => ({
  getExercisesByDate: jest.fn(async () => []),
  getExercisesByRange: jest.fn(async () => []),
  postExercise: jest.fn(),
  deleteExercise: jest.fn(),
  patchExercise: jest.fn(),
}));

jest.mock('@/lib/exercise/presets-store', () => ({
  loadExercisePresets: jest.fn(async () => ({
    version: 1,
    presets: [{ id: 'running', displayName: 'Running', category: 'cardio' }],
  })),
}));

jest.mock('@/lib/exercise/native-sync', () => ({
  createHealthKitAdapter: jest.fn(() => ({
    source: 'healthkit',
    ensurePermissions: async () => true,
    readWorkouts: async () => ({ workouts: [], nextCursor: { value: 'x' } }),
  })),
  createHealthConnectAdapter: jest.fn(() => ({
    source: 'health_connect',
    ensurePermissions: async () => true,
    readWorkouts: async () => ({ workouts: [], nextCursor: { value: 'x' } }),
  })),
  syncNativeHealthAdapter: jest.fn(async () => ({ uploaded: 0 })),
  getNativeSyncPrivacyPolicyUrl: jest.fn(() => 'https://example.com/privacy'),
  isNativeHealthSyncSupported: jest.fn(() => true),
  NATIVE_SYNC_REQUIRES_DEV_CLIENT_MESSAGE:
    'Native health sync requires a development or production build. It is not available in Expo Go.',
}));

jest.mock('expo-linking', () => ({
  openURL: jest.fn(),
}));

describe('Exercise screen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders key controls', async () => {
    render(
      <NavigationContainer>
        <SafeAreaProvider>
          <ExerciseScreen />
        </SafeAreaProvider>
      </NavigationContainer>
    );

    await waitFor(() => {
      expect(screen.getByText('Exercise')).toBeTruthy();
    });
    expect(screen.getByText('Add Exercise')).toBeTruthy();
    expect(screen.getByText('Sync from native health app')).toBeTruthy();
  });
});
