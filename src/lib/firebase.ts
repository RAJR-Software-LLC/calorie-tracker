import Constants from 'expo-constants';
import { getApps, initializeApp, type FirebaseApp, type FirebaseOptions } from 'firebase/app';
import { getAuth, type Auth } from 'firebase/auth';

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
    cachedApp = initializeApp(firebase);
  }
  return cachedApp ?? getApps()[0] ?? null;
}

export function getFirebaseAuth(): Auth | null {
  const app = getFirebaseApp();
  if (!app) return null;
  return getAuth(app);
}

/**
 * ID token for `Authorization: Bearer` against the calorie-tracker backend.
 * Priority: EXPO_PUBLIC_MOCK_ID_TOKEN → extra.mockFirebaseIdToken → current Firebase user token.
 */
export async function getFirebaseIdTokenForApi(): Promise<string | null> {
  const fromProcess = process.env.EXPO_PUBLIC_MOCK_ID_TOKEN;
  if (fromProcess) return fromProcess;

  const { mockFirebaseIdToken } = readExtra();
  if (mockFirebaseIdToken) return mockFirebaseIdToken;

  const auth = getFirebaseAuth();
  const user = auth?.currentUser;
  if (!user) return null;
  return user.getIdToken();
}
