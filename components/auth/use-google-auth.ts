import Constants from 'expo-constants';
import * as Google from 'expo-auth-session/providers/google';
import * as WebBrowser from 'expo-web-browser';
import { Platform } from 'react-native';

WebBrowser.maybeCompleteAuthSession();

type ExtraWithGoogle = {
  google?: {
    iosClientId?: string;
    androidClientId?: string;
    webClientId?: string;
  };
};

function trim(value: string | undefined): string | undefined {
  const t = value?.trim();
  return t ? t : undefined;
}

function readGoogleClientIds(): { ios?: string; android?: string; web?: string } {
  // Prefer app config `extra.google` (dev manifest / prebuild) over `process.env`.
  // In dev, Metro’s `process.env` polyfill only includes EXPO_PUBLIC_* keys that existed when the
  // bundle was serialized; after editing .env, `extra` from app.config is often correct first.
  const extra = (Constants.expoConfig?.extra ?? {}) as ExtraWithGoogle;
  const g = extra.google;
  return {
    ios: trim(g?.iosClientId) ?? trim(process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID),
    android: trim(g?.androidClientId) ?? trim(process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID),
    web: trim(g?.webClientId) ?? trim(process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID),
  };
}

/** True when the Google client ID required for the current platform is set. */
export function isGoogleAuthConfigured(): boolean {
  const { ios, android, web } = readGoogleClientIds();
  if (Platform.OS === 'web') return Boolean(web);
  if (Platform.OS === 'ios') return Boolean(ios);
  if (Platform.OS === 'android') return Boolean(android);
  return Boolean(web);
}

/**
 * Call only when `isGoogleAuthConfigured()` is true (e.g. from a child component),
 * otherwise iOS throws: `iosClientId` must be defined.
 */
export function useGoogleIdTokenAuthRequest() {
  const { ios, android, web } = readGoogleClientIds();

  const [request, response, promptAsync] = Google.useIdTokenAuthRequest({
    iosClientId: ios,
    androidClientId: android,
    webClientId: web,
  });

  const platformId =
    Platform.OS === 'web' ? web : Platform.OS === 'ios' ? ios : android;
  const ready = Boolean(request && platformId);

  return { request, response, promptAsync, ready };
}
