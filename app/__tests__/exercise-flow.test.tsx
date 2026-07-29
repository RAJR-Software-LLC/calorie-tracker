import { render, screen, waitFor } from '@testing-library/react-native';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import ExerciseScreen from '@/app/(tabs)/exercise';
import { TestQueryProvider } from '@/lib/queries/test-utils';

const mockRefreshExercises = jest.fn(async () => undefined);

jest.mock('@/components/dashboard/dashboard-context', () => ({
  useDashboard: () => ({
    refreshExercises: mockRefreshExercises,
    habits: {
      calorieTrackingEnabled: true,
      exerciseTrackingEnabled: true,
      waterTrackingEnabled: true,
      waterDefaultUnit: 'ml',
      waterGoalAmount: null,
      waterGoalUnit: null,
    },
  }),
}));

jest.mock('@/components/auth/auth-provider', () => ({
  useAuth: () => ({ user: { uid: 'u1', displayName: 'Test' }, loading: false }),
}));

jest.mock('@/lib/api', () => ({
  getMe: jest.fn(async () => ({ profilePhoto: null })),
  getExercisesByDate: jest.fn(async () => []),
  getExercisesByRange: jest.fn(async () => []),
  getExercisesUpdatedSince: jest.fn(async () => []),
  getExerciseSyncState: jest.fn(async () => ({
    lastSuccessfulSyncAt: null,
    lastAttemptAt: null,
    lastError: null,
    platforms: {},
  })),
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
  syncNativeHealthAdapter: jest.fn(async () => ({
    uploaded: 0,
    syncAttemptAt: '2026-05-08T00:00:00.000Z',
  })),
  hydrateExerciseSyncState: jest.fn(async () => ({
    lastSuccessfulSyncAt: null,
    lastAttemptAt: null,
    lastError: null,
    platforms: {},
  })),
  getNativeSyncPrivacyPolicyUrl: jest.fn(() => 'https://example.com/privacy'),
  isNativeHealthSyncSupported: jest.fn(() => true),
  ExerciseTrackingDisabledError: class ExerciseTrackingDisabledError extends Error {},
  NATIVE_SYNC_REQUIRES_DEV_CLIENT_MESSAGE:
    'Native health sync requires a development or production build. It is not available in Expo Go.',
}));

jest.mock('@/lib/exercise/native-sync/background-sync', () => ({
  ensureExerciseBackgroundSyncRegistered: jest.fn(async () => undefined),
  isExerciseBackgroundSyncEnabled: jest.fn(async () => false),
  setExerciseBackgroundSyncEnabled: jest.fn(async () => undefined),
}));

jest.mock('expo-linking', () => ({
  openURL: jest.fn(),
}));

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: jest.fn() }),
}));

describe('Exercise screen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders key controls', async () => {
    render(
      <TestQueryProvider>
        <NavigationContainer>
          <SafeAreaProvider>
            <ExerciseScreen />
          </SafeAreaProvider>
        </NavigationContainer>
      </TestQueryProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('Exercise')).toBeTruthy();
    });
    expect(screen.getByText('Add Exercise')).toBeTruthy();
    expect(screen.getByText('Sync from native health app')).toBeTruthy();
    expect(screen.getByText(/Last successful:/)).toBeTruthy();
  });
});
