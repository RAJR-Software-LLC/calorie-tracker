import { Pressable, Text, View } from 'react-native';

import { formatCalorieGoal } from '@/lib/calorie-goal';
import type { FormulaEstimate, FormulaId } from '@/types';

type FormulaEstimateCardProps = {
  estimate: FormulaEstimate;
  selected: boolean;
  onSelect: (id: FormulaId) => void;
};

export function FormulaEstimateCard({ estimate, selected, onSelect }: FormulaEstimateCardProps) {
  const goalLabel = formatCalorieGoal(estimate.recommendedCalorieGoal) ?? '—';

  return (
    <Pressable
      onPress={() => {
        onSelect(estimate.formulaId);
      }}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      className={`rounded-xl border px-4 py-3 active:opacity-90 ${
        selected
          ? 'border-primary bg-primary/5 dark:border-darkPrimary dark:bg-darkPrimary/10'
          : 'border-border bg-card dark:border-darkBorder dark:bg-darkCard'
      }`}
    >
      <View className="flex-row items-center justify-between gap-2">
        <Text className="flex-1 text-base font-semibold text-foreground dark:text-darkForeground">
          {estimate.name}
        </Text>
        {estimate.isRecommended || estimate.isDefault ? (
          <View className="rounded-md bg-primary/15 px-2 py-0.5 dark:bg-darkPrimary/20">
            <Text className="text-xs font-semibold text-primary dark:text-darkPrimary">
              Recommended
            </Text>
          </View>
        ) : null}
      </View>
      <View className="mt-3 flex-row flex-wrap gap-x-4 gap-y-2">
        <Metric label="BMR" value={`${Math.round(estimate.bmr)}`} />
        <Metric label="TDEE" value={`${Math.round(estimate.tdee)}`} />
        <Metric label="Goal" value={`${goalLabel}`} />
      </View>
    </Pressable>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <View>
      <Text className="text-xs text-muted-foreground dark:text-darkMutedForeground">{label}</Text>
      <Text className="text-sm font-semibold text-foreground dark:text-darkForeground">
        {value} <Text className="text-xs font-normal text-muted-foreground">kcal</Text>
      </Text>
    </View>
  );
}
