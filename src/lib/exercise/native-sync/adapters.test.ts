/* eslint-disable import/first -- jest.mock must run before importing modules under test */
import {
  isHealthDataAvailableAsync,
  queryWorkoutSamples,
  requestAuthorization,
  WorkoutActivityType,
} from '@kingstinct/react-native-healthkit';
import { Platform } from 'react-native';
import {
  getSdkStatus,
  initialize,
  readRecords,
  requestPermission,
} from 'react-native-health-connect';

import { createHealthConnectAdapter, createHealthKitAdapter } from './adapters';

describe('native health adapters', () => {
  let platformOs: 'ios' | 'android';

  beforeEach(() => {
    jest.clearAllMocks();
    platformOs = 'ios';
    Object.defineProperty(Platform, 'OS', {
      configurable: true,
      get: () => platformOs,
    });
  });

  describe('HealthKit adapter', () => {
    beforeEach(() => {
      platformOs = 'ios';
    });

    it('uses fallback adapter in Expo Go without loading native modules', async () => {
      const executionEnvironment = jest.requireMock('expo-constants').default.executionEnvironment;
      jest.requireMock('expo-constants').default.executionEnvironment = 'storeClient';

      try {
        const adapter = createHealthKitAdapter({ lastReadAtIso: null });
        const granted = await adapter.ensurePermissions();
        expect(granted).toBe(false);
        expect(isHealthDataAvailableAsync).not.toHaveBeenCalled();
      } finally {
        jest.requireMock('expo-constants').default.executionEnvironment = executionEnvironment;
      }
    });

    it('requests workout read permission only', async () => {
      const adapter = createHealthKitAdapter({ lastReadAtIso: null });
      const granted = await adapter.ensurePermissions();

      expect(granted).toBe(true);
      expect(isHealthDataAvailableAsync).toHaveBeenCalled();
      expect(requestAuthorization).toHaveBeenCalledWith({
        toRead: ['HKWorkoutTypeIdentifier'],
      });
    });

    it('maps workouts and advances cursor from ISO timestamp', async () => {
      const startDate = new Date('2026-05-01T10:00:00.000Z');
      const endDate = new Date('2026-05-01T10:30:00.000Z');
      (queryWorkoutSamples as jest.Mock).mockResolvedValue([
        {
          uuid: 'hk-1',
          workoutActivityType: WorkoutActivityType.running,
          startDate,
          endDate,
          totalEnergyBurned: { unit: 'kcal', quantity: 250 },
          totalDistance: { unit: 'km', quantity: 5 },
        },
      ]);

      const adapter = createHealthKitAdapter({ lastReadAtIso: null });
      const result = await adapter.readWorkouts({ cursor: { value: '2026-05-01T00:00:00.000Z' } });

      expect(queryWorkoutSamples).toHaveBeenCalledWith(
        expect.objectContaining({
          limit: -1,
          filter: expect.objectContaining({
            date: expect.objectContaining({
              startDate: new Date('2026-05-01T00:00:00.000Z'),
              strictStartDate: true,
            }),
          }),
        })
      );
      expect(result.workouts).toEqual([
        expect.objectContaining({
          externalId: 'hk-1',
          externalSource: 'apple_healthkit',
          source: 'healthkit',
          name: 'Running',
          caloriesBurned: 250,
          distanceMeters: 5000,
          nativeType: 'HKWorkoutActivityTypeRunning',
        }),
      ]);
      expect(result.nextCursor?.value).toEqual(expect.any(String));
    });
  });

  describe('Health Connect adapter', () => {
    beforeEach(() => {
      platformOs = 'android';
    });

    it('initializes SDK and requests exercise + calorie read permissions', async () => {
      const adapter = createHealthConnectAdapter({ lastReadAtIso: null });
      const granted = await adapter.ensurePermissions();

      expect(granted).toBe(true);
      expect(getSdkStatus).toHaveBeenCalled();
      expect(initialize).toHaveBeenCalled();
      expect(requestPermission).toHaveBeenCalledWith([
        { accessType: 'read', recordType: 'ExerciseSession' },
        { accessType: 'read', recordType: 'ActiveCaloriesBurned' },
      ]);
    });

    it('maps exercise sessions with overlapping active calories', async () => {
      (readRecords as jest.Mock).mockImplementation(async (recordType: string) => {
        if (recordType === 'ExerciseSession') {
          return {
            records: [
              {
                startTime: '2026-05-08T10:00:00.000Z',
                endTime: '2026-05-08T10:30:00.000Z',
                exerciseType: 56,
                title: 'Morning run',
                metadata: { id: 'hc-1' },
              },
            ],
          };
        }
        return {
          records: [
            {
              startTime: '2026-05-08T10:05:00.000Z',
              endTime: '2026-05-08T10:25:00.000Z',
              energy: { inKilocalories: 180 },
            },
          ],
        };
      });

      const adapter = createHealthConnectAdapter({ lastReadAtIso: null });
      const result = await adapter.readWorkouts({ cursor: null });

      expect(result.workouts).toEqual([
        expect.objectContaining({
          externalId: 'hc-1',
          externalSource: 'health_connect',
          source: 'health_connect',
          name: 'Morning run',
          caloriesBurned: 180,
          nativeType: 'EXERCISE_TYPE_RUNNING',
        }),
      ]);
    });
  });
});
