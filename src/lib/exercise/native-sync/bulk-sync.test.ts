/* eslint-disable import/first -- jest.mock must run before importing modules under test */
jest.mock('@/lib/api', () => ({
  postExerciseBulk: jest.fn(),
}));

import AsyncStorage from '@react-native-async-storage/async-storage';

import { postExerciseBulk } from '@/lib/api';
import { syncNativeHealthAdapter } from './orchestrator';

describe('native sync bulk orchestration', () => {
  beforeEach(async () => {
    jest.resetAllMocks();
    await AsyncStorage.clear();
  });

  it('chunks batches to at most 100', async () => {
    (postExerciseBulk as jest.Mock).mockResolvedValue({
      created: 0,
      updated: 0,
      skipped: 0,
      items: [],
    });

    const workouts = Array.from({ length: 201 }).map((_, index) => ({
      externalId: `ext-${index}`,
      externalSource: 'health_connect' as const,
      source: 'health_connect' as const,
      date: '2026-05-08',
      name: `Run ${index}`,
      caloriesBurned: 100,
      nativeType: 'EXERCISE_TYPE_RUNNING',
    }));

    await syncNativeHealthAdapter({
      presets: [
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
      ],
      adapter: {
        source: 'health_connect',
        ensurePermissions: async () => true,
        readWorkouts: async () => ({
          workouts,
          nextCursor: { value: 'next' },
        }),
      },
    });

    expect((postExerciseBulk as jest.Mock).mock.calls).toHaveLength(3);
    for (const call of (postExerciseBulk as jest.Mock).mock.calls) {
      expect(call[0].exercises.length).toBeLessThanOrEqual(100);
    }
  });
});
