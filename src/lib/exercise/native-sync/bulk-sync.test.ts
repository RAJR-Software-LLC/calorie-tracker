/* eslint-disable import/first -- jest.mock must run before importing modules under test */
jest.mock('@/lib/api', () => ({
  postExerciseBulk: jest.fn(),
  getExerciseSyncState: jest.fn(),
  putExerciseSyncState: jest.fn(),
}));

import AsyncStorage from '@react-native-async-storage/async-storage';

import { getExerciseSyncState, postExerciseBulk, putExerciseSyncState } from '@/lib/api';
import { ApiError } from '@/lib/api/errors';
import { ExerciseTrackingDisabledError, syncNativeHealthAdapter } from './orchestrator';

describe('native sync bulk orchestration', () => {
  beforeEach(async () => {
    jest.resetAllMocks();
    await AsyncStorage.clear();
    (getExerciseSyncState as jest.Mock).mockResolvedValue({
      lastSuccessfulSyncAt: null,
      lastAttemptAt: null,
      lastError: null,
      platforms: {},
    });
    (putExerciseSyncState as jest.Mock).mockResolvedValue(undefined);
    (postExerciseBulk as jest.Mock).mockResolvedValue({
      created: 0,
      updated: 0,
      skipped: 0,
      items: [],
    });
  });

  it('chunks batches to at most 100 and advances sync-state only after success', async () => {
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
          nextCursor: { value: '2026-05-08T12:00:00.000Z' },
        }),
      },
    });

    expect((postExerciseBulk as jest.Mock).mock.calls).toHaveLength(3);
    for (const call of (postExerciseBulk as jest.Mock).mock.calls) {
      expect(call[0].exercises.length).toBeLessThanOrEqual(100);
    }

    const putBodies = (putExerciseSyncState as jest.Mock).mock.calls.map((call) => call[0]);
    expect(putBodies.some((body) => body.lastAttemptAt && !body.lastSuccessfulSyncAt)).toBe(true);
    expect(
      putBodies.some(
        (body) =>
          body.lastSuccessfulSyncAt &&
          body.lastError === null &&
          body.platforms?.health_connect?.cursor === '2026-05-08T12:00:00.000Z'
      )
    ).toBe(true);
  });

  it('does not advance cursor when a bulk chunk fails', async () => {
    (postExerciseBulk as jest.Mock).mockRejectedValue(new ApiError(400, 'Bad request'));

    await expect(
      syncNativeHealthAdapter({
        presets: [],
        adapter: {
          source: 'healthkit',
          ensurePermissions: async () => true,
          readWorkouts: async () => ({
            workouts: [
              {
                externalId: 'a',
                externalSource: 'apple_healthkit',
                source: 'healthkit',
                date: '2026-05-08',
                name: 'Run',
                caloriesBurned: 100,
                nativeType: 'HKWorkoutActivityTypeRunning',
              },
            ],
            nextCursor: { value: 'next' },
          }),
        },
      })
    ).rejects.toBeInstanceOf(ApiError);

    const putBodies = (putExerciseSyncState as jest.Mock).mock.calls.map((call) => call[0]);
    expect(putBodies.some((body) => body.lastSuccessfulSyncAt)).toBe(false);
    expect(putBodies.some((body) => typeof body.lastError === 'string')).toBe(true);
  });

  it('aborts on 403 exercise disabled', async () => {
    (putExerciseSyncState as jest.Mock).mockRejectedValueOnce(
      new ApiError(403, 'Exercise tracking is disabled')
    );

    await expect(
      syncNativeHealthAdapter({
        presets: [],
        adapter: {
          source: 'healthkit',
          ensurePermissions: async () => true,
          readWorkouts: async () => ({ workouts: [], nextCursor: { value: 'x' } }),
        },
      })
    ).rejects.toBeInstanceOf(ExerciseTrackingDisabledError);

    expect(postExerciseBulk).not.toHaveBeenCalled();
  });
});
