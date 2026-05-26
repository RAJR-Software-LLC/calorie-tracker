import { Droplets, Plus } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Modal, Platform, Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAuth } from '@/components/auth/auth-provider';
import { useDashboard } from '@/components/dashboard/dashboard-context';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { patchMeWater, putMeWater } from '@/lib/api';
import { ApiError } from '@/lib/api/errors';
import { logAppError, toUserErrorMessage } from '@/lib/app-errors';
import { showToast } from '@/lib/toast';
import { useThemePalette } from '@/lib/use-theme-palette';
import {
  convertWaterAmount,
  formatWaterAmountDisplay,
  formatWaterAmountForInput,
  getWaterQuickAddPresets,
  waterUnitFormLabel,
} from '@/lib/utils/water-units';
import type { UserHabits, WaterDailyWithId, WaterUnit } from '@/types';

type WaterSectionProps = {
  date: string;
};

function goalForPut(
  row: WaterDailyWithId,
  habitsGoalAmount: number | null,
  habitsGoalUnit: WaterUnit | null
): { goalAmount: number | null; goalUnit: WaterUnit | null } {
  if (row.goalAmount != null && row.goalUnit != null) {
    return { goalAmount: row.goalAmount, goalUnit: row.goalUnit };
  }
  if (habitsGoalAmount != null && habitsGoalUnit != null) {
    return { goalAmount: habitsGoalAmount, goalUnit: habitsGoalUnit };
  }
  return { goalAmount: null, goalUnit: null };
}

export function WaterSection({ date }: WaterSectionProps) {
  const p = useThemePalette();
  const { user } = useAuth();
  const { waterDaily, habits, refreshWater, refreshAll } = useDashboard();
  const [setOpen, setSetOpen] = useState(false);

  if (habits.waterTrackingEnabled === false) {
    return null;
  }

  if (!waterDaily) {
    return null;
  }

  const row = waterDaily;
  const displayUnit = habits.waterDefaultUnit;
  const presets = getWaterQuickAddPresets(displayUnit);
  const totalInDisplayUnit = convertWaterAmount(row.totalAmount, row.unit, displayUnit);
  const goalPair = goalForPut(row, habits.waterGoalAmount ?? null, habits.waterGoalUnit ?? null);
  const hasGoal = goalPair.goalAmount != null && goalPair.goalUnit != null;

  async function on403() {
    await refreshAll();
  }

  async function handleDelta(deltaInDisplayUnit: number) {
    if (!user) return;
    const deltaAmount = convertWaterAmount(deltaInDisplayUnit, displayUnit, row.unit);
    try {
      await patchMeWater({ deltaAmount });
      await refreshWater();
      showToast('Water updated', 'success');
    } catch (err) {
      logAppError('dashboard/water/patch', err);
      if (err instanceof ApiError && err.status === 403) {
        await on403();
      }
      showToast(toUserErrorMessage(err, 'Could not update water'), 'error');
    }
  }

  return (
    <View className="gap-3">
      <View className="flex-row items-center justify-between">
        <View className="flex-row items-center gap-2">
          <Droplets size={18} color={p.primary} />
          <Text className="text-sm font-semibold text-foreground dark:text-darkForeground">
            {"Today's water"}
          </Text>
        </View>
        <View className="flex-row items-center gap-3">
          <Pressable className="flex-row items-center gap-1" onPress={() => setSetOpen(true)}>
            <Plus size={16} color={p.primary} />
            <Text className="text-sm font-medium text-primary dark:text-darkPrimary">
              Log water
            </Text>
          </Pressable>
        </View>
      </View>

      <View className="rounded-xl border border-border/50 bg-card px-4 py-3 dark:border-darkBorder dark:bg-darkCard">
        <Text className="text-2xl font-bold text-foreground dark:text-darkForeground">
          {formatWaterAmountDisplay(totalInDisplayUnit, displayUnit)}
        </Text>
        {hasGoal ? (
          <Text className="mt-1 text-sm text-muted-foreground dark:text-darkMutedForeground">
            Goal: {formatWaterAmountDisplay(goalPair.goalAmount!, goalPair.goalUnit!)}
          </Text>
        ) : (
          <Text className="mt-1 text-sm text-muted-foreground dark:text-darkMutedForeground">
            No goal set — add one in Settings
          </Text>
        )}
      </View>

      <View className="flex-row flex-wrap gap-2">
        {presets.map((pr) => (
          <Pressable
            key={pr.label}
            onPress={() => void handleDelta(pr.deltaInUnit)}
            className="rounded-full border border-primary/30 bg-primary/5 px-3 py-2 active:opacity-80 dark:border-darkPrimary/40 dark:bg-darkPrimary/15"
          >
            <Text className="text-sm font-medium text-primary dark:text-darkPrimary">
              +{pr.label}
            </Text>
          </Pressable>
        ))}
      </View>

      <WaterSetTotalModal
        open={setOpen}
        onOpenChange={setSetOpen}
        date={date}
        row={row}
        displayUnit={displayUnit}
        habits={habits}
        on403={on403}
        refreshWater={refreshWater}
      />
    </View>
  );
}

