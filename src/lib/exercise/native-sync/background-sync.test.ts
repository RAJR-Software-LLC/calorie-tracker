/* eslint-disable import/first -- jest.mock must run before importing modules under test */
jest.mock('expo-background-task', () => ({
  BackgroundTaskResult: { Success: 1, Failed: 2 },
  BackgroundTaskStatus: { Restricted: 1, Available: 2 },
  getStatusAsync: jest.fn(async () => 2),
  registerTaskAsync: jest.fn(async () => undefined),
  unregisterTaskAsync: jest.fn(async () => undefined),
}));

jest.mock('expo-task-manager', () => ({
  defineTask: jest.fn(),
  isTaskDefined: jest.fn(() => false),
  isTaskRegisteredAsync: jest.fn(async () => false),
}));

jest.mock('@/lib/api', () => ({
  getMe: jest.fn(),
}));

jest.mock('./adapters', () => ({
  createHealthKitAdapter: jest.fn(),
  createHealthConnectAdapter: jest.fn(),
}));

jest.mock('./orchestrator', () => ({
  syncNativeHealthAdapter: jest.fn(),
}));

jest.mock('./runtime', () => ({
  isNativeHealthSyncSupported: jest.fn(() => true),
}));

import AsyncStorage from '@react-native-async-storage/async-storage';
import * as BackgroundTask from 'expo-background-task';
import * as TaskManager from 'expo-task-manager';

import {
  EXERCISE_BACKGROUND_SYNC_TASK,
  ensureExerciseBackgroundSyncRegistered,
  isExerciseBackgroundSyncEnabled,
  setExerciseBackgroundSyncEnabled,
} from './background-sync';

describe('exercise background sync registration', () => {
  beforeEach(async () => {
    jest.clearAllMocks();
    await AsyncStorage.clear();
    (TaskManager.isTaskDefined as jest.Mock).mockReturnValue(false);
    (TaskManager.isTaskRegisteredAsync as jest.Mock).mockResolvedValue(false);
    (BackgroundTask.getStatusAsync as jest.Mock).mockResolvedValue(
      BackgroundTask.BackgroundTaskStatus.Available
    );
  });

  it('does not register when disabled', async () => {
    expect(await isExerciseBackgroundSyncEnabled()).toBe(false);
    await ensureExerciseBackgroundSyncRegistered();
    expect(BackgroundTask.registerTaskAsync).not.toHaveBeenCalled();
  });

  it('registers when enabled and OS allows background tasks', async () => {
    await setExerciseBackgroundSyncEnabled(true);
    expect(await isExerciseBackgroundSyncEnabled()).toBe(true);
    expect(BackgroundTask.registerTaskAsync).toHaveBeenCalledWith(
      EXERCISE_BACKGROUND_SYNC_TASK,
      expect.objectContaining({ minimumInterval: expect.any(Number) })
    );
  });

  it('unregisters when disabled', async () => {
    (TaskManager.isTaskRegisteredAsync as jest.Mock).mockResolvedValue(true);
    await setExerciseBackgroundSyncEnabled(true);
    await setExerciseBackgroundSyncEnabled(false);
    expect(BackgroundTask.unregisterTaskAsync).toHaveBeenCalledWith(EXERCISE_BACKGROUND_SYNC_TASK);
  });
});
