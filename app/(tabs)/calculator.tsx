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

type TabKey = 'quick' | 'advanced';

export default function CalculatorScreen() {
  const { refreshAll } = useDashboard();
  const [tab, setTab] = useState<TabKey>('quick');
  const [maintenance, setMaintenance] = useState<number | null>(null);
  const [manualGoal, setManualGoal] = useState('');
  const [savingCalculated, setSavingCalculated] = useState(false);
  const [savingManualGoal, setSavingManualGoal] = useState(false);

  const roundedMaintenance = maintenance != null ? Math.round(maintenance) : null;
  const manualGoalRaw = Number(String(manualGoal).trim());
  const manualGoalValue = Number.isFinite(manualGoalRaw) && manualGoalRaw > 0 ? Math.round(manualGoalRaw) : null;

  async function handleUpdateFromCalculation() {
    if (!roundedMaintenance || roundedMaintenance <= 0) {
      return;
    }

    setSavingCalculated(true);
    try {
      await patchMe({
        maintenanceCalories: roundedMaintenance,
        goalCalories: roundedMaintenance,
      });
      await refreshAll();
      setManualGoal(String(roundedMaintenance));
      showToast('Maintenance and calorie target updated.', 'success');
    } catch (err) {
      logAppError('calculator/update-from-calculation', err);
      showToast(toUserErrorMessage(err, 'Could not update your calorie target. Please try again.'), 'error');
    } finally {
      setSavingCalculated(false);
    }
  }

  async function handleSaveManualGoal() {
    if (!manualGoalValue || manualGoalValue <= 0) {
      showToast('Enter a valid calorie target.', 'error');
      return;
    }

    setSavingManualGoal(true);
    try {
      await patchMe({ goalCalories: manualGoalValue });
      await refreshAll();
      setManualGoal(String(manualGoalValue));
      showToast('Calorie target saved.', 'success');
    } catch (err) {
      logAppError('calculator/save-manual-goal', err);
      showToast(toUserErrorMessage(err, 'Could not save your calorie target. Please try again.'), 'error');
    } finally {
      setSavingManualGoal(false);
    }
  }

  return (
    <AppScreen>
      <Text className="text-lg font-semibold text-foreground dark:text-darkForeground">Calculator</Text>
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
              {Math.round(maintenance)} <Text className="text-base font-normal text-muted-foreground">kcal/day</Text>
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
            <Label>Daily calorie target</Label>
            <Input
              keyboardType="number-pad"
              placeholder="e.g. 2200"
              value={manualGoal}
              onChangeText={setManualGoal}
            />
            <Text className="text-sm text-muted-foreground dark:text-darkMutedForeground">
              Choose a number that feels right for your routine and preferences.
            </Text>
            <Button
              className="mt-2"
              disabled={savingManualGoal || manualGoalValue == null}
              onPress={handleSaveManualGoal}
            >
              {savingManualGoal ? 'Saving...' : 'Save goal'}
            </Button>
          </View>
        </CardContent>
      </Card>
    </AppScreen>
  );
}
