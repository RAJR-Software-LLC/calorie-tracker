import type { DateString, PostExerciseBody } from '@/types';

export type NativeSyncPlatform = 'ios' | 'android';

export type NativeSyncSource = 'healthkit' | 'health_connect';

export interface NativeWorkoutRecord {
  externalId: string;
  externalSource: 'apple_healthkit' | 'health_connect';
  source: NativeSyncSource;
  date: DateString;
  name: string;
  caloriesBurned: number;
  startTime?: string;
  endTime?: string;
  durationMinutes?: number;
  distanceMeters?: number;
  averageHeartRate?: number;
  steps?: number;
  notes?: string | null;
  nativeType: string;
}

export interface NativeSyncCursor {
  value: string;
}

export interface NativeHealthAdapter {
  source: NativeSyncSource;
  ensurePermissions(): Promise<boolean>;
  readWorkouts(args: { cursor: NativeSyncCursor | null }): Promise<{
    workouts: NativeWorkoutRecord[];
    nextCursor: NativeSyncCursor | null;
  }>;
}

export interface PreparedSyncExercise extends PostExerciseBody {
  externalSource: 'apple_healthkit' | 'health_connect';
  externalId: string;
  source: NativeSyncSource;
}
