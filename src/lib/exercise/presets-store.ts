import AsyncStorage from '@react-native-async-storage/async-storage';

import { getExercisePresets } from '@/lib/api';
import type { ExercisePreset, GetExercisePresetsResponse } from '@/types';

const PRESETS_CACHE_KEY = 'exercisePresetsCache:v1';

interface ExercisePresetsCacheEnvelope {
  version: number;
  fetchedAt: string;
  presets: ExercisePreset[];
}

function isValidEnvelope(value: unknown): value is ExercisePresetsCacheEnvelope {
  if (!value || typeof value !== 'object') return false;
  const record = value as Record<string, unknown>;
  return (
    typeof record.version === 'number' &&
    typeof record.fetchedAt === 'string' &&
    Array.isArray(record.presets)
  );
}

async function readCache(): Promise<ExercisePresetsCacheEnvelope | null> {
  const raw = await AsyncStorage.getItem(PRESETS_CACHE_KEY);
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!isValidEnvelope(parsed)) {
      await AsyncStorage.removeItem(PRESETS_CACHE_KEY);
      return null;
    }
    return parsed;
  } catch {
    await AsyncStorage.removeItem(PRESETS_CACHE_KEY);
    return null;
  }
}

async function writeCache(
  payload: GetExercisePresetsResponse
): Promise<ExercisePresetsCacheEnvelope> {
  const envelope: ExercisePresetsCacheEnvelope = {
    version: payload.version,
    presets: payload.presets,
    fetchedAt: new Date().toISOString(),
  };
  await AsyncStorage.setItem(PRESETS_CACHE_KEY, JSON.stringify(envelope));
  return envelope;
}

export async function clearExercisePresetsCache(): Promise<void> {
  await AsyncStorage.removeItem(PRESETS_CACHE_KEY);
}

export async function getCachedExercisePresets(): Promise<ExercisePresetsCacheEnvelope | null> {
  return readCache();
}

/**
 * Loads presets with resilient cache semantics:
 * - returns freshest network payload whenever available
 * - updates cache only when the server version changes
 * - falls back to cached presets when network is unavailable
 */
export async function loadExercisePresets(): Promise<ExercisePresetsCacheEnvelope> {
  const cached = await readCache();

  try {
    const remote = await getExercisePresets();
    if (!cached || remote.version !== cached.version) {
      return writeCache(remote);
    }
    return {
      version: cached.version,
      presets: cached.presets,
      fetchedAt: cached.fetchedAt,
    };
  } catch (error) {
    if (cached) {
      return cached;
    }
    throw error;
  }
}
