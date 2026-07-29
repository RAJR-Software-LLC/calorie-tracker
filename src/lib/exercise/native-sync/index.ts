export {
  createHealthConnectAdapter,
  createHealthKitAdapter,
  getNativeSyncPrivacyPolicyUrl,
} from './adapters';
export {
  isExpoGo,
  isNativeHealthSyncSupported,
  NATIVE_SYNC_REQUIRES_DEV_CLIENT_MESSAGE,
} from './runtime';
export { mapNativeTypeToPresetId, toPreparedSyncExercise } from './mapping';
export { syncNativeHealthAdapter, ExerciseTrackingDisabledError } from './orchestrator';
export type { SyncNativeHealthResult } from './orchestrator';
export {
  hydrateExerciseSyncState,
  nativeSourceToExternalSource,
  resolveSyncCursor,
} from './sync-state';
export type {
  NativeHealthAdapter,
  NativeLookbackDays,
  NativeSyncCursor,
  NativeSyncPlatform,
  NativeSyncSource,
  NativeWorkoutRecord,
  PreparedSyncExercise,
} from './types';

