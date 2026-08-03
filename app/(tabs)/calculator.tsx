import { useMemo, useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { CalculatorProfileForm } from '@/components/calculator/calculator-profile-form';
import { CalculatorWarnings } from '@/components/calculator/calculator-warnings';
import { CustomOverrideBanner } from '@/components/calculator/custom-override-banner';
import { EstimateSkeleton } from '@/components/calculator/estimate-skeleton';
import { FormulaCatalogList } from '@/components/calculator/formula-catalog-list';
import { FormulaEstimateCard } from '@/components/calculator/formula-estimate-card';
import { FormulaExplanation } from '@/components/calculator/formula-explanation';
import { StaleSnapshotBanner } from '@/components/calculator/stale-snapshot-banner';
import { useCalculatorFlow } from '@/components/calculator/use-calculator-flow';
import { AppScreen } from '@/components/layout/app-screen';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { isCustomCalorieOverride, isSnapshotStale } from '@/lib/calculator';
import { formatCalorieGoal } from '@/lib/calorie-goal';
import { patchMe } from '@/lib/api';
import { logAppError, toUserErrorMessage } from '@/lib/app-errors';
import { updateMeCache, useMe } from '@/lib/queries';
import { queryClient } from '@/lib/queries/query-client';
import { showToast } from '@/lib/toast';
import { useAuth } from '@/components/auth/auth-provider';
import type { CalorieGoal } from '@/types';

export default function CalculatorScreen() {
  const { user } = useAuth();
  const { data: meFromQuery } = useMe();
  const flow = useCalculatorFlow({ persistProfileBeforeEstimate: true });
  const [showManual, setShowManual] = useState(false);
  const [manualMode, setManualMode] = useState<'single' | 'range'>('single');
  const [singleGoal, setSingleGoal] = useState('');
  const [rangeMin, setRangeMin] = useState('');
  const [rangeMax, setRangeMax] = useState('');
  const [savingManual, setSavingManual] = useState(false);

  const me = flow.me ?? meFromQuery;
  const stale = isSnapshotStale(me?.calorieCalculation, me?.profile, flow.catalogVersion);
  const customOverride = isCustomCalorieOverride(me);
  const canApply = flow.missingLabels.length === 0 && flow.selectedFormulaId != null;

  const snapshotSummary = useMemo(() => {
    const snap = me?.calorieCalculation;
    if (!snap) return null;
    return {
      tdee: Math.round(snap.tdee),
      goal: formatCalorieGoal(snap.recommendedCalorieGoal),
      formula: snap.formulaId,
    };
  }, [me?.calorieCalculation]);

  async function handleSaveManualGoal() {
    let calorieGoal: CalorieGoal | null = null;
    if (manualMode === 'single') {
      const target = Number.parseInt(singleGoal.trim(), 10);
      if (!Number.isInteger(target) || target <= 0) {
        showToast('Enter a valid calorie target.', 'error');
        return;
      }
      calorieGoal = { mode: 'single', target };
    } else {
      const min = Number.parseInt(rangeMin.trim(), 10);
      const max = Number.parseInt(rangeMax.trim(), 10);
      if (!Number.isInteger(min) || !Number.isInteger(max) || min <= 0 || max <= 0 || min > max) {
        showToast('Enter a valid calorie range.', 'error');
        return;
      }
      calorieGoal = { mode: 'range', min, max };
    }

    setSavingManual(true);
    try {
      const updated = await patchMe({ calorieGoal });
      if (updated && user?.uid) updateMeCache(queryClient, user.uid, updated);
      showToast('Calorie target saved.', 'success');
    } catch (err) {
      logAppError('calculator/manual-goal', err);
      showToast(toUserErrorMessage(err, 'Could not save your calorie target.'), 'error');
    } finally {
      setSavingManual(false);
    }
  }

  return (
    <AppScreen>
      <Text className="text-lg font-semibold text-foreground dark:text-darkForeground">
        Calorie calculator
      </Text>
      <Text className="text-sm text-muted-foreground dark:text-darkMutedForeground">
        Estimates use science-backed formulas from our servers. Choose a formula, preview results,
        then apply to update your maintenance and goal.
      </Text>

      {stale ? (
        <StaleSnapshotBanner
          onRecalculate={() => {
            void flow.runEstimate();
          }}
        />
      ) : null}
      {customOverride && !stale ? (
        <CustomOverrideBanner
          onRecalculate={() => {
            void flow.runEstimate();
          }}
        />
      ) : null}

      {snapshotSummary && (flow.meError || flow.estimateError) ? (
        <View className="rounded-xl border border-border bg-muted/40 px-3 py-3 dark:border-darkBorder dark:bg-darkMuted/40">
          <Text className="text-sm text-foreground dark:text-darkForeground">
            Showing your last saved calculation (TDEE {snapshotSummary.tdee} kcal, goal{' '}
            {snapshotSummary.goal ?? '—'}). Reconnect to recalculate.
          </Text>
        </View>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Your stats</CardTitle>
        </CardHeader>
        <CardContent>
          <CalculatorProfileForm value={flow.form} onChange={flow.setForm} />
          {flow.missingLabels.length > 0 ? (
            <Text className="mt-3 text-sm text-destructive">
              Missing: {flow.missingLabels.join(', ')}
            </Text>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Formulas</CardTitle>
        </CardHeader>
        <CardContent className="gap-3">
          {flow.formulasQuery.isLoading ? (
            <EstimateSkeleton count={3} />
          ) : flow.formulasQuery.isError ? (
            <View className="gap-2">
              <Text className="text-sm text-destructive">Could not load formulas.</Text>
              <Button variant="outline" onPress={() => void flow.formulasQuery.refetch()}>
                Retry
              </Button>
            </View>
          ) : (
            <FormulaCatalogList
              formulas={flow.formulasQuery.data?.formulas ?? []}
              selectedId={flow.selectedFormulaId}
              onSelect={flow.setSelectedFormulaId}
            />
          )}
          <Button
            onPress={() => void flow.runEstimate()}
            disabled={flow.estimating || flow.formulasQuery.isLoading}
          >
            {flow.estimating ? 'Estimating…' : 'Preview estimates'}
          </Button>
          {flow.estimateError ? (
            <Text className="text-sm text-destructive">{flow.estimateError}</Text>
          ) : null}
        </CardContent>
      </Card>

      {flow.estimating && flow.results.length === 0 ? <EstimateSkeleton /> : null}

      {flow.results.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Compare formulas</CardTitle>
          </CardHeader>
          <CardContent className="gap-3">
            {flow.results.map((estimate) => (
              <FormulaEstimateCard
                key={estimate.formulaId}
                estimate={estimate}
                selected={estimate.formulaId === flow.selectedFormulaId}
                onSelect={flow.setSelectedFormulaId}
              />
            ))}
          </CardContent>
        </Card>
      ) : null}

      {flow.selectedEstimate ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Selected result</CardTitle>
          </CardHeader>
          <CardContent className="gap-3">
            <Text className="text-2xl font-bold text-foreground dark:text-darkForeground">
              {Math.round(flow.selectedEstimate.tdee)}{' '}
              <Text className="text-base font-normal text-muted-foreground">kcal maintenance</Text>
            </Text>
            <Text className="text-sm text-muted-foreground dark:text-darkMutedForeground">
              Recommended goal:{' '}
              {formatCalorieGoal(flow.selectedEstimate.recommendedCalorieGoal) ?? '—'} kcal
            </Text>
            <CalculatorWarnings warnings={flow.selectedEstimate.warnings} />
            <FormulaExplanation
              steps={flow.selectedEstimate.explanationSteps}
              citations={flow.selectedEstimate.citations}
            />
            <Button
              disabled={!canApply || flow.applying}
              onPress={() => {
                void flow.runApply();
              }}
            >
              {flow.applying ? 'Applying…' : 'Apply formula'}
            </Button>
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <Pressable
            onPress={() => {
              setShowManual((v) => !v);
            }}
            accessibilityRole="button"
          >
            <CardTitle className="text-base">
              Manual goal override {showManual ? '▾' : '▸'}
            </CardTitle>
          </Pressable>
        </CardHeader>
        {showManual ? (
          <CardContent className="gap-3">
            <Text className="text-sm text-muted-foreground dark:text-darkMutedForeground">
              Power users can set targets directly. Prefer Apply above for science-backed goals.
            </Text>
            <View className="flex-row rounded-xl border border-border p-1 dark:border-darkBorder">
              {(['single', 'range'] as const).map((mode) => (
                <Pressable
                  key={mode}
                  onPress={() => {
                    setManualMode(mode);
                  }}
                  className={`flex-1 rounded-lg py-2.5 ${
                    manualMode === mode ? 'bg-primary dark:bg-darkPrimary' : ''
                  }`}
                >
                  <Text
                    className={`text-center text-sm font-semibold ${
                      manualMode === mode
                        ? 'text-primary-foreground dark:text-darkPrimaryForeground'
                        : 'text-muted-foreground dark:text-darkMutedForeground'
                    }`}
                  >
                    {mode === 'single' ? 'Single' : 'Range'}
                  </Text>
                </Pressable>
              ))}
            </View>
            {manualMode === 'single' ? (
              <>
                <Label>Daily calorie target</Label>
                <Input
                  keyboardType="number-pad"
                  value={singleGoal}
                  onChangeText={setSingleGoal}
                  placeholder="e.g. 2200"
                />
              </>
            ) : (
              <View className="flex-row gap-2">
                <View className="flex-1">
                  <Input
                    keyboardType="number-pad"
                    placeholder="Min"
                    value={rangeMin}
                    onChangeText={setRangeMin}
                  />
                </View>
                <View className="flex-1">
                  <Input
                    keyboardType="number-pad"
                    placeholder="Max"
                    value={rangeMax}
                    onChangeText={setRangeMax}
                  />
                </View>
              </View>
            )}
            <Button disabled={savingManual} onPress={() => void handleSaveManualGoal()}>
              {savingManual ? 'Saving…' : 'Save manual goal'}
            </Button>
          </CardContent>
        ) : null}
      </Card>
    </AppScreen>
  );
}
