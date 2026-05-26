import { Platform } from 'react-native';

import { getApiPrivacyPolicyUrl } from '@/lib/env';

import type { NativeHealthAdapter, NativeWorkoutRecord } from './types';

type AdapterState = {
  lastReadAtIso: string | null;
};

function todayDateStringFromIso(iso: string): string {
  return new Date(iso).toISOString().slice(0, 10);
}

/**
 * Default placeholder adapters so the sync pipeline is operational and testable.
 * Replace these implementations with concrete SDK bindings when integrating
 * HealthKit / Health Connect providers.
 */
export function createHealthKitAdapter(state: AdapterState): NativeHealthAdapter {
  return {
    source: 'healthkit',
    async ensurePermissions(): Promise<boolean> {
      return Platform.OS === 'ios';
    },
    async readWorkouts() {
      const workouts: NativeWorkoutRecord[] = [];
      return {
        workouts,
        nextCursor: { value: state.lastReadAtIso ?? new Date().toISOString() },
      };
    },
  };
}

export function createHealthConnectAdapter(state: AdapterState): NativeHealthAdapter {
  return {
    source: 'health_connect',
    async ensurePermissions(): Promise<boolean> {
      return Platform.OS === 'android';
    },
    async readWorkouts() {
      const nowIso = new Date().toISOString();
      const workouts: NativeWorkoutRecord[] = [];
      return {
        workouts,
        nextCursor: { value: state.lastReadAtIso ?? nowIso },
      };
    },
  };
}

export function getNativeSyncPrivacyPolicyUrl(): string {
  return getApiPrivacyPolicyUrl();
}

export function getMockManualWorkoutForTesting(externalId: string): NativeWorkoutRecord {
  const now = new Date().toISOString();
  return {
    externalId,
    externalSource: Platform.OS === 'ios' ? 'apple_healthkit' : 'health_connect',
    source: Platform.OS === 'ios' ? 'healthkit' : 'health_connect',
    date: todayDateStringFromIso(now),
    name: 'Sample workout',
    caloriesBurned: 100,
    nativeType: Platform.OS === 'ios' ? 'HKWorkoutActivityTypeRunning' : 'EXERCISE_TYPE_RUNNING',
  };
}
