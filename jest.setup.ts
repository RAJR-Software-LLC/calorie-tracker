process.env.EXPO_PUBLIC_API_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3000';

jest.mock('@react-native-async-storage/async-storage', () =>
  jest.requireActual<typeof import('@react-native-async-storage/async-storage/jest/async-storage-mock')>(
    '@react-native-async-storage/async-storage/jest/async-storage-mock'
  ).default
);

jest.mock('react-native-safe-area-context', () =>
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
