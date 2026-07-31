import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Crypto from 'expo-crypto';

import { getExerciseSyncState, putExerciseSyncState } from '@/lib/api';
import type {
  ExerciseExternalSource,
  ExerciseSyncStateDocument,
  PutExerciseSyncStateBody,
} from '@/types';

import type { NativeSyncCursor, NativeSyncSource } from './types';

const CURSOR_KEY_PREFIX = 'exerciseNativeSyncCursor';
const DEVICE_ID_KEY = 'exerciseNativeSyncDeviceId';

export function nativeSourceToExternalSource(source: NativeSyncSource): ExerciseExternalSource {
  return source === 'healthkit' ? 'apple_healthkit' : 'health_connect';
}

function cursorKey(source: NativeSyncSource): string {
  return `${CURSOR_KEY_PREFIX}:${source}`;
}

export async function readLocalCursor(source: NativeSyncSource): Promise<NativeSyncCursor | null> {
  const raw = await AsyncStorage.getItem(cursorKey(source));
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as { value?: unknown };
    if (!parsed || typeof parsed.value !== 'string') return null;
    return { value: parsed.value };
  } catch {
    return null;
  }
}

export async function writeLocalCursor(
  source: NativeSyncSource,
  cursor: NativeSyncCursor | null
): Promise<void> {
  if (!cursor) {
    await AsyncStorage.removeItem(cursorKey(source));
    return;
  }
  await AsyncStorage.setItem(cursorKey(source), JSON.stringify(cursor));
}

export async function getStableDeviceId(): Promise<string> {
  const existing = await AsyncStorage.getItem(DEVICE_ID_KEY);
  if (existing && existing.length > 0) return existing;
  const generated = Crypto.randomUUID();
  await AsyncStorage.setItem(DEVICE_ID_KEY, generated);
  return generated;
}

/**
 * Prefer server platform cursor; fall back to local AsyncStorage (pre-migration installs).
 * Hydrates local cache when server has a cursor.
 */
export async function resolveSyncCursor(args: {
  source: NativeSyncSource;
  serverState: ExerciseSyncStateDocument;
}): Promise<NativeSyncCursor | null> {
  const external = nativeSourceToExternalSource(args.source);
  const platform = args.serverState.platforms?.[external];
  if (typeof platform?.cursor === 'string' && platform.cursor.length > 0) {
    const cursor = { value: platform.cursor };
    await writeLocalCursor(args.source, cursor);
    return cursor;
  }

  return readLocalCursor(args.source);
}

export async function hydrateExerciseSyncState(): Promise<ExerciseSyncStateDocument> {
  const state = await getExerciseSyncState();
  for (const source of ['healthkit', 'health_connect'] as const) {
    const external = nativeSourceToExternalSource(source);
    const cursor = state.platforms?.[external]?.cursor;
    if (typeof cursor === 'string' && cursor.length > 0) {
      await writeLocalCursor(source, { value: cursor });
    }
  }
  return state;
}

export async function markSyncAttempt(): Promise<string> {
  const lastAttemptAt = new Date().toISOString();
  await putExerciseSyncState({ lastAttemptAt });
  return lastAttemptAt;
}

export async function markSyncFailure(errorMessage: string): Promise<void> {
  await putExerciseSyncState({
    lastAttemptAt: new Date().toISOString(),
    lastError: errorMessage.slice(0, 500),
  });
}

export async function markSyncSuccess(args: {
  source: NativeSyncSource;
  cursor: NativeSyncCursor;
}): Promise<void> {
  const now = new Date().toISOString();
  const deviceId = await getStableDeviceId();
  const external = nativeSourceToExternalSource(args.source);
  const body: PutExerciseSyncStateBody = {
    lastSuccessfulSyncAt: now,
    lastAttemptAt: now,
    lastError: null,
    platforms: {
      [external]: {
        lastSyncedAt: now,
        cursor: args.cursor.value,
        deviceId,
      },
    },
  };
  await putExerciseSyncState(body);
  await writeLocalCursor(args.source, args.cursor);
}
