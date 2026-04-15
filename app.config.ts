import { parseProjectEnv } from '@expo/env';
import type { ExpoConfig } from 'expo/config';
import path from 'node:path';

/**
 * Prefer non-empty values from .env files over process.env. Expo's env loader does not
 * overwrite existing env vars, so empty or stale EXPO_PUBLIC_* in the shell can hide .env.
 */
const { env: fileEnv } = parseProjectEnv(path.resolve(process.cwd()), { silent: true });

function envPublic(name: string): string | undefined {
  const fromFile = fileEnv[name];
  if (typeof fromFile === 'string' && fromFile.trim() !== '') {
    return fromFile.trim();
  }
  const fromShell = process.env[name];
  if (typeof fromShell === 'string' && fromShell.trim() !== '') {
    return fromShell.trim();
  }
  return undefined;
}

const googleOAuthExtra = {
  iosClientId: envPublic('EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID'),
  androidClientId: envPublic('EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID'),
  webClientId: envPublic('EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID'),
};

const firebaseExtra = {
  apiKey: envPublic('EXPO_PUBLIC_FIREBASE_API_KEY') ?? 'placeholder',
  authDomain: envPublic('EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN') ?? 'placeholder.firebaseapp.com',
  projectId: envPublic('EXPO_PUBLIC_FIREBASE_PROJECT_ID') ?? 'placeholder',
  storageBucket: envPublic('EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET') ?? 'placeholder.appspot.com',
  messagingSenderId: envPublic('EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID') ?? '000000000000',
  appId: envPublic('EXPO_PUBLIC_FIREBASE_APP_ID') ?? '1:000000000000:web:placeholder',
};

if (
  firebaseExtra.apiKey !== 'placeholder' &&
  !firebaseExtra.appId.includes(':web:')
) {
  console.warn(
    '[app.config] EXPO_PUBLIC_FIREBASE_APP_ID must be the Web app ID (contains ":web:"). Using an iOS/Android app ID causes auth/configuration-not-found with the Firebase JS SDK.'
  );
}

const config: ExpoConfig = {
  name: 'calorie-tracker',
  slug: 'calorie-tracker',
  version: '1.0.0',
  runtimeVersion: {
    policy: 'appVersion',
  },
  orientation: 'portrait',
  owner: 'rajr-software',
  icon: './assets/images/icon.png',
  scheme: 'calorietracker',
  userInterfaceStyle: 'automatic',
  newArchEnabled: true,
  splash: {
    image: './assets/images/splash-icon.png',
    resizeMode: 'contain',
    backgroundColor: '#faf8f5',
  },
  ios: {
    bundleIdentifier: 'com.rajrsoftware.calorieTracker',
    supportsTablet: true,
    usesAppleSignIn: true,
  },
  android: {
    adaptiveIcon: {
      foregroundImage: './assets/images/adaptive-icon.png',
      backgroundColor: '#faf8f5',
    },
    edgeToEdgeEnabled: true,
    predictiveBackGestureEnabled: false,
    package: 'com.rajrsoftware.calorieTracker',
  },
  web: {
    bundler: 'metro',
    output: 'static',
    favicon: './assets/images/favicon.png',
  },
  plugins: ['expo-router', 'expo-apple-authentication', 'expo-web-browser'],
  experiments: {
    typedRoutes: true,
  },
  extra: {
    firebase: firebaseExtra,
    google: googleOAuthExtra,
    eas: {
      projectId: '436fb9c4-ab3d-4020-8a6d-126575b631f5',
    },
  },
};

export default { expo: config };
