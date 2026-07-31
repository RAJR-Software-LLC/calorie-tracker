import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import * as BackgroundTask from 'expo-background-task';
import * as TaskManager from 'expo-task-manager';

import { getMe } from '@/lib/api';
import { logAppError } from '@/lib/app-errors';
import { loadExercisePresets } from '@/lib/exercise/presets-store';
import { mergeUserHabits } from '@/lib/utils/user-habits';

import { createHealthConnectAdapter, createHealthKitAdapter } from './adapters';
import { syncNativeHealthAdapter } from './orchestrator';
import { isNativeHealthSyncSupported } from './runtime';

export const EXERCISE_BACKGROUND_SYNC_TASK = 'EXERCISE_NATIVE_HEALTH_SYNC';
const ENABLED_KEY = 'exerciseNativeBackgroundSyncEnabled';

let taskDefined = false;

function ensureTaskDefined(): void {
  if (taskDefined) return;
  if (TaskManager.isTaskDefined(EXERCISE_BACKGROUND_SYNC_TASK)) {
    taskDefined = true;
    return;
  }

  TaskManager.defineTask(EXERCISE_BACKGROUND_SYNC_TASK, async () => {
    try {
      const enabled = await isExerciseBackgroundSyncEnabled();
      if (!enabled || !isNativeHealthSyncSupported()) {
        return BackgroundTask.BackgroundTaskResult.Success;
      }

      const me = await getMe();
      const habits = mergeUserHabits(me?.habits);
      if (habits.exerciseTrackingEnabled === false) {
        return BackgroundTask.BackgroundTaskResult.Success;
      }

      const { presets } = await loadExercisePresets();
      const adapter =
        Platform.OS === 'ios'
          ? createHealthKitAdapter({ lastReadAtIso: null })
          : createHealthConnectAdapter({ lastReadAtIso: null });

      await syncNativeHealthAdapter({ adapter, presets });
      return BackgroundTask.BackgroundTaskResult.Success;
    } catch (error) {
      logAppError('exercise/background-sync', error);
      return BackgroundTask.BackgroundTaskResult.Failed;
    }
  });
  taskDefined = true;
}

export async function isExerciseBackgroundSyncEnabled(): Promise<boolean> {
  const raw = await AsyncStorage.getItem(ENABLED_KEY);
  return raw === '1';
}

export async function setExerciseBackgroundSyncEnabled(enabled: boolean): Promise<void> {
  await AsyncStorage.setItem(ENABLED_KEY, enabled ? '1' : '0');
  if (enabled) {
    await ensureExerciseBackgroundSyncRegistered();
  } else {
    await unregisterExerciseBackgroundSync();
  }
}

export async function ensureExerciseBackgroundSyncRegistered(): Promise<void> {
  if (!isNativeHealthSyncSupported()) return;
  ensureTaskDefined();

  const enabled = await isExerciseBackgroundSyncEnabled();
  if (!enabled) return;

  const status = await BackgroundTask.getStatusAsync();
  if (status !== BackgroundTask.BackgroundTaskStatus.Available) {
    return;
  }

  const already = await TaskManager.isTaskRegisteredAsync(EXERCISE_BACKGROUND_SYNC_TASK);
  if (already) return;

  await BackgroundTask.registerTaskAsync(EXERCISE_BACKGROUND_SYNC_TASK, {
    minimumInterval: 60 * 12, // minutes — OS may batch; ~12h hint
  });
}

export async function unregisterExerciseBackgroundSync(): Promise<void> {
  ensureTaskDefined();
  const already = await TaskManager.isTaskRegisteredAsync(EXERCISE_BACKGROUND_SYNC_TASK);
  if (!already) return;
  await BackgroundTask.unregisterTaskAsync(EXERCISE_BACKGROUND_SYNC_TASK);
}

/** Call once at app startup so TaskManager.defineTask runs early. */
export function installExerciseBackgroundSyncTask(): void {
  try {
    ensureTaskDefined();
  } catch (error) {
    logAppError('exercise/background-sync/install', error);
  }
}
