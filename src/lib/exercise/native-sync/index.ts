export {
  createHealthConnectAdapter,
  createHealthKitAdapter,
  getNativeSyncPrivacyPolicyUrl,
} from './adapters';
export { mapNativeTypeToPresetId, toPreparedSyncExercise } from './mapping';
export { syncNativeHealthAdapter } from './orchestrator';
export type { SyncNativeHealthResult } from './orchestrator';
export type {
  NativeHealthAdapter,
  NativeSyncCursor,
  NativeSyncPlatform,
  NativeSyncSource,
  NativeWorkoutRecord,
  PreparedSyncExercise,
} from './types';
