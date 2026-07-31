import {
  isHealthDataAvailableAsync,
  queryWorkoutSamples,
  requestAuthorization,
  WorkoutActivityType,
} from '@kingstinct/react-native-healthkit';

import { formatHealthKitWorkoutName, toHealthKitActivityTypeName } from './native-type-mapping.ios';
import type { NativeHealthAdapter, NativeSyncCursor, NativeWorkoutRecord } from './types';

type AdapterState = {
  lastReadAtIso: string | null;
};

const DEFAULT_LOOKBACK_DAYS = 90;
const HEALTHKIT_WORKOUT_READ = 'HKWorkoutTypeIdentifier' as const;

function todayDateStringFromIso(iso: string): string {
  return new Date(iso).toISOString().slice(0, 10);
}

function lookbackStartDate(lookbackDays: number): Date {
  const start = new Date();
  start.setDate(start.getDate() - lookbackDays);
  return start;
}

function resolveSyncStartDate(
  cursor: NativeSyncCursor | null,
  lookbackDays: number = DEFAULT_LOOKBACK_DAYS
): Date {
  if (cursor?.value) {
    const parsed = new Date(cursor.value);
    if (!Number.isNaN(parsed.getTime())) return parsed;
  }
  return lookbackStartDate(lookbackDays);
}

function energyToKcal(energy?: { unit: string; quantity: number }): number | undefined {
  if (!energy) return undefined;
  const normalized = energy.unit.toLowerCase();
  if (normalized === 'kcal' || normalized === 'cal') return energy.quantity;
  if (normalized === 'kj') return energy.quantity / 4.184;
  if (normalized === 'j') return energy.quantity / 4184;
  return energy.quantity;
}

function distanceToMeters(distance?: { unit: string; quantity: number }): number | undefined {
  if (!distance) return undefined;
  const normalized = distance.unit.toLowerCase();
  if (normalized === 'm') return Math.round(distance.quantity);
  if (normalized === 'km') return Math.round(distance.quantity * 1000);
  if (normalized === 'mi' || normalized === 'mile') return Math.round(distance.quantity * 1609.34);
  return Math.round(distance.quantity);
}

function durationMinutesFromDates(start: Date, end: Date): number {
  return Math.max(0, Math.round((end.getTime() - start.getTime()) / 60000));
}

function mapHealthKitWorkout(workout: {
  uuid: string;
  workoutActivityType: WorkoutActivityType;
  startDate: Date;
  endDate: Date;
  totalEnergyBurned?: { unit: string; quantity: number };
  totalDistance?: { unit: string; quantity: number };
}): NativeWorkoutRecord {
  const startIso = workout.startDate.toISOString();
  const endIso = workout.endDate.toISOString();
  const energyKcal = energyToKcal(workout.totalEnergyBurned);
  return {
    externalId: workout.uuid,
    externalSource: 'apple_healthkit',
    source: 'healthkit',
    date: todayDateStringFromIso(startIso),
    name: formatHealthKitWorkoutName(workout.workoutActivityType),
    caloriesBurned: energyKcal === undefined ? undefined : Math.round(energyKcal),
    startTime: startIso,
    endTime: endIso,
    durationMinutes: durationMinutesFromDates(workout.startDate, workout.endDate),
    distanceMeters: distanceToMeters(workout.totalDistance),
    nativeType: toHealthKitActivityTypeName(workout.workoutActivityType),
  };
}

async function ensureHealthKitPermissions(): Promise<boolean> {
  const available = await isHealthDataAvailableAsync();
  if (!available) return false;
  return requestAuthorization({ toRead: [HEALTHKIT_WORKOUT_READ] });
}

async function readHealthKitWorkouts(args: {
  cursor: NativeSyncCursor | null;
  lookbackDays?: number;
}): Promise<{ workouts: NativeWorkoutRecord[]; nextCursor: NativeSyncCursor }> {
  const endDate = new Date();
  const startDate = resolveSyncStartDate(args.cursor, args.lookbackDays ?? DEFAULT_LOOKBACK_DAYS);
  const samples = await queryWorkoutSamples({
    limit: -1,
    ascending: true,
    filter: {
      date: {
        startDate,
        endDate,
        strictStartDate: args.cursor != null,
      },
    },
  });

  const workouts = samples.map(mapHealthKitWorkout);
  return {
    workouts,
    nextCursor: { value: endDate.toISOString() },
  };
}

export function createHealthKitAdapterNative(_state: AdapterState): NativeHealthAdapter {
  return {
    source: 'healthkit',
    ensurePermissions: ensureHealthKitPermissions,
    readWorkouts: readHealthKitWorkouts,
  };
}
