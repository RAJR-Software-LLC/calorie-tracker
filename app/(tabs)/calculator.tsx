import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { AdvancedCalculator } from '@/components/calculator/advanced-calculator';
import { QuickCalculator } from '@/components/calculator/quick-calculator';
import { useDashboard } from '@/components/dashboard/dashboard-context';
import { AppScreen } from '@/components/layout/app-screen';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { patchMe } from '@/lib/api';
import { logAppError, toUserErrorMessage } from '@/lib/app-errors';
import { showToast } from '@/lib/toast';
import type { CalorieGoal } from '@/types';

type TabKey = 'quick' | 'advanced';
type GoalMode = 'single' | 'range';

export default function CalculatorScreen() {
  const { refreshAll } = useDashboard();
  const [tab, setTab] = useState<TabKey>('quick');
  const [maintenance, setMaintenance] = useState<number | null>(null);
  const [goalMode, setGoalMode] = useState<GoalMode>('single');
  const [singleGoal, setSingleGoal] = useState('');
  const [rangeMinGoal, setRangeMinGoal] = useState('');
  const [rangeMaxGoal, setRangeMaxGoal] = useState('');
  const [rangeError, setRangeError] = useState<string | null>(null);
  const [savingCalculated, setSavingCalculated] = useState(false);
  const [savingManualGoal, setSavingManualGoal] = useState(false);

  const roundedMaintenance = maintenance != null ? Math.round(maintenance) : null;

  function parseIntegerInput(value: string): number | null {
    const trimmed = value.trim();
    if (!/^\d+$/.test(trimmed)) return null;
    return Number.parseInt(trimmed, 10);
  }

  const singleGoalValue = parseIntegerInput(singleGoal);
  const rangeMinValue = parseIntegerInput(rangeMinGoal);
  const rangeMaxValue = parseIntegerInput(rangeMaxGoal);
  const isRangeValid =
    rangeMinValue != null &&
    rangeMaxValue != null &&
    rangeMinValue > 0 &&
    rangeMaxValue > 0 &&
    rangeMinValue <= rangeMaxValue;
  const canSaveManualGoal =
    goalMode === 'single' ? singleGoalValue != null && singleGoalValue > 0 : isRangeValid;

  async function handleUpdateFromCalculation() {
    if (!roundedMaintenance || roundedMaintenance <= 0) {
      return;
    }

    setSavingCalculated(true);
    try {
      await patchMe({
        maintenanceCalories: roundedMaintenance,
        calorieGoal: { mode: 'single', target: roundedMaintenance },
      });
      await refreshAll();
      setGoalMode('single');
      setSingleGoal(String(roundedMaintenance));
      setRangeError(null);
      showToast('Maintenance and calorie target updated.', 'success');
    } catch (err) {
      logAppError('calculator/update-from-calculation', err);
      showToast(
        toUserErrorMessage(err, 'Could not update your calorie target. Please try again.'),
        'error'
      );
    } finally {
      setSavingCalculated(false);
    }
  }

  async function handleSaveManualGoal() {
    let calorieGoal: CalorieGoal | null = null;
    if (goalMode === 'single') {
      if (!singleGoalValue || singleGoalValue <= 0) {
        showToast('Enter a valid calorie target.', 'error');
        return;
      }
      calorieGoal = { mode: 'single', target: singleGoalValue };
      setRangeError(null);
    } else {
      if (
        rangeMinValue == null ||
        rangeMaxValue == null ||
        rangeMinValue <= 0 ||
        rangeMaxValue <= 0
      ) {
        setRangeError('Enter whole numbers greater than zero for both range values.');
        return;
      }
      if (rangeMinValue > rangeMaxValue) {
        setRangeError('Minimum calories must be less than or equal to maximum calories.');
        return;
      }
      setRangeError(null);
      calorieGoal = { mode: 'range', min: rangeMinValue, max: rangeMaxValue };
    }

    if (!calorieGoal) {
      return;
    }

    setSavingManualGoal(true);
    try {
      await patchMe({ calorieGoal });
      await refreshAll();
      if (calorieGoal.mode === 'single') {
        setSingleGoal(String(calorieGoal.target));
      } else {
        setRangeMinGoal(String(calorieGoal.min));
        setRangeMaxGoal(String(calorieGoal.max));
      }
      showToast('Calorie target saved.', 'success');
    } catch (err) {
      logAppError('calculator/save-manual-goal', err);
      showToast(
        toUserErrorMessage(err, 'Could not save your calorie target. Please try again.'),
        'error'
      );
    } finally {
      setSavingManualGoal(false);
    }
  }

  async function handleClearGoal() {
    setSavingManualGoal(true);
    try {
      await patchMe({ calorieGoal: null });
      await refreshAll();
      setSingleGoal('');
      setRangeMinGoal('');
      setRangeMaxGoal('');
      setRangeError(null);
      showToast('Calorie goal cleared.', 'success');
    } catch (err) {
      logAppError('calculator/clear-manual-goal', err);
      showToast(
        toUserErrorMessage(err, 'Could not clear your calorie goal. Please try again.'),
        'error'
      );
    } finally {
      setSavingManualGoal(false);
    }
  }

  return (
    <AppScreen>
      <Text className="text-lg font-semibold text-foreground dark:text-darkForeground">
        Calculator
      </Text>
      <Text className="text-sm text-muted-foreground dark:text-darkMutedForeground">
        Estimate maintenance calories, then set a calorie target that works for you.
      </Text>

      <View className="flex-row rounded-xl border border-border p-1 dark:border-darkBorder">
        {(['quick', 'advanced'] as const).map((key) => (
          <Pressable
            key={key}
            onPress={() => setTab(key)}
            className={`flex-1 rounded-lg py-2.5 ${tab === key ? 'bg-primary dark:bg-darkPrimary' : ''}`}
          >
            <Text
              className={`text-center text-sm font-semibold ${
                tab === key
                  ? 'text-primary-foreground dark:text-darkPrimaryForeground'
                  : 'text-muted-foreground dark:text-darkMutedForeground'
              }`}
            >
              {key === 'quick' ? 'Quick' : 'Advanced'}
            </Text>
          </Pressable>
        ))}
      </View>

      {tab === 'quick' ? (
        <QuickCalculator onResult={setMaintenance} />
      ) : (
        <AdvancedCalculator onResult={setMaintenance} />
      )}

      {maintenance != null ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Estimated maintenance</CardTitle>
          </CardHeader>
          <CardContent>
            <Text className="text-2xl font-bold text-foreground dark:text-darkForeground">
              {Math.round(maintenance)}{' '}
              <Text className="text-base font-normal text-muted-foreground">kcal/day</Text>
            </Text>
            <Button
              className="mt-4"
              disabled={savingCalculated || roundedMaintenance == null || roundedMaintenance <= 0}
              onPress={handleUpdateFromCalculation}
            >
              {savingCalculated ? 'Saving...' : 'Update maintenance and goal'}
            </Button>
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Set calorie target manually</CardTitle>
        </CardHeader>
        <CardContent>
          <View className="gap-2">
            <Label>Goal mode</Label>
            <View className="flex-row rounded-xl border border-border p-1 dark:border-darkBorder">
              {(['single', 'range'] as const).map((mode) => (
                <Pressable
                  key={mode}
                  onPress={() => {
                    setGoalMode(mode);
                    setRangeError(null);
                  }}
                  className={`flex-1 rounded-lg py-2.5 ${
                    goalMode === mode ? 'bg-primary dark:bg-darkPrimary' : ''
                  }`}
                >
                  <Text
                    className={`text-center text-sm font-semibold ${
                      goalMode === mode
                        ? 'text-primary-foreground dark:text-darkPrimaryForeground'
                        : 'text-muted-foreground dark:text-darkMutedForeground'
                    }`}
                  >
                    {mode === 'single' ? 'Single target' : 'Range target'}
                  </Text>
                </Pressable>
              ))}
            </View>
            {goalMode === 'single' ? (
              <>
                <Label>Daily calorie target</Label>
                <Input
                  keyboardType="number-pad"
                  placeholder="e.g. 2200"
                  value={singleGoal}
                  onChangeText={setSingleGoal}
                />
              </>
            ) : (
              <>
                <Label>Daily calorie range</Label>
                <View className="flex-row gap-2">
                  <View className="flex-1">
                    <Input
                      keyboardType="number-pad"
                      placeholder="Min (e.g. 1600)"
                      value={rangeMinGoal}
                      onChangeText={(value) => {
                        setRangeMinGoal(value);
                        setRangeError(null);
                      }}
                    />
                  </View>
                  <View className="flex-1">
                    <Input
                      keyboardType="number-pad"
                      placeholder="Max (e.g. 1800)"
                      value={rangeMaxGoal}
                      onChangeText={(value) => {
                        setRangeMaxGoal(value);
                        setRangeError(null);
                      }}
                    />
                  </View>
                </View>
                {rangeError ? <Text className="text-sm text-destructive">{rangeError}</Text> : null}
              </>
            )}
            <Text className="text-sm text-muted-foreground dark:text-darkMutedForeground">
              Range goals are encouraged. A flexible estimate can be more sustainable than exact
              precision.
            </Text>
            <Button
              className="mt-2"
              disabled={savingManualGoal || !canSaveManualGoal}
              onPress={handleSaveManualGoal}
            >
              {savingManualGoal ? 'Saving...' : 'Save goal'}
            </Button>
            <Button variant="outline" disabled={savingManualGoal} onPress={handleClearGoal}>
              Clear goal
            </Button>
          </View>
        </CardContent>
      </Card>
    </AppScreen>
  );
}
