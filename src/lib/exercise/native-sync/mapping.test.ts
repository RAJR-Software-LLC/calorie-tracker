import type { ExercisePreset } from '@/types';

import { mapNativeTypeToPresetId, toPreparedSyncExercise } from './mapping';

describe('native sync mapping', () => {
  const presets: ExercisePreset[] = [
    {
      id: 'running',
      displayName: 'Running',
      category: 'cardio',
      defaultIntensity: 'high',
      metValue: 9.8,
      iconKey: 'running',
      searchKeywords: ['run'],
      healthKitActivityTypes: ['HKWorkoutActivityTypeRunning'],
      healthConnectExerciseTypes: ['EXERCISE_TYPE_RUNNING'],
      googleFitActivityTypes: ['running'],
    },
  ];

  it('maps known native workout types', () => {
    expect(
      mapNativeTypeToPresetId({
        nativeType: 'HKWorkoutActivityTypeRunning',
        source: 'healthkit',
        presets,
      })
    ).toBe('running');
  });

  it('falls back to other for unknown types', () => {
    expect(
      mapNativeTypeToPresetId({
        nativeType: 'UNKNOWN_ACTIVITY',
        source: 'health_connect',
        presets,
      })
    ).toBe('other');
  });

  it('builds sync payload with strict external identity', () => {
    const payload = toPreparedSyncExercise({
      presets,
      workout: {
        externalId: 'native-1',
        externalSource: 'apple_healthkit',
        source: 'healthkit',
        date: '2026-05-08',
        name: 'Morning run',
        caloriesBurned: 342,
        nativeType: 'HKWorkoutActivityTypeRunning',
      },
    });
    expect(payload?.externalId).toBe('native-1');
    expect(payload?.presetId).toBe('running');
    expect(payload?.caloriesBurned).toBe(342);
  });
});
