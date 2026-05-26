process.env.EXPO_PUBLIC_API_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3000';

jest.mock('@react-native-async-storage/async-storage', () =>
  jest.requireActual('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

jest.mock(
  'react-native-safe-area-context',
  () =>
    jest.requireActual<typeof import('react-native-safe-area-context/jest/mock')>(
      'react-native-safe-area-context/jest/mock'
    ).default
);

jest.mock('firebase/app', () => ({
  getApps: jest.fn(() => []),
  initializeApp: jest.fn(() => ({})),
}));

jest.mock('firebase/auth', () => ({
  getAuth: jest.fn(() => ({})),
  initializeAuth: jest.fn(() => ({})),
  getReactNativePersistence: jest.fn(() => ({})),
  onAuthStateChanged: jest.fn((_auth: unknown, callback: (user: null) => void) => {
    callback(null);
    return jest.fn();
  }),
}));

jest.mock('@sentry/react-native', () => ({
  init: jest.fn(),
  withScope: (callback: (scope: { setTag: jest.Mock; setExtras: jest.Mock }) => void) => {
    callback({ setTag: jest.fn(), setExtras: jest.fn() });
  },
  captureException: jest.fn(),
  captureMessage: jest.fn(),
}));

jest.mock('expo-notifications', () => ({
  SchedulableTriggerInputTypes: { DAILY: 'daily' },
  setNotificationHandler: jest.fn(),
  addNotificationResponseReceivedListener: jest.fn(() => ({ remove: jest.fn() })),
  getLastNotificationResponseAsync: jest.fn(async () => null),
  getPermissionsAsync: jest.fn(async () => ({ status: 'denied' })),
  requestPermissionsAsync: jest.fn(async () => ({ status: 'denied' })),
  setNotificationChannelAsync: jest.fn(async () => {}),
  AndroidImportance: { DEFAULT: 3 },
  getAllScheduledNotificationsAsync: jest.fn(async () => []),
  cancelScheduledNotificationAsync: jest.fn(async () => {}),
  scheduleNotificationAsync: jest.fn(async () => 'id'),
  getExpoPushTokenAsync: jest.fn(async () => ({ data: 'ExponentPushToken[mock]' })),
}));

jest.mock('expo-device', () => ({
  isDevice: true,
}));

jest.mock(
  'expo-constants',
  () => ({
    __esModule: true,
    ExecutionEnvironment: {
      StoreClient: 'storeClient',
      Bare: 'bare',
      Standalone: 'standalone',
    },
    default: {
      executionEnvironment: 'bare',
      expoConfig: {
        version: '1.0.0',
        extra: { eas: { projectId: 'jest-project-id' } },
      },
    },
  }),
  { virtual: true }
);

jest.mock('@react-native-community/datetimepicker', () => 'DateTimePicker');

jest.mock('expo-image-picker', () => ({
  requestMediaLibraryPermissionsAsync: jest.fn(async () => ({ status: 'undetermined' })),
  launchImageLibraryAsync: jest.fn(async () => ({ canceled: true, assets: null })),
}));

jest.mock('expo-image-manipulator', () => ({
  manipulateAsync: jest.fn(async (uri: string) => ({ uri })),
  SaveFormat: { JPEG: 'jpeg', PNG: 'png', WEBP: 'webp' },
}));

jest.mock('@kingstinct/react-native-healthkit', () => ({
  WorkoutActivityType: { running: 37, 37: 'running', other: 3000, 3000: 'other' },
  isHealthDataAvailableAsync: jest.fn(async () => true),
  requestAuthorization: jest.fn(async () => true),
  queryWorkoutSamples: jest.fn(async () => []),
}));

jest.mock('react-native-health-connect', () => ({
  SdkAvailabilityStatus: {
    SDK_UNAVAILABLE: 1,
    SDK_UNAVAILABLE_PROVIDER_UPDATE_REQUIRED: 2,
    SDK_AVAILABLE: 3,
  },
  ExerciseType: { RUNNING: 56, 56: 'RUNNING', OTHER_WORKOUT: 0, 0: 'OTHER_WORKOUT' },
  getSdkStatus: jest.fn(async () => 3),
  initialize: jest.fn(async () => true),
  requestPermission: jest.fn(async () => [
    { accessType: 'read', recordType: 'ExerciseSession' },
    { accessType: 'read', recordType: 'ActiveCaloriesBurned' },
  ]),
  readRecords: jest.fn(async () => ({ records: [] })),
}));
