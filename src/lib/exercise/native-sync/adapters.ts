import { Platform } from 'react-native';

import { getApiPrivacyPolicyUrl } from '@/lib/env';

import {
  createFallbackHealthConnectAdapter,
  createFallbackHealthKitAdapter,
  getMockManualWorkoutForTesting,
} from './adapters-fallback';
import { isNativeHealthSyncSupported } from './runtime';
import type { NativeHealthAdapter } from './types';

type AdapterState = {
  lastReadAtIso: string | null;
};

export function createHealthKitAdapter(state: AdapterState): NativeHealthAdapter {
  if (!isNativeHealthSyncSupported() || Platform.OS !== 'ios') {
    return createFallbackHealthKitAdapter(state);
  }

  // Lazy load native module so Expo Go does not evaluate NitroModules at import time.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { createHealthKitAdapterNative } =
    require('./adapters-healthkit.native.ios') as typeof import('./adapters-healthkit.native.ios');
  return createHealthKitAdapterNative(state);
}

export function createHealthConnectAdapter(state: AdapterState): NativeHealthAdapter {
  if (!isNativeHealthSyncSupported() || Platform.OS !== 'android') {
    return createFallbackHealthConnectAdapter(state);
  }

  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { createHealthConnectAdapterNative } =
    require('./adapters-healthconnect.native.android') as typeof import('./adapters-healthconnect.native.android');
  return createHealthConnectAdapterNative(state);
}

export function getNativeSyncPrivacyPolicyUrl(): string {
  return getApiPrivacyPolicyUrl();
}

export { getMockManualWorkoutForTesting };