function WaterSetTotalModal({
  open,
  onOpenChange,
  date,
  row,
  displayUnit,
  habits,
  on403,
  refreshWater,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  date: string;
  row: WaterDailyWithId;
  displayUnit: WaterUnit;
  habits: UserHabits;
  on403: () => Promise<void>;
  refreshWater: () => Promise<void>;
}) {
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const initialDisplay = convertWaterAmount(row.totalAmount, row.unit, displayUnit);
  const [amount, setAmount] = useState(() =>
    formatWaterAmountForInput(initialDisplay, displayUnit)
  );
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) {
      const v = convertWaterAmount(row.totalAmount, row.unit, displayUnit);
      setAmount(formatWaterAmountForInput(v, displayUnit));
    }
  }, [open, row.totalAmount, row.unit, displayUnit]);

  const goalPair = goalForPut(row, habits.waterGoalAmount ?? null, habits.waterGoalUnit ?? null);

  async function submit() {
    if (!user) return;
    const n = Number(amount.trim());
    if (!Number.isFinite(n) || n < 0) {
      showToast('Enter a valid amount', 'error');
      return;
    }
    setLoading(true);
    try {
      const totalInRowUnit = convertWaterAmount(n, displayUnit, row.unit);
      await putMeWater({
        date,
        totalAmount: totalInRowUnit,
        unit: row.unit,
        goalAmount: goalPair.goalAmount,
        goalUnit: goalPair.goalUnit,
      });
      await refreshWater();
      showToast('Water total saved', 'success');
      onOpenChange(false);
    } catch (err) {
      logAppError('dashboard/water/put', err);
      if (err instanceof ApiError && err.status === 403) {
        await on403();
      }
      showToast(toUserErrorMessage(err, 'Could not save water total'), 'error');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal
      visible={open}
      animationType="slide"
      transparent
      onRequestClose={() => onOpenChange(false)}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        className="flex-1 justify-end bg-black/40"
      >
        <Pressable className="flex-1" onPress={() => onOpenChange(false)} />
        <View
          className="rounded-t-3xl bg-card px-4 pt-4 dark:bg-darkCard"
          style={{ paddingBottom: insets.bottom + 24 }}
        >
          <Text className="text-xl font-semibold text-foreground dark:text-darkForeground">
            Set water total
          </Text>
          <Text className="mt-1 text-sm text-muted-foreground dark:text-darkMutedForeground">
            Amount in {waterUnitFormLabel(displayUnit)}
          </Text>
          <Input
            className="mt-3"
            value={amount}
            onChangeText={setAmount}
            keyboardType="decimal-pad"
            placeholder="0"
            accessibilityLabel="Water total amount"
          />
          <Button className="mt-4" onPress={() => void submit()} disabled={loading}>
            {loading ? 'Saving…' : 'Save'}
          </Button>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
