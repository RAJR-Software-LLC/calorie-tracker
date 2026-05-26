import { useCallback, useEffect, useMemo, useState } from 'react';
import { Modal, Platform, Pressable, Text, View } from 'react-native';

import { AppScreen } from '@/components/layout/app-screen';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { SegmentedControl } from '@/components/ui/segmented-control';
import {
  deleteExercise,
  getExercisesByDate,
  getExercisesByRange,
  patchExercise,
  postExercise,
} from '@/lib/api';
import { logAppError, toUserErrorMessage } from '@/lib/app-errors';
import {
  createHealthConnectAdapter,
  createHealthKitAdapter,
  getNativeSyncPrivacyPolicyUrl,
  syncNativeHealthAdapter,
} from '@/lib/exercise/native-sync';
import { loadExercisePresets } from '@/lib/exercise/presets-store';
import { showToast } from '@/lib/toast';
import type { ExerciseIntensity, ExercisePreset, ExerciseWithId } from '@/types';
import * as Linking from 'expo-linking';

type QueryMode = 'day' | 'range';

const intensityOptions: ExerciseIntensity[] = ['low', 'moderate', 'high'];

function isValidDateInput(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value.trim());
}

function normalizeNullableText(value: string): string | null {
  const trimmed = value.trim();
  return trimmed.length === 0 ? null : trimmed;
}

export default function ExerciseScreen() {
  const [mode, setMode] = useState<QueryMode>('day');
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [startDate, setStartDate] = useState(new Date().toISOString().slice(0, 10));
  const [endDate, setEndDate] = useState(new Date().toISOString().slice(0, 10));
  const [items, setItems] = useState<ExerciseWithId[]>([]);
  const [presets, setPresets] = useState<ExercisePreset[]>([]);
  const [presetsVersion, setPresetsVersion] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingPresets, setLoadingPresets] = useState(false);
  const [openCreate, setOpenCreate] = useState(false);
  const [editing, setEditing] = useState<ExerciseWithId | null>(null);
  const [syncing, setSyncing] = useState(false);

  const presetIds = useMemo(() => new Set(presets.map((preset) => preset.id)), [presets]);

  const loadList = useCallback(async () => {
    try {
      setLoading(true);
      if (mode === 'day') {
        if (!isValidDateInput(date)) {
          showToast('Enter date as YYYY-MM-DD.', 'error');
          return;
        }
        const next = await getExercisesByDate(date.trim());
        setItems(next);
        return;
      }

      if (!isValidDateInput(startDate) || !isValidDateInput(endDate)) {
        showToast('Enter start and end date as YYYY-MM-DD.', 'error');
        return;
      }
      const next = await getExercisesByRange(startDate.trim(), endDate.trim());
      setItems(next);
    } catch (error) {
      logAppError('exercise/list', error, { mode, date, startDate, endDate });
      showToast(toUserErrorMessage(error, 'Could not load exercises right now.'), 'error');
    } finally {
      setLoading(false);
    }
  }, [date, endDate, mode, startDate]);

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

  useEffect(() => {
    void loadPresets();
  }, [loadPresets]);

  useEffect(() => {
    void loadList();
  }, [loadList]);

  async function handleDelete(exerciseId: string): Promise<void> {
    try {
      await deleteExercise(exerciseId);
      await loadList();
      showToast('Exercise deleted.', 'success');
    } catch (error) {
      logAppError('exercise/delete', error, { exerciseId });
      showToast(toUserErrorMessage(error, 'Could not delete exercise.'), 'error');
    }
  }

  async function handleNativeSync(): Promise<void> {
    try {
      setSyncing(true);
      const selected =
        Platform.OS === 'ios'
          ? createHealthKitAdapter({ lastReadAtIso: null })
          : createHealthConnectAdapter({ lastReadAtIso: null });
      const result = await syncNativeHealthAdapter({ adapter: selected, presets });
      showToast(`Sync complete: uploaded ${result.uploaded} workout(s).`, 'success');
      await loadList();
    } catch (error) {
      logAppError('exercise/native-sync', error);
      showToast(
        toUserErrorMessage(error, 'Native sync failed. Check permissions and try again.'),
        'error'
      );
    } finally {
      setSyncing(false);
    }
  }

  return (
    <AppScreen>
      <View className="gap-1">
        <Text className="text-lg font-semibold text-foreground dark:text-darkForeground">
          Exercise
        </Text>
        <Text className="text-sm text-muted-foreground dark:text-darkMutedForeground">
          Manual logging, curated presets, and edit-safe exercise updates.
        </Text>
      </View>

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
        <Button className="flex-1" disabled={loading} onPress={() => void loadList()}>
          {loading ? 'Loading...' : 'Refresh'}
        </Button>
        <Button className="flex-1" variant="outline" onPress={() => setOpenCreate(true)}>
          Add Exercise
        </Button>
      </View>
      <View className="gap-2 rounded-xl border border-border bg-card p-4 dark:border-darkBorder dark:bg-darkCard">
        <Text className="text-sm font-semibold text-foreground dark:text-darkForeground">
          Native sync
        </Text>
        <Text className="text-xs text-muted-foreground dark:text-darkMutedForeground">
          Pull workouts from Apple HealthKit (iOS) or Health Connect (Android).
        </Text>
        <Button disabled={syncing} onPress={() => void handleNativeSync()}>
          {syncing ? 'Syncing...' : 'Sync from native health app'}
        </Button>
        <Pressable onPress={() => void Linking.openURL(getNativeSyncPrivacyPolicyUrl())}>
          <Text className="text-xs text-primary dark:text-darkPrimary">View privacy policy</Text>
        </Pressable>
      </View>

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
        {items.map((exercise) => (
          <View
            key={exercise.id}
            className="gap-2 rounded-xl border border-border bg-card p-4 dark:border-darkBorder dark:bg-darkCard"
          >
            <Text className="text-sm font-semibold text-foreground dark:text-darkForeground">
              {exercise.name}
            </Text>
            <Text className="text-xs text-muted-foreground dark:text-darkMutedForeground">
              {exercise.date} • {exercise.caloriesBurned} kcal
            </Text>
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
          </View>
        ))}
        {!loading && items.length === 0 ? (
          <Text className="text-sm text-muted-foreground dark:text-darkMutedForeground">
            No exercises found for this selection.
          </Text>
        ) : null}
      </View>

      <CreateExerciseModal
        open={openCreate}
        date={date}
        presetIds={presetIds}
        onClose={() => setOpenCreate(false)}
        onSaved={async () => {
          setOpenCreate(false);
          await loadList();
        }}
      />

      <EditExerciseModal
        exercise={editing}
        presetIds={presetIds}
        onClose={() => setEditing(null)}
        onSaved={async () => {
          setEditing(null);
          await loadList();
        }}
      />
    </AppScreen>
  );
}

