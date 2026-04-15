import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { getApps, initializeApp, type FirebaseApp, type FirebaseOptions } from 'firebase/app';
import { getAuth, getReactNativePersistence, initializeAuth, type Auth } from 'firebase/auth';
import { Platform } from 'react-native';

type Extra = {
  firebase?: FirebaseOptions;
  mockFirebaseIdToken?: string;
};

function readExtra(): Extra {
  return (Constants.expoConfig?.extra ?? {}) as Extra;
}

function shouldInitializeRealFirebase(
  options: FirebaseOptions | undefined
): options is FirebaseOptions {
  if (!options?.apiKey) return false;
  return options.apiKey !== 'placeholder';
}

let cachedApp: FirebaseApp | null = null;

/**
 * Returns a Firebase app when non-placeholder config is provided; otherwise null (mock / not configured).
 */
export function getFirebaseApp(): FirebaseApp | null {
  const { firebase } = readExtra();
  if (!shouldInitializeRealFirebase(firebase)) {
    return null;
  }
  if (!getApps().length) {
    if (process.env.NODE_ENV !== 'production') {
      const { projectId, appId, apiKey } = firebase;
      const webAppId = appId?.includes(':web:') ?? false;
      const suffix = webAppId
        ? ''
        : ' — expected Web appId containing ":web:" for Firebase JS Auth';
      console.log(
        `[Firebase] init projectId=${projectId} appId=${appId?.slice(0, 24)}… apiKey=${apiKey?.slice(0, 8)}…${suffix}`
      );
    }
    cachedApp = initializeApp(firebase);
  }
  return cachedApp ?? getApps()[0] ?? null;
}

function getOrInitAuth(app: FirebaseApp): Auth {
  if (Platform.OS === 'web') {
    return getAuth(app);
  }
  try {
    return initializeAuth(app, {
      persistence: getReactNativePersistence(AsyncStorage),
    });
  } catch {
    return getAuth(app);
  }
}

export function getFirebaseAuth(): Auth | null {
  const app = getFirebaseApp();
  if (!app) return null;
  return getOrInitAuth(app);
}

export type GetFirebaseIdTokenOptions = {
  /** Pass true to bypass the SDK cache (e.g. after a 401 from the API). */
  forceRefresh?: boolean;
};

/**
 * ID token for `Authorization: Bearer` against the calorie-tracker backend.
 * When someone is signed in, always uses their ID token. Mock env values apply only
 * when there is no `currentUser` (API testing without the Auth UI).
 */
export async function getFirebaseIdTokenForApi(
  options?: GetFirebaseIdTokenOptions
): Promise<string | null> {
  const forceRefresh = options?.forceRefresh ?? false;

  const auth = getFirebaseAuth();
  const user = auth?.currentUser;
  if (user) {
    return user.getIdToken(forceRefresh);
  }

  const fromProcess = process.env.EXPO_PUBLIC_MOCK_ID_TOKEN;
  if (fromProcess) return fromProcess;

  const { mockFirebaseIdToken } = readExtra();
  if (mockFirebaseIdToken) return mockFirebaseIdToken;

  return null;
}
