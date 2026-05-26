import { useCallback, useEffect, useState } from 'react';
import { Pressable, Switch, Text, View } from 'react-native';
import { Activity, Droplets, Lock } from 'lucide-react-native';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { getMe, patchMe } from '@/lib/api';
import { ApiError } from '@/lib/api/errors';
import { logAppError, toUserErrorMessage } from '@/lib/app-errors';
import { showToast } from '@/lib/toast';
import { useThemePalette } from '@/lib/use-theme-palette';
import { formatFirstValidationDetail } from '@/lib/utils/api-validation-details';
import { mergeUserHabits } from '@/lib/utils/user-habits';
import { WATER_UNIT_OPTIONS } from '@/lib/utils/water-units';
import type { GetMeResponse, WaterUnit } from '@/types';

type HabitsSettingsProps = {
  profile: GetMeResponse;
  disabled: boolean;
  onUpdated: (me: GetMeResponse) => void;
  /** When true, render fields only (no Card / title row) for use inside a parent collapsible. */
  embedded?: boolean;
};

function UnitChips({
  value,
  onChange,
  disabled,
}: {
  value: WaterUnit;
  onChange: (u: WaterUnit) => void;
  disabled: boolean;
}) {
  return (
    <View className="flex-row flex-wrap gap-2">
      {WATER_UNIT_OPTIONS.map((opt) => {
        const selected = value === opt.value;
        return (
          <Pressable
            key={opt.value}
            onPress={() => onChange(opt.value)}
            disabled={disabled}
            className={`rounded-full border px-3 py-2 ${selected ? 'border-primary bg-primary/10 dark:border-darkPrimary dark:bg-darkPrimary/20' : 'border-border dark:border-darkBorder'} disabled:opacity-50`}
          >
            <Text className="text-sm font-medium text-foreground dark:text-darkForeground">
              {opt.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export function HabitsSettings({
  profile,
  disabled,
  onUpdated,
  embedded = false,
}: HabitsSettingsProps) {
  const p = useThemePalette();
  const merged = mergeUserHabits(profile?.habits);

  const [exerciseOn, setExerciseOn] = useState(merged.exerciseTrackingEnabled !== false);
  const [waterOn, setWaterOn] = useState(merged.waterTrackingEnabled !== false);
  const [waterDefaultUnit, setWaterDefaultUnit] = useState<WaterUnit>(merged.waterDefaultUnit);
  const [goalAmountInput, setGoalAmountInput] = useState(
    merged.waterGoalAmount != null ? String(merged.waterGoalAmount) : ''
  );
  const [goalUnit, setGoalUnit] = useState<WaterUnit>(
    merged.waterGoalUnit ?? merged.waterDefaultUnit
  );
  const [habitsBusy, setHabitsBusy] = useState(false);
  const [waterPrefsBusy, setWaterPrefsBusy] = useState(false);

  useEffect(() => {
    const h = mergeUserHabits(profile?.habits);
    setExerciseOn(h.exerciseTrackingEnabled !== false);
    setWaterOn(h.waterTrackingEnabled !== false);
    setWaterDefaultUnit(h.waterDefaultUnit);
    setGoalAmountInput(h.waterGoalAmount != null ? String(h.waterGoalAmount) : '');
    setGoalUnit(h.waterGoalUnit ?? h.waterDefaultUnit);
  }, [profile]);

  const patchHabits = useCallback(
    async (body: NonNullable<Parameters<typeof patchMe>[0]['habits']>) => {
      if (!body || Object.keys(body).length === 0) return;
      setHabitsBusy(true);
      try {
        let me = await patchMe({ habits: body });
        if (!me) me = await getMe();
        onUpdated(me);
        showToast('Preferences saved', 'success');
      } catch (err) {
        logAppError('settings/patchHabits', err);
        const detail = formatFirstValidationDetail(err instanceof ApiError ? err.body : null);
        showToast(detail ?? toUserErrorMessage(err, 'Could not update habits'), 'error');
        const h = mergeUserHabits(profile?.habits);
        setExerciseOn(h.exerciseTrackingEnabled !== false);
        setWaterOn(h.waterTrackingEnabled !== false);
      } finally {
        setHabitsBusy(false);
      }
    },
    [onUpdated, profile?.habits]
  );

  const handleExerciseToggle = (next: boolean) => {
    if (disabled || habitsBusy) return;
    setExerciseOn(next);
    // Include sibling toggles so a strict/replace merge on the server does not clear water.
    void patchHabits({ exerciseTrackingEnabled: next, waterTrackingEnabled: waterOn });
  };

  const handleWaterToggle = (next: boolean) => {
    if (disabled || habitsBusy) return;
    setWaterOn(next);
    void patchHabits({ waterTrackingEnabled: next, exerciseTrackingEnabled: exerciseOn });
  };

  const handleSaveWaterPrefs = async () => {
    if (disabled || waterPrefsBusy) return;
    const trimmed = goalAmountInput.trim();
    let waterGoalAmount: number | null = null;
    if (trimmed.length > 0) {
      const n = Number(trimmed);
      if (!Number.isFinite(n) || n <= 0) {
        showToast('Enter a positive goal amount or leave blank.', 'error');
        return;
      }
      waterGoalAmount = n;
    }
    setWaterPrefsBusy(true);
    try {
      let me = await patchMe({
        habits: {
          exerciseTrackingEnabled: exerciseOn,
          waterTrackingEnabled: waterOn,
          waterDefaultUnit,
          waterGoalAmount,
          waterGoalUnit: waterGoalAmount != null ? goalUnit : null,
        },
      });
      if (!me) me = await getMe();
      onUpdated(me);
      showToast('Water preferences saved', 'success');
    } catch (err) {
      logAppError('settings/patchWaterPrefs', err);
      const detail = formatFirstValidationDetail(err instanceof ApiError ? err.body : null);
      showToast(detail ?? toUserErrorMessage(err, 'Could not save water preferences'), 'error');
    } finally {
      setWaterPrefsBusy(false);
    }
  };

  const fields = (
    <>
      <View className="flex-row items-center py-3">
        <View className="min-w-0 flex-1 flex-row items-center gap-2 pr-3">
          <Lock size={16} color={p.mutedForeground} />
          <View className="min-w-0 flex-1">
            <Text className="text-base font-medium text-foreground dark:text-darkForeground">
              Calorie tracking
            </Text>
            <Text className="text-xs text-muted-foreground dark:text-darkMutedForeground">
              Always on for your account
            </Text>
          </View>
        </View>
        <View className="shrink-0">
          <Switch value disabled accessibilityLabel="Calorie tracking always enabled" />
        </View>
      </View>

      <View className="h-px bg-border/50 dark:bg-darkBorder/50" />

      <View className="flex-row items-center py-3">
        <View className="min-w-0 flex-1 flex-row items-center gap-2 pr-3">
          <Activity size={18} color={p.mutedForeground} />
          <Text
            className="min-w-0 flex-1 text-base font-medium text-foreground dark:text-darkForeground"
            numberOfLines={2}
          >
            Exercise logging
          </Text>
        </View>
        <View className="shrink-0">
          <Switch
            value={exerciseOn}
            onValueChange={handleExerciseToggle}
            disabled={disabled || habitsBusy}
            accessibilityLabel="Toggle exercise logging"
          />
        </View>
      </View>

      <View className="h-px bg-border/50 dark:bg-darkBorder/50" />

      <View className="flex-row items-center py-3">
        <View className="min-w-0 flex-1 flex-row items-center gap-2 pr-3">
          <Droplets size={18} color={p.mutedForeground} />
          <Text
            className="min-w-0 flex-1 text-base font-medium text-foreground dark:text-darkForeground"
            numberOfLines={2}
          >
            Water tracking
          </Text>
        </View>
        <View className="shrink-0">
          <Switch
            value={waterOn}
            onValueChange={handleWaterToggle}
            disabled={disabled || habitsBusy}
            accessibilityLabel="Toggle water tracking"
          />
        </View>
      </View>

      {waterOn ? (
        <>
          <View className="mt-2 rounded-xl bg-muted/40 p-3 dark:bg-darkMuted/25">
            <Text className="mb-2 text-sm font-medium text-foreground dark:text-darkForeground">
              Water defaults
            </Text>
            <Text className="mb-2 text-xs text-muted-foreground dark:text-darkMutedForeground">
              Default unit for dashboard quick-add and new totals
            </Text>
            <Text className="mb-1 text-xs font-medium text-muted-foreground dark:text-darkMutedForeground">
              Default unit
            </Text>
            <UnitChips
              value={waterDefaultUnit}
              onChange={setWaterDefaultUnit}
              disabled={disabled || waterPrefsBusy}
            />

            <Text className="mb-1 mt-4 text-xs font-medium text-muted-foreground dark:text-darkMutedForeground">
              Goal unit
            </Text>
            <UnitChips
              value={goalUnit}
              onChange={setGoalUnit}
              disabled={disabled || waterPrefsBusy}
            />

            <Text className="mb-1 mt-4 text-xs font-medium text-muted-foreground dark:text-darkMutedForeground">
              Goal amount (optional)
            </Text>
            <Input
              value={goalAmountInput}
              onChangeText={setGoalAmountInput}
              placeholder="e.g. 2000"
              keyboardType="decimal-pad"
              editable={!disabled && !waterPrefsBusy}
              accessibilityLabel="Water goal amount"
            />
          </View>

          <Button
            className="mt-3"
            onPress={() => void handleSaveWaterPrefs()}
            disabled={disabled || waterPrefsBusy}
          >
            {waterPrefsBusy ? 'Saving…' : 'Save water preferences'}
          </Button>
        </>
      ) : null}
    </>
  );

  if (embedded) {
    return fields;
  }

  return (
    <Card>
      <CardContent className="p-4">
        <View className="mb-3 flex-row items-center gap-3">
          <View className="h-12 w-12 items-center justify-center rounded-full bg-primary/15 dark:bg-darkPrimary/25">
            <Droplets size={22} color={p.primary} />
          </View>
          <View className="flex-1">
            <Text className="text-lg font-semibold text-foreground dark:text-darkForeground">
              Habits and water
            </Text>
            <Text className="text-sm text-muted-foreground dark:text-darkMutedForeground">
              Optional tracking features
            </Text>
          </View>
        </View>
        {fields}
      </CardContent>
    </Card>
  );
}
