import Constants from 'expo-constants';
import { Platform } from 'react-native';

import type { FeedbackPlatform } from '@/types';

export function getFeedbackPlatform(): FeedbackPlatform {
  if (Platform.OS === 'ios') return 'ios';
  if (Platform.OS === 'android') return 'android';
  if (Platform.OS === 'web') return 'web';
  return 'unknown';
}

/** App version string for feedback metadata (≤40 chars server-side). */
export function getFeedbackAppVersion(): string | undefined {
  const version = Constants.expoConfig?.version;
  if (typeof version !== 'string' || version.trim() === '') return undefined;
  return version.trim().slice(0, 40);
}
