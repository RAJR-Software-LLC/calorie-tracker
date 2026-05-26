import Constants, { ExecutionEnvironment } from 'expo-constants';
import { Platform } from 'react-native';

export const NATIVE_SYNC_REQUIRES_DEV_CLIENT_MESSAGE =
  'Native health sync requires a development or production build. It is not available in Expo Go.';

export function isExpoGo(): boolean {
  return Constants.executionEnvironment === ExecutionEnvironment.StoreClient;
}

/** True when HealthKit / Health Connect native modules can be loaded (not Expo Go). */
export function isNativeHealthSyncSupported(): boolean {
  if (isExpoGo()) return false;
  return Platform.OS === 'ios' || Platform.OS === 'android';
}
