import { NavigationContainer } from '@react-navigation/native';
import { render, screen } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import ExerciseScreen from '@/app/(tabs)/exercise';

jest.mock('@/lib/api', () => ({
  getExercisesByDate: jest.fn(async () => []),
  getExercisesByRange: jest.fn(async () => []),
  postExercise: jest.fn(),
  deleteExercise: jest.fn(),
  patchExercise: jest.fn(),
}));

jest.mock('@/lib/exercise/presets-store', () => ({
  loadExercisePresets: jest.fn(async () => ({ version: 1, presets: [] })),
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
}));

jest.mock('expo-linking', () => ({
  openURL: jest.fn(),
}));

describe('Exercise screen', () => {
  it('renders key controls', async () => {
    render(
      <NavigationContainer>
        <SafeAreaProvider>
          <ExerciseScreen />
        </SafeAreaProvider>
      </NavigationContainer>
    );
    expect(screen.getByText('Exercise')).toBeTruthy();
    expect(screen.getByText('Add Exercise')).toBeTruthy();
    expect(screen.getByText('Sync from native health app')).toBeTruthy();
  });
});
