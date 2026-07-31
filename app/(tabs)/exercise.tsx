import { useCallback, useEffect, useMemo, useState } from 'react';
import { AppState, Modal, Platform, Pressable, RefreshControl, ScrollView, Text, View } from 'react-native';
import { useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import * as Linking from 'expo-linking';

import { AppScreen } from '@/components/layout/app-screen';
import { useAuth } from '@/components/auth/auth-provider';
import { useDashboard } from '@/components/dashboard/dashboard-context';
import { ExercisePresetPicker } from '@/components/exercise/exercise-preset-picker';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { SegmentedControl } from '@/components/ui/segmented-control';
import {
  deleteExercise,
  getExerciseSyncState,
  getExercisesUpdatedSince,
  patchExercise,
  postExercise,
} from '@/lib/api';
import { ApiError } from '@/lib/api/errors';
import { logAppError, toUserErrorMessage } from '@/lib/app-errors';
import {
  displayExerciseNotes,
  formatExerciseCaloriesLabel,
  isCaloriesNotReported,
  withCaloriesNotReportedNotes,
} from '@/lib/exercise/calories-display';
import {
  ExerciseTrackingDisabledError,
  createHealthConnectAdapter,
  createHealthKitAdapter,
  getNativeSyncPrivacyPolicyUrl,
  hydrateExerciseSyncState,
  isNativeHealthSyncSupported,
  NATIVE_SYNC_REQUIRES_DEV_CLIENT_MESSAGE,
  syncNativeHealthAdapter,
  type NativeLookbackDays,
} from '@/lib/exercise/native-sync';
import {
  ensureExerciseBackgroundSyncRegistered,
  isExerciseBackgroundSyncEnabled,
  setExerciseBackgroundSyncEnabled,
} from '@/lib/exercise/native-sync/background-sync';
import { loadExercisePresets } from '@/lib/exercise/presets-store';
import { queryKeys, useExercise, useExerciseRange } from '@/lib/queries';
import { showToast } from '@/lib/toast';
import type {
  ExerciseIntensity,
  ExercisePreset,
  ExerciseSyncStateDocument,
  ExerciseWithId,
  PatchExerciseBody,
} from '@/types';

type QueryMode = 'day' | 'range';

const intensityOptions: ExerciseIntensity[] = ['low', 'moderate', 'high'];
const lookbackOptions: { value: '7' | '30' | '90'; label: string }[] = [
  { value: '7', label: '7 days' },
  { value: '30', label: '30 days' },
  { value: '90', label: '90 days' },
];

function lookbackFromOption(value: '7' | '30' | '90'): NativeLookbackDays {
  return Number(value) as NativeLookbackDays;
}

function isValidDateInput(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value.trim());
}

function normalizeNullableText(value: string): string | null {
  const trimmed = value.trim();
  return trimmed.length === 0 ? null : trimmed;
}

function parseOptionalInt(value: string): number | null | undefined {
  const trimmed = value.trim();
  if (trimmed.length === 0) return null;
  const parsed = Number.parseInt(trimmed, 10);
  if (!Number.isInteger(parsed)) return undefined;
  return parsed;
}

function parseOptionalFloat(value: string): number | null | undefined {
  const trimmed = value.trim();
  if (trimmed.length === 0) return null;
  const parsed = Number.parseFloat(trimmed);
  if (!Number.isFinite(parsed)) return undefined;
  return parsed;
}

function parseOptionalIso(value: string): string | null | undefined {
  const trimmed = value.trim();
  if (trimmed.length === 0) return null;
  const parsed = new Date(trimmed);
  if (Number.isNaN(parsed.getTime())) return undefined;
  return parsed.toISOString();
}

function formatTimestampLabel(value: unknown): string {
  if (value == null) return 'Never';
  if (typeof value === 'string') {
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return value;
    return parsed.toLocaleString();
  }
  return 'Unknown';
}

