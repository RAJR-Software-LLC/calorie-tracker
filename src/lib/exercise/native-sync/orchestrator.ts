import AsyncStorage from '@react-native-async-storage/async-storage';

import { postExerciseBulk } from '@/lib/api';
import { ApiError } from '@/lib/api/errors';
import type { ExercisePreset } from '@/types';

import { toPreparedSyncExercise } from './mapping';
import type { NativeHealthAdapter, NativeSyncCursor, PreparedSyncExercise } from './types';

const CURSOR_KEY_PREFIX = 'exerciseNativeSyncCursor';
const MAX_BULK_SIZE = 100;
const MAX_RETRIES = 4;

function cursorKey(source: string): string {
  return `${CURSOR_KEY_PREFIX}:${source}`;
}

async function readCursor(source: string): Promise<NativeSyncCursor | null> {
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

async function writeCursor(source: string, cursor: NativeSyncCursor | null): Promise<void> {
  if (!cursor) return;
  await AsyncStorage.setItem(cursorKey(source), JSON.stringify(cursor));
}

function chunk<T>(items: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let index = 0; index < items.length; index += size) {
    out.push(items.slice(index, index + size));
  }
  return out;
}

function parseRetryAfterSeconds(error: unknown): number | null {
  if (!(error instanceof ApiError)) return null;
  const body = error.body;
  if (!body || typeof body !== 'object') return null;
  const retryAfter = (body as Record<string, unknown>)['retryAfter'];
  if (typeof retryAfter === 'number' && Number.isFinite(retryAfter) && retryAfter >= 0) {
    return retryAfter;
  }
  return null;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

async function uploadChunkWithRetry(exercises: PreparedSyncExercise[]): Promise<void> {
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt += 1) {
    try {
      await postExerciseBulk({ exercises });
      return;
    } catch (error) {
      if (!(error instanceof ApiError) || (error.status !== 429 && error.status < 500)) {
        throw error;
      }
      if (attempt === MAX_RETRIES) throw error;

      const retryAfterSeconds = parseRetryAfterSeconds(error);
      const exponential = Math.min(2 ** attempt * 500, 8000);
      const jitter = Math.floor(Math.random() * 400);
      const delayMs =
        retryAfterSeconds != null ? Math.max(retryAfterSeconds * 1000, exponential) : exponential;
      await sleep(delayMs + jitter);
    }
  }
}

function dedupeByExternalIdentity(items: PreparedSyncExercise[]): PreparedSyncExercise[] {
  const seen = new Set<string>();
  const out: PreparedSyncExercise[] = [];
  for (const item of items) {
    const key = `${item.externalSource}:${item.externalId}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(item);
  }
  return out;
}

export interface SyncNativeHealthResult {
  source: string;
  pulled: number;
  prepared: number;
  uploaded: number;
}

export async function syncNativeHealthAdapter(args: {
  adapter: NativeHealthAdapter;
  presets: ExercisePreset[];
}): Promise<SyncNativeHealthResult> {
  const { adapter, presets } = args;
  const granted = await adapter.ensurePermissions();
  if (!granted) {
    throw new Error(`Permissions not granted for ${adapter.source}`);
  }

  const cursor = await readCursor(adapter.source);
  const { workouts, nextCursor } = await adapter.readWorkouts({ cursor });
  const prepared = workouts
    .map((workout) => toPreparedSyncExercise({ workout, presets }))
    .filter((item): item is PreparedSyncExercise => item != null);
  const deduped = dedupeByExternalIdentity(prepared);
  const chunks = chunk(deduped, MAX_BULK_SIZE);

  for (const nextChunk of chunks) {
    await uploadChunkWithRetry(nextChunk);
  }

  await writeCursor(adapter.source, nextCursor);
  return {
    source: adapter.source,
    pulled: workouts.length,
    prepared: deduped.length,
    uploaded: deduped.length,
  };
}
