import { Platform } from 'react-native';

import type { NativeHealthAdapter, NativeSyncCursor, NativeWorkoutRecord } from './types';

type AdapterState = {
  lastReadAtIso: string | null;
};

function todayDateStringFromIso(iso: string): string {
  return new Date(iso).toISOString().slice(0, 10);
}

function createEmptyReadAdapter(source: 'healthkit' | 'health_connect'): NativeHealthAdapter {
  return {
    source,
    async ensurePermissions(): Promise<boolean> {
      return false;
    },
    async readWorkouts(_args: { cursor: NativeSyncCursor | null }): Promise<{
      workouts: NativeWorkoutRecord[];
      nextCursor: NativeSyncCursor;
    }> {
      const nowIso = new Date().toISOString();
      return {
        workouts: [],
        nextCursor: { value: nowIso },
      };
    },
  };
}

export function createFallbackHealthKitAdapter(_state: AdapterState): NativeHealthAdapter {
  return createEmptyReadAdapter('healthkit');
}

export function createFallbackHealthConnectAdapter(_state: AdapterState): NativeHealthAdapter {
  return createEmptyReadAdapter('health_connect');
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