function toastExerciseWriteError(error: unknown, fallback: string): void {
  if (
    error instanceof ExerciseTrackingDisabledError ||
    (error instanceof ApiError && error.status === 403)
  ) {
    showToast('Exercise tracking is disabled. Enable it in Settings.', 'error');
    return;
  }
  if (error instanceof ApiError && error.status === 429) {
    const wait = error.retryAfterSeconds;
    showToast(
      wait != null
        ? `Too many requests. Retry in ${wait}s.`
        : 'Too many requests. Try again shortly.',
      'error'
    );
    return;
  }
  showToast(toUserErrorMessage(error, fallback), 'error');
}

export default function ExerciseScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { habits, refreshExercises } = useDashboard();
  const exerciseEnabled = habits.exerciseTrackingEnabled !== false;

  const [mode, setMode] = useState<QueryMode>('day');
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [startDate, setStartDate] = useState(new Date().toISOString().slice(0, 10));
  const [endDate, setEndDate] = useState(new Date().toISOString().slice(0, 10));
  const [presets, setPresets] = useState<ExercisePreset[]>([]);
  const [presetsVersion, setPresetsVersion] = useState<number | null>(null);
  const [loadingPresets, setLoadingPresets] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [openCreate, setOpenCreate] = useState(false);
  const [editing, setEditing] = useState<ExerciseWithId | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [lookbackDays, setLookbackDays] = useState<'7' | '30' | '90'>('30');
  const [syncState, setSyncState] = useState<ExerciseSyncStateDocument | null>(null);
  const [backgroundEnabled, setBackgroundEnabled] = useState(false);

  const dayQueryEnabled = exerciseEnabled && mode === 'day' && isValidDateInput(date);
  const rangeQueryEnabled =
    exerciseEnabled && mode === 'range' && isValidDateInput(startDate) && isValidDateInput(endDate);
  const dayQuery = useExercise(date.trim(), dayQueryEnabled);
  const rangeQuery = useExerciseRange(startDate.trim(), endDate.trim(), rangeQueryEnabled);

  const items = mode === 'day' ? (dayQuery.data ?? []) : (rangeQuery.data ?? []);
  const loading =
    mode === 'day'
      ? dayQuery.isPending && dayQuery.data === undefined
      : rangeQuery.isPending && rangeQuery.data === undefined;

  const listError = mode === 'day' ? dayQuery.error : rangeQuery.error;

  useEffect(() => {
    if (!listError) return;
    logAppError('exercise/list', listError, { mode, date, startDate, endDate });
    showToast(toUserErrorMessage(listError, 'Could not load exercises right now.'), 'error');
  }, [listError, mode, date, startDate, endDate]);

  const presetIds = useMemo(() => new Set(presets.map((preset) => preset.id)), [presets]);

  const createExerciseDate = useMemo(() => {
    if (mode === 'day') return date;
    return startDate;
  }, [date, mode, startDate]);

  const platformKey = Platform.OS === 'ios' ? 'apple_healthkit' : 'health_connect';
  const platformSync = syncState?.platforms?.[platformKey];

  const invalidateExerciseQueries = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: queryKeys.exerciseRoot(user?.uid) });
    await refreshExercises();
  }, [queryClient, refreshExercises, user?.uid]);

  const refreshAfterMutation = useCallback(async () => {
    await invalidateExerciseQueries();
  }, [invalidateExerciseQueries]);

  const onPullRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await invalidateExerciseQueries();
    } finally {
      setRefreshing(false);
    }
  }, [invalidateExerciseQueries]);

  const loadPresets = useCallback(async () => {
    try {
      setLoadingPresets(true);
      const cached = await loadExercisePresets();
      setPresets(cached.presets);
      setPresetsVersion(cached.version);
    } catch (error) {
      logAppError('exercise/presets', error);
      showToast(toUserErrorMessage(error, 'Could not load exercise presets.'), 'error');
    } finally {
      setLoadingPresets(false);
    }
  }, []);

  const loadSyncStatus = useCallback(async () => {
    try {
      const state = await hydrateExerciseSyncState();
      setSyncState(state);
      setBackgroundEnabled(await isExerciseBackgroundSyncEnabled());
    } catch (error) {
      logAppError('exercise/sync-state', error);
      try {
        setSyncState(await getExerciseSyncState());
      } catch {
        setSyncState(null);
      }
    }
  }, []);

  useEffect(() => {
    void loadPresets();
    void loadSyncStatus();
  }, [loadPresets, loadSyncStatus]);

  useEffect(() => {
    if (!exerciseEnabled || !isNativeHealthSyncSupported()) return;
    void ensureExerciseBackgroundSyncRegistered();
  }, [exerciseEnabled]);

  useEffect(() => {
    const sub = AppState.addEventListener('change', (next) => {
      if (next === 'active' && exerciseEnabled) {
        void loadSyncStatus();
      }
    });
    return () => sub.remove();
  }, [exerciseEnabled, loadSyncStatus]);

  async function handleDelete(exerciseId: string): Promise<void> {
    if (!exerciseEnabled) {
      showToast('Exercise tracking is disabled. Enable it in Settings.', 'error');
      return;
    }
    try {
      await deleteExercise(exerciseId);
      await refreshAfterMutation();
      showToast('Exercise deleted.', 'success');
    } catch (error) {
      logAppError('exercise/delete', error, { exerciseId });
      toastExerciseWriteError(error, 'Could not delete exercise.');
    }
  }

  async function handleNativeSync(): Promise<void> {
    if (!exerciseEnabled) {
      showToast('Exercise tracking is disabled. Enable it in Settings.', 'error');
      return;
    }
    if (!isNativeHealthSyncSupported()) {
      showToast(NATIVE_SYNC_REQUIRES_DEV_CLIENT_MESSAGE, 'error');
      return;
    }

    try {
      setSyncing(true);
      const selected =
        Platform.OS === 'ios'
          ? createHealthKitAdapter({ lastReadAtIso: null })
          : createHealthConnectAdapter({ lastReadAtIso: null });
      const result = await syncNativeHealthAdapter({
        adapter: selected,
        presets,
        lookbackDays: lookbackFromOption(lookbackDays),
      });

      if (result.syncAttemptAt) {
        try {
          await getExercisesUpdatedSince(result.syncAttemptAt);
        } catch (error) {
          logAppError('exercise/updatedSince', error);
        }
      }

      await Promise.all([refreshAfterMutation(), loadSyncStatus()]);
      showToast(`Sync complete: uploaded ${result.uploaded} workout(s).`, 'success');
    } catch (error) {
      logAppError('exercise/native-sync', error);
      await loadSyncStatus();
      toastExerciseWriteError(error, 'Native sync failed. Check permissions and try again.');
    } finally {
      setSyncing(false);
    }
  }

  async function handleToggleBackground(next: boolean): Promise<void> {
    try {
      await setExerciseBackgroundSyncEnabled(next && exerciseEnabled);
      setBackgroundEnabled(next && exerciseEnabled);
      if (next && exerciseEnabled) {
        await ensureExerciseBackgroundSyncRegistered();
        showToast('Background sync enabled (best-effort by the OS).', 'success');
      } else {
        showToast('Background sync disabled.', 'success');
      }
    } catch (error) {
      logAppError('exercise/background-toggle', error);
      showToast(toUserErrorMessage(error, 'Could not update background sync.'), 'error');
    }
  }

  return (
    <AppScreen
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={() => void onPullRefresh()} />
      }
    >
      <View className="gap-1">
        <Text className="text-lg font-semibold text-foreground dark:text-darkForeground">
          Exercise
        </Text>
        <Text className="text-sm text-muted-foreground dark:text-darkMutedForeground">
          Manual logging, curated presets, and native health sync.
        </Text>
      </View>

      {!exerciseEnabled ? (
        <View className="gap-2 rounded-xl border border-border bg-card p-4 dark:border-darkBorder dark:bg-darkCard">
          <Text className="text-sm font-semibold text-foreground dark:text-darkForeground">
            Exercise tracking is disabled
          </Text>
          <Text className="text-xs text-muted-foreground dark:text-darkMutedForeground">
            You can still view history. Enable exercise tracking in Settings to add, edit, delete,
            or sync workouts.
          </Text>
          <Button variant="outline" onPress={() => router.push('/(tabs)/settings')}>
            Open Settings
          </Button>
        </View>
      ) : null}

      <SegmentedControl<QueryMode>
        value={mode}
        options={[
          { value: 'day', label: 'Day' },
          { value: 'range', label: 'Range' },
        ]}
        onChange={setMode}
      />

      {mode === 'day' ? (
        <View className="gap-2">
          <Label>Date (YYYY-MM-DD)</Label>
          <Input value={date} onChangeText={setDate} autoCapitalize="none" />
        </View>
      ) : (
        <View className="gap-3">
          <View className="gap-2">
            <Label>Start Date (YYYY-MM-DD)</Label>
            <Input value={startDate} onChangeText={setStartDate} autoCapitalize="none" />
          </View>
          <View className="gap-2">
            <Label>End Date (YYYY-MM-DD)</Label>
            <Input value={endDate} onChangeText={setEndDate} autoCapitalize="none" />
          </View>
        </View>
      )}

      <View className="flex-row gap-2">
        <Button className="flex-1" disabled={loading} onPress={() => void invalidateExerciseQueries()}>
          {loading ? 'Loading...' : 'Refresh'}
        </Button>
        {exerciseEnabled ? (
          <Button className="flex-1" variant="outline" onPress={() => setOpenCreate(true)}>
            Add Exercise
          </Button>
        ) : null}
      </View>

      {exerciseEnabled ? (
        <View className="gap-2 rounded-xl border border-border bg-card p-4 dark:border-darkBorder dark:bg-darkCard">
          <Text className="text-sm font-semibold text-foreground dark:text-darkForeground">
            Native sync
          </Text>
          <Text className="text-xs text-muted-foreground dark:text-darkMutedForeground">
            {isNativeHealthSyncSupported()
              ? 'Pull workouts from Apple HealthKit (iOS) or Health Connect (Android). Background delivery is best-effort.'
              : NATIVE_SYNC_REQUIRES_DEV_CLIENT_MESSAGE}
          </Text>
          <View className="gap-2">
            <Label>First sync lookback</Label>
            <SegmentedControl<'7' | '30' | '90'>
              value={lookbackDays}
              options={lookbackOptions}
              onChange={setLookbackDays}
            />
          </View>
          <Button
            disabled={syncing || !isNativeHealthSyncSupported()}
            onPress={() => void handleNativeSync()}
          >
            {syncing ? 'Syncing...' : 'Sync from native health app'}
          </Button>
          <Button
            variant="outline"
            disabled={!isNativeHealthSyncSupported()}
            onPress={() => void handleToggleBackground(!backgroundEnabled)}
          >
            {backgroundEnabled ? 'Disable background sync' : 'Enable background sync'}
          </Button>
          <View className="gap-1">
            <Text className="text-xs text-muted-foreground dark:text-darkMutedForeground">
              Last successful: {formatTimestampLabel(syncState?.lastSuccessfulSyncAt)}
            </Text>
            <Text className="text-xs text-muted-foreground dark:text-darkMutedForeground">
              Last attempt: {formatTimestampLabel(syncState?.lastAttemptAt)}
            </Text>
            <Text className="text-xs text-muted-foreground dark:text-darkMutedForeground">
              Platform ({platformKey}):{' '}
              {platformSync?.lastSyncedAt
                ? `synced ${formatTimestampLabel(platformSync.lastSyncedAt)}`
                : 'not connected yet'}
            </Text>
            {syncState?.lastError ? (
              <Text className="text-xs text-destructive dark:text-darkDestructive">
                Last error: {syncState.lastError}
              </Text>
            ) : null}
          </View>
          <Pressable onPress={() => void Linking.openURL(getNativeSyncPrivacyPolicyUrl())}>
            <Text className="text-xs text-primary dark:text-darkPrimary">View privacy policy</Text>
          </Pressable>
        </View>
      ) : null}

      <View className="gap-2 rounded-xl border border-border bg-card p-4 dark:border-darkBorder dark:bg-darkCard">
        <Text className="text-base font-semibold text-foreground dark:text-darkForeground">
          Presets
        </Text>
        <Text className="text-xs text-muted-foreground dark:text-darkMutedForeground">
          {loadingPresets
            ? 'Loading preset catalog...'
            : `Version ${presetsVersion ?? '-'} • ${presets.length} presets cached`}
        </Text>
        <View className="gap-1">
          {presets.slice(0, 8).map((preset) => (
            <Text key={preset.id} className="text-sm text-foreground dark:text-darkForeground">
              {preset.displayName} ({preset.id})
            </Text>
          ))}
          {presets.length > 8 ? (
            <Text className="text-xs text-muted-foreground dark:text-darkMutedForeground">
              Showing first 8 presets.
            </Text>
          ) : null}
        </View>
      </View>

      <View className="gap-2">
        {items.map((exercise) => {
          const notesDisplay = displayExerciseNotes(exercise.notes);
          const metaParts = [
            exercise.date,
            formatExerciseCaloriesLabel({
              caloriesBurned: exercise.caloriesBurned,
              notes: exercise.notes,
            }),
          ];
          if (exercise.durationMinutes != null) metaParts.push(`${exercise.durationMinutes} min`);
          if (exercise.distanceMeters != null) metaParts.push(`${exercise.distanceMeters} m`);
          return (
            <View
              key={exercise.id}
              className="gap-2 rounded-xl border border-border bg-card p-4 dark:border-darkBorder dark:bg-darkCard"
            >
              <Text className="text-sm font-semibold text-foreground dark:text-darkForeground">
                {exercise.name}
              </Text>
              <Text className="text-xs text-muted-foreground dark:text-darkMutedForeground">
                {metaParts.join(' • ')}
              </Text>
              {notesDisplay ? (
                <Text className="text-xs text-muted-foreground dark:text-darkMutedForeground">
                  {notesDisplay}
                </Text>
              ) : null}
              {exerciseEnabled ? (
                <View className="flex-row gap-2">
                  <Button className="flex-1" variant="outline" onPress={() => setEditing(exercise)}>
                    Edit
                  </Button>
                  <Button
                    className="flex-1"
                    variant="destructive"
                    onPress={() => void handleDelete(exercise.id)}
                  >
                    Delete
                  </Button>
                </View>
              ) : null}
            </View>
          );
        })}
        {!loading && items.length === 0 ? (
          <Text className="text-sm text-muted-foreground dark:text-darkMutedForeground">
            No exercises found for this selection.
          </Text>
        ) : null}
      </View>

      <CreateExerciseModal
        open={openCreate}
        date={createExerciseDate}
        presets={presets}
        presetIds={presetIds}
        onClose={() => setOpenCreate(false)}
        onSaved={async () => {
          setOpenCreate(false);
          await refreshAfterMutation();
        }}
      />

      <EditExerciseModal
        exercise={editing}
        presets={presets}
        presetIds={presetIds}
        onClose={() => setEditing(null)}
        onSaved={async () => {
          setEditing(null);
          await refreshAfterMutation();
        }}
      />
    </AppScreen>
  );
}

