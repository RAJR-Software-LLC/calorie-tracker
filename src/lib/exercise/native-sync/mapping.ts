import type { ExercisePreset } from '@/types';

import type { NativeWorkoutRecord, PreparedSyncExercise } from './types';

function toSafeInt(value: number | undefined): number | undefined {
  if (typeof value !== 'number' || !Number.isFinite(value)) return undefined;
  return Math.max(0, Math.round(value));
}

export function mapNativeTypeToPresetId(args: {
  nativeType: string;
  source: NativeWorkoutRecord['source'];
  presets: ExercisePreset[];
}): string {
  const { nativeType, source, presets } = args;
  for (const preset of presets) {
    const found =
      source === 'healthkit'
        ? preset.healthKitActivityTypes.includes(nativeType)
        : preset.healthConnectExerciseTypes.includes(nativeType);
    if (found) {
      return preset.id;
    }
  }
  return 'other';
}

export function toPreparedSyncExercise(args: {
  workout: NativeWorkoutRecord;
  presets: ExercisePreset[];
}): PreparedSyncExercise | null {
  const { workout, presets } = args;
  const caloriesBurned = toSafeInt(workout.caloriesBurned);
  if (caloriesBurned === undefined || caloriesBurned < 0 || caloriesBurned > 10000) return null;
  if (!workout.externalId || !workout.externalSource) return null;

  const name = workout.name.trim();
  if (!name) return null;

  return {
    date: workout.date,
    name,
    caloriesBurned,
    presetId: mapNativeTypeToPresetId({
      nativeType: workout.nativeType,
      source: workout.source,
      presets,
    }),
    startTime: workout.startTime,
    endTime: workout.endTime,
    durationMinutes: toSafeInt(workout.durationMinutes),
    distanceMeters: toSafeInt(workout.distanceMeters),
    averageHeartRate: toSafeInt(workout.averageHeartRate),
    steps: toSafeInt(workout.steps),
    notes: workout.notes ?? null,
    source: workout.source,
    externalSource: workout.externalSource,
    externalId: workout.externalId,
  };
}