function CreateExerciseModal({
  open,
  date,
  presetIds,
  onClose,
  onSaved,
}: {
  open: boolean;
  date: string;
  presetIds: Set<string>;
  onClose: () => void;
  onSaved: () => Promise<void>;
}) {
  const [name, setName] = useState('');
  const [caloriesBurned, setCaloriesBurned] = useState('');
  const [presetId, setPresetId] = useState('');
  const [intensity, setIntensity] = useState<ExerciseIntensity>('moderate');
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

    try {
      setSaving(true);
      await postExercise({
        date: date.trim(),
        name: normalizedName,
        caloriesBurned: calories,
        intensity,
        presetId: normalizeNullableText(normalizedPresetId),
      });
      showToast('Exercise added.', 'success');
      setName('');
      setCaloriesBurned('');
      setPresetId('');
      await onSaved();
    } catch (error) {
      logAppError('exercise/create', error);
      showToast(toUserErrorMessage(error, 'Could not create exercise.'), 'error');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal visible={open} transparent animationType="slide" onRequestClose={onClose}>
      <View className="flex-1 justify-end bg-black/40">
        <Pressable className="flex-1" onPress={onClose} />
        <View className="gap-3 rounded-t-3xl bg-card p-4 dark:bg-darkCard">
          <Text className="text-lg font-semibold text-foreground dark:text-darkForeground">
            Add exercise
          </Text>
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
          <View className="gap-2">
            <Label>Preset ID (optional)</Label>
            <Input value={presetId} onChangeText={setPresetId} placeholder="running" />
          </View>
          <View className="gap-2">
            <Label>Intensity</Label>
            <SegmentedControl<ExerciseIntensity>
              value={intensity}
              options={intensityOptions.map((value) => ({ value, label: value }))}
              onChange={setIntensity}
            />
          </View>
          <Button disabled={saving} onPress={() => void handleSave()}>
            {saving ? 'Saving...' : 'Save'}
          </Button>
          <Button variant="outline" onPress={onClose}>
            Cancel
          </Button>
        </View>
      </View>
    </Modal>
  );
}

function EditExerciseModal({
  exercise,
  presetIds,
  onClose,
  onSaved,
}: {
  exercise: ExerciseWithId | null;
  presetIds: Set<string>;
  onClose: () => void;
  onSaved: () => Promise<void>;
}) {
  const [name, setName] = useState('');
  const [caloriesBurned, setCaloriesBurned] = useState('');
  const [notes, setNotes] = useState('');
  const [presetId, setPresetId] = useState('');
  const [intensity, setIntensity] = useState<ExerciseIntensity>('moderate');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!exercise) return;
    setName(exercise.name ?? '');
    setCaloriesBurned(String(exercise.caloriesBurned ?? ''));
    setNotes(exercise.notes ?? '');
    setPresetId(exercise.presetId ?? '');
    setIntensity(exercise.intensity ?? 'moderate');
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

    try {
      setSaving(true);
      await patchExercise(exercise.id, {
        name: normalizedName,
        caloriesBurned: calories,
        notes: normalizeNullableText(notes),
        presetId: normalizeNullableText(normalizedPresetId),
        intensity,
      });
      showToast('Exercise updated.', 'success');
      await onSaved();
    } catch (error) {
      logAppError('exercise/patch', error, { exerciseId: exercise.id });
      showToast(toUserErrorMessage(error, 'Could not update exercise.'), 'error');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal visible={Boolean(exercise)} transparent animationType="slide" onRequestClose={onClose}>
      <View className="flex-1 justify-end bg-black/40">
        <Pressable className="flex-1" onPress={onClose} />
        <View className="gap-3 rounded-t-3xl bg-card p-4 dark:bg-darkCard">
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
          <View className="gap-2">
            <Label>Preset ID</Label>
            <Input value={presetId} onChangeText={setPresetId} placeholder="running" />
          </View>
          <View className="gap-2">
            <Label>Notes</Label>
            <Input value={notes} onChangeText={setNotes} multiline className="min-h-[88px] py-3" />
          </View>
          <View className="gap-2">
            <Label>Intensity</Label>
            <SegmentedControl<ExerciseIntensity>
              value={intensity}
              options={intensityOptions.map((value) => ({ value, label: value }))}
              onChange={setIntensity}
            />
          </View>
          <Button disabled={saving} onPress={() => void handleSave()}>
            {saving ? 'Saving...' : 'Save changes'}
          </Button>
          <Button variant="outline" onPress={onClose}>
            Cancel
          </Button>
        </View>
      </View>
    </Modal>
  );
}