function CreateExerciseModal({
  open,
  date,
  presets,
  presetIds,
  onClose,
  onSaved,
}: {
  open: boolean;
  date: string;
  presets: ExercisePreset[];
  presetIds: Set<string>;
  onClose: () => void;
  onSaved: () => Promise<void>;
}) {
  const [name, setName] = useState('');
  const [caloriesBurned, setCaloriesBurned] = useState('');
  const [presetId, setPresetId] = useState('');
  const [intensity, setIntensity] = useState<ExerciseIntensity>('moderate');
  const [durationMinutes, setDurationMinutes] = useState('');
  const [distanceMeters, setDistanceMeters] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  async function handleSave(): Promise<void> {
    const normalizedName = name.trim();
    const calories = Number.parseInt(caloriesBurned, 10);
    if (!normalizedName || !Number.isInteger(calories) || calories < 0 || calories > 10000) {
      showToast('Provide a name and calories between 0 and 10000.', 'error');
      return;
    }
    if (!isValidDateInput(date)) {
      showToast('Current date filter is invalid.', 'error');
      return;
    }

    const normalizedPresetId = presetId.trim();
    if (normalizedPresetId.length > 0 && !presetIds.has(normalizedPresetId)) {
      showToast('Unknown preset ID. Use one from the presets list.', 'error');
      return;
    }

    const duration = parseOptionalInt(durationMinutes);
    if (duration === undefined) {
      showToast('Duration must be a whole number of minutes.', 'error');
      return;
    }
    const distance = parseOptionalFloat(distanceMeters);
    if (distance === undefined) {
      showToast('Distance must be a number (meters).', 'error');
      return;
    }
    const startIso = parseOptionalIso(startTime);
    if (startIso === undefined) {
      showToast('Start time must be a valid ISO date/time.', 'error');
      return;
    }
    const endIso = parseOptionalIso(endTime);
    if (endIso === undefined) {
      showToast('End time must be a valid ISO date/time.', 'error');
      return;
    }
    if (startIso && endIso && endIso < startIso) {
      showToast('End time must be on or after start time.', 'error');
      return;
    }

    try {
      setSaving(true);
      await postExercise({
        date: date.trim(),
        name: normalizedName,
        caloriesBurned: calories,
        intensity,
        presetId: normalizeNullableText(normalizedPresetId),
        durationMinutes: duration,
        distanceMeters: distance,
        startTime: startIso,
        endTime: endIso,
        notes: normalizeNullableText(notes),
      });
      showToast('Exercise added.', 'success');
      setName('');
      setCaloriesBurned('');
      setPresetId('');
      setDurationMinutes('');
      setDistanceMeters('');
      setStartTime('');
      setEndTime('');
      setNotes('');
      await onSaved();
    } catch (error) {
      logAppError('exercise/create', error);
      toastExerciseWriteError(error, 'Could not create exercise.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal visible={open} transparent animationType="slide" onRequestClose={onClose}>
      <View className="flex-1 justify-end bg-black/40">
        <Pressable className="flex-1" onPress={onClose} />
        <View className="max-h-[90%] rounded-t-3xl bg-card dark:bg-darkCard">
          <ScrollView
            className="px-4 pt-4"
            contentContainerClassName="gap-3 pb-8"
            keyboardShouldPersistTaps="handled"
          >
            <Text className="text-lg font-semibold text-foreground dark:text-darkForeground">
              Add exercise
            </Text>
            <View className="gap-2">
              <Label>Date</Label>
              <Text className="text-sm text-muted-foreground dark:text-darkMutedForeground">
                {date}
              </Text>
            </View>
            <View className="gap-2">
              <Label>Name</Label>
              <Input value={name} onChangeText={setName} placeholder="Morning run" />
            </View>
            <View className="gap-2">
              <Label>Calories</Label>
              <Input
                value={caloriesBurned}
                onChangeText={setCaloriesBurned}
                keyboardType="number-pad"
                placeholder="320"
              />
            </View>
            <ExercisePresetPicker presets={presets} value={presetId} onChange={setPresetId} />
            <View className="gap-2">
              <Label>Intensity</Label>
              <SegmentedControl<ExerciseIntensity>
                value={intensity}
                options={intensityOptions.map((value) => ({ value, label: value }))}
                onChange={setIntensity}
              />
            </View>
            <View className="gap-2">
              <Label>Duration (minutes)</Label>
              <Input
                value={durationMinutes}
                onChangeText={setDurationMinutes}
                keyboardType="number-pad"
                placeholder="45"
              />
            </View>
            <View className="gap-2">
              <Label>Distance (meters)</Label>
              <Input
                value={distanceMeters}
                onChangeText={setDistanceMeters}
                keyboardType="decimal-pad"
                placeholder="5000"
              />
            </View>
            <View className="gap-2">
              <Label>Start time (ISO)</Label>
              <Input
                value={startTime}
                onChangeText={setStartTime}
                autoCapitalize="none"
                placeholder="2026-05-08T07:00:00.000Z"
              />
            </View>
            <View className="gap-2">
              <Label>End time (ISO)</Label>
              <Input
                value={endTime}
                onChangeText={setEndTime}
                autoCapitalize="none"
                placeholder="2026-05-08T07:45:00.000Z"
              />
            </View>
            <View className="gap-2">
              <Label>Notes</Label>
              <Input
                value={notes}
                onChangeText={setNotes}
                multiline
                className="min-h-[72px] py-3"
              />
            </View>
            <Button disabled={saving} onPress={() => void handleSave()}>
              {saving ? 'Saving...' : 'Save'}
            </Button>
            <Button variant="outline" onPress={onClose}>
              Cancel
            </Button>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

function EditExerciseModal({
  exercise,
  presets,
  presetIds,
  onClose,
  onSaved,
}: {
  exercise: ExerciseWithId | null;
  presets: ExercisePreset[];
  presetIds: Set<string>;
  onClose: () => void;
  onSaved: () => Promise<void>;
}) {
  const [name, setName] = useState('');
  const [caloriesBurned, setCaloriesBurned] = useState('');
  const [notes, setNotes] = useState('');
  const [presetId, setPresetId] = useState('');
  const [intensity, setIntensity] = useState<ExerciseIntensity>('moderate');
  const [durationMinutes, setDurationMinutes] = useState('');
  const [distanceMeters, setDistanceMeters] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!exercise) return;
    setName(exercise.name ?? '');
    setCaloriesBurned(String(exercise.caloriesBurned ?? ''));
    setNotes(displayExerciseNotes(exercise.notes) ?? '');
    setPresetId(exercise.presetId ?? '');
    setIntensity(exercise.intensity ?? 'moderate');
    setDurationMinutes(exercise.durationMinutes != null ? String(exercise.durationMinutes) : '');
    setDistanceMeters(exercise.distanceMeters != null ? String(exercise.distanceMeters) : '');
    setStartTime(typeof exercise.startTime === 'string' ? exercise.startTime : '');
    setEndTime(typeof exercise.endTime === 'string' ? exercise.endTime : '');
  }, [exercise]);

  async function handleSave(): Promise<void> {
    if (!exercise) return;
    const normalizedName = name.trim();
    const calories = Number.parseInt(caloriesBurned, 10);
    if (!normalizedName || !Number.isInteger(calories) || calories < 0 || calories > 10000) {
      showToast('Provide a name and calories between 0 and 10000.', 'error');
      return;
    }

    const normalizedPresetId = presetId.trim();
    if (normalizedPresetId.length > 0 && !presetIds.has(normalizedPresetId)) {
      showToast('Unknown preset ID. Use one from the presets list.', 'error');
      return;
    }

    const duration = parseOptionalInt(durationMinutes);
    if (duration === undefined) {
      showToast('Duration must be a whole number of minutes.', 'error');
      return;
    }
    const distance = parseOptionalFloat(distanceMeters);
    if (distance === undefined) {
      showToast('Distance must be a number (meters).', 'error');
      return;
    }
    const startIso = parseOptionalIso(startTime);
    if (startIso === undefined) {
      showToast('Start time must be a valid ISO date/time.', 'error');
      return;
    }
    const endIso = parseOptionalIso(endTime);
    if (endIso === undefined) {
      showToast('End time must be a valid ISO date/time.', 'error');
      return;
    }
    if (startIso && endIso && endIso < startIso) {
      showToast('End time must be on or after start time.', 'error');
      return;
    }

    const body: PatchExerciseBody = {
      name: normalizedName,
      caloriesBurned: calories,
      notes: isCaloriesNotReported(exercise.notes)
        ? withCaloriesNotReportedNotes(normalizeNullableText(notes))
        : normalizeNullableText(notes),
      presetId: normalizeNullableText(normalizedPresetId),
      intensity,
      durationMinutes: duration,
      distanceMeters: distance,
      startTime: startIso,
      endTime: endIso,
    };

    if (Object.keys(body).length === 0) {
      showToast('Nothing to update.', 'error');
      return;
    }

    try {
      setSaving(true);
      await patchExercise(exercise.id, body);
      showToast('Exercise updated.', 'success');
      await onSaved();
    } catch (error) {
      logAppError('exercise/patch', error, { exerciseId: exercise.id });
      toastExerciseWriteError(error, 'Could not update exercise.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal visible={Boolean(exercise)} transparent animationType="slide" onRequestClose={onClose}>
      <View className="flex-1 justify-end bg-black/40">
        <Pressable className="flex-1" onPress={onClose} />
        <View className="max-h-[90%] rounded-t-3xl bg-card dark:bg-darkCard">
          <ScrollView
            className="px-4 pt-4"
            contentContainerClassName="gap-3 pb-8"
            keyboardShouldPersistTaps="handled"
          >
            <Text className="text-lg font-semibold text-foreground dark:text-darkForeground">
              Edit exercise
            </Text>
            <View className="gap-2">
              <Label>Name</Label>
              <Input value={name} onChangeText={setName} />
            </View>
            <View className="gap-2">
              <Label>Calories</Label>
              <Input
                value={caloriesBurned}
                onChangeText={setCaloriesBurned}
                keyboardType="number-pad"
              />
            </View>
            <ExercisePresetPicker presets={presets} value={presetId} onChange={setPresetId} />
            <View className="gap-2">
              <Label>Intensity</Label>
              <SegmentedControl<ExerciseIntensity>
                value={intensity}
                options={intensityOptions.map((value) => ({ value, label: value }))}
                onChange={setIntensity}
              />
            </View>
            <View className="gap-2">
              <Label>Duration (minutes)</Label>
              <Input
                value={durationMinutes}
                onChangeText={setDurationMinutes}
                keyboardType="number-pad"
              />
            </View>
            <View className="gap-2">
              <Label>Distance (meters)</Label>
              <Input
                value={distanceMeters}
                onChangeText={setDistanceMeters}
                keyboardType="decimal-pad"
              />
            </View>
            <View className="gap-2">
              <Label>Start time (ISO)</Label>
              <Input value={startTime} onChangeText={setStartTime} autoCapitalize="none" />
            </View>
            <View className="gap-2">
              <Label>End time (ISO)</Label>
              <Input value={endTime} onChangeText={setEndTime} autoCapitalize="none" />
            </View>
            <View className="gap-2">
              <Label>Notes</Label>
              <Input
                value={notes}
                onChangeText={setNotes}
                multiline
                className="min-h-[72px] py-3"
              />
            </View>
            <Button disabled={saving} onPress={() => void handleSave()}>
              {saving ? 'Saving...' : 'Save changes'}
            </Button>
            <Button variant="outline" onPress={onClose}>
              Cancel
            </Button>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}
