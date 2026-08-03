import { useState } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';
import { useRouter } from 'expo-router';

import { CalculatorProfileForm } from '@/components/calculator/calculator-profile-form';
import { CalculatorWarnings } from '@/components/calculator/calculator-warnings';
import { EstimateSkeleton } from '@/components/calculator/estimate-skeleton';
import { FormulaEstimateCard } from '@/components/calculator/formula-estimate-card';
import { FormulaExplanation } from '@/components/calculator/formula-explanation';
import { useCalculatorFlow } from '@/components/calculator/use-calculator-flow';
import { AppScreen } from '@/components/layout/app-screen';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatCalorieGoal } from '@/lib/calorie-goal';
import { useThemePalette } from '@/lib/use-theme-palette';

type Step = 'profile' | 'compare';

export default function GoalsOnboardingScreen() {
  const router = useRouter();
  const p = useThemePalette();
  const flow = useCalculatorFlow({ persistProfileBeforeEstimate: true });
  const [step, setStep] = useState<Step>('profile');

  async function handleContinueFromProfile() {
    const response = await flow.runEstimate();
    if (response) {
      setStep('compare');
    }
  }

  async function handleApply() {
    const result = await flow.runApply();
    if (result) {
      router.replace('/(tabs)');
    }
  }

  if (flow.meLoading && !flow.me) {
    return (
      <View className="flex-1 items-center justify-center bg-background dark:bg-darkBackground">
        <ActivityIndicator size="large" color={p.primary} />
      </View>
    );
  }

  return (
    <AppScreen showHeader={false}>
      <Text className="text-2xl font-bold text-foreground dark:text-darkForeground">
        Set your calorie goals
      </Text>
      <Text className="text-sm text-muted-foreground dark:text-darkMutedForeground">
        We use proven formulas on our servers to estimate maintenance calories and a recommended
        daily target.
      </Text>

      {step === 'profile' ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">About you</CardTitle>
          </CardHeader>
          <CardContent className="gap-4">
            <CalculatorProfileForm value={flow.form} onChange={flow.setForm} />
            {flow.estimateError ? (
              <Text className="text-sm text-destructive">{flow.estimateError}</Text>
            ) : null}
            {flow.missingLabels.length > 0 ? (
              <Text className="text-sm text-muted-foreground dark:text-darkMutedForeground">
                Needed: {flow.missingLabels.join(', ')}
              </Text>
            ) : null}
            <Button disabled={flow.estimating} onPress={() => void handleContinueFromProfile()}>
              {flow.estimating ? 'Calculating…' : 'Continue'}
            </Button>
          </CardContent>
        </Card>
      ) : null}

      {step === 'compare' ? (
        <>
          {flow.estimating ? <EstimateSkeleton /> : null}
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
              <Button
                variant="outline"
                onPress={() => {
                  setStep('profile');
                }}
              >
                Edit stats
              </Button>
            </CardContent>
          </Card>

          {flow.selectedEstimate ? (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Confirm</CardTitle>
              </CardHeader>
              <CardContent className="gap-3">
                <Text className="text-2xl font-bold text-foreground dark:text-darkForeground">
                  {Math.round(flow.selectedEstimate.tdee)}{' '}
                  <Text className="text-base font-normal text-muted-foreground">
                    kcal maintenance
                  </Text>
                </Text>
                <Text className="text-sm text-muted-foreground dark:text-darkMutedForeground">
                  Recommended goal:{' '}
                  {formatCalorieGoal(flow.selectedEstimate.recommendedCalorieGoal) ?? '—'} kcal (
                  {flow.form.goalType})
                </Text>
                <CalculatorWarnings warnings={flow.selectedEstimate.warnings} />
                <FormulaExplanation
                  steps={flow.selectedEstimate.explanationSteps}
                  citations={flow.selectedEstimate.citations}
                />
                <Button disabled={flow.applying} onPress={() => void handleApply()}>
                  {flow.applying ? 'Saving…' : 'Apply and continue'}
                </Button>
              </CardContent>
            </Card>
          ) : null}
        </>
      ) : null}
    </AppScreen>
  );
}
