import {
  getSdkStatus,
  initialize,
  readRecords,
  requestPermission,
  SdkAvailabilityStatus,
} from 'react-native-health-connect';

import {
  formatHealthConnectExerciseName,
  toHealthConnectExerciseTypeName,
} from './native-type-mapping.android';
import type { NativeHealthAdapter, NativeSyncCursor, NativeWorkoutRecord } from './types';

type AdapterState = {
  lastReadAtIso: string | null;
};

const DEFAULT_LOOKBACK_DAYS = 90;

const HEALTH_CONNECT_READ_PERMISSIONS = [
  { accessType: 'read' as const, recordType: 'ExerciseSession' as const },
  { accessType: 'read' as const, recordType: 'ActiveCaloriesBurned' as const },
];

function todayDateStringFromIso(iso: string): string {
  return new Date(iso).toISOString().slice(0, 10);
}

function defaultSyncStartDate(): Date {
  const start = new Date();
  start.setDate(start.getDate() - DEFAULT_LOOKBACK_DAYS);
  return start;
}

function resolveSyncStartDate(cursor: NativeSyncCursor | null): Date {
  if (cursor?.value) {
    const parsed = new Date(cursor.value);
    if (!Number.isNaN(parsed.getTime())) return parsed;
  }
  return defaultSyncStartDate();
}

function durationMinutesFromDates(start: Date, end: Date): number {
  return Math.max(0, Math.round((end.getTime() - start.getTime()) / 60000));
}

function recordsOverlap(
  aStart: string,
  aEnd: string,
  bStart: string,
  bEnd: string
): boolean {
  return aStart < bEnd && bStart < aEnd;
}

function sumActiveCaloriesForSession(args: {
  startTime: string;
  endTime: string;
  records: Array<{ startTime: string; endTime: string; energy: { inKilocalories: number } }>;
}): number {
  let total = 0;
  for (const record of args.records) {
    if (recordsOverlap(args.startTime, args.endTime, record.startTime, record.endTime)) {
      total += record.energy.inKilocalories;
    }
  }
  return Math.max(0, Math.round(total));
}

function mapHealthConnectSession(args: {
  session: {
    startTime: string;
    endTime: string;
    exerciseType: number;
    title?: string;
    notes?: string;
    metadata?: { id?: string };
  };
  activeCalories: Array<{ startTime: string; endTime: string; energy: { inKilocalories: number } }>;
}): NativeWorkoutRecord | null {
  const { session, activeCalories } = args;
  const externalId = session.metadata?.id;
  if (!externalId) return null;

  const caloriesBurned = sumActiveCaloriesForSession({
    startTime: session.startTime,
    endTime: session.endTime,
    records: activeCalories,
  });

  return {
    externalId,
    externalSource: 'health_connect',
    source: 'health_connect',
    date: todayDateStringFromIso(session.startTime),
    name: formatHealthConnectExerciseName(session.exerciseType, session.title),
    caloriesBurned,
    startTime: session.startTime,
    endTime: session.endTime,
    durationMinutes: durationMinutesFromDates(
      new Date(session.startTime),
      new Date(session.endTime)
    ),
    notes: session.notes ?? null,
    nativeType: toHealthConnectExerciseTypeName(session.exerciseType),
  };
}

async function ensureHealthConnectPermissions(): Promise<boolean> {
  const sdkStatus = await getSdkStatus();
  if (sdkStatus !== SdkAvailabilityStatus.SDK_AVAILABLE) {
    return false;
  }

  const initialized = await initialize();
  if (!initialized) return false;

  const granted = await requestPermission(HEALTH_CONNECT_READ_PERMISSIONS);
  return HEALTH_CONNECT_READ_PERMISSIONS.every((required) =>
    granted.some(
      (permission) =>
        permission.accessType === required.accessType &&
        permission.recordType === required.recordType
    )
  );
}

async function readHealthConnectWorkouts(args: {
  cursor: NativeSyncCursor | null;
}): Promise<{ workouts: NativeWorkoutRecord[]; nextCursor: NativeSyncCursor }> {
  const endTime = new Date().toISOString();
  const startTime = resolveSyncStartDate(args.cursor).toISOString();
  const timeRangeFilter = {
    operator: 'between' as const,
    startTime,
    endTime,
  };

  const [sessionsResult, caloriesResult] = await Promise.all([
    readRecords('ExerciseSession', { timeRangeFilter, ascendingOrder: true }),
    readRecords('ActiveCaloriesBurned', { timeRangeFilter, ascendingOrder: true }),
  ]);

  const activeCalories = caloriesResult.records.map((record) => ({
    startTime: record.startTime,
    endTime: record.endTime,
    energy: record.energy,
  }));

  const workouts = sessionsResult.records
    .map((session) => mapHealthConnectSession({ session, activeCalories }))
    .filter((workout): workout is NativeWorkoutRecord => workout != null);

  return {
    workouts,
    nextCursor: { value: endTime },
  };
}

export function createHealthConnectAdapterNative(_state: AdapterState): NativeHealthAdapter {
  return {
    source: 'health_connect',
    ensurePermissions: ensureHealthConnectPermissions,
    readWorkouts: readHealthConnectWorkouts,
  };
}
