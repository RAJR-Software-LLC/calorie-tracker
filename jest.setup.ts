process.env.EXPO_PUBLIC_API_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3000';

jest.mock(
  '@react-native-async-storage/async-storage',
  () =>
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
    default: {
      expoConfig: {
        version: '1.0.0',
        extra: { eas: { projectId: 'jest-project-id' } },
      },
    },
  }),
  { virtual: true }
);

jest.mock('@react-native-community/datetimepicker', () => 'DateTimePicker');
