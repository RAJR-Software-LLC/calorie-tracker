import { Zap } from 'lucide-react-native';
import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { SegmentedControl } from '@/components/ui/segmented-control';
import { useThemePalette } from '@/lib/use-theme-palette';
import { kgToLbs, quickEstimate } from '@/lib/utils/calories';

const activityLabels = {
  sedentary: 'Sedentary (little to no exercise)',
  light: 'Lightly active (1-3 days/week)',
  moderate: 'Moderately active (3-5 days/week)',
  active: 'Very active (6-7 days/week)',
} as const;

type QuickActivity = keyof typeof activityLabels;

type QuickCalculatorProps = {
  onResult: (maintenance: number) => void;
};

export function QuickCalculator({ onResult }: QuickCalculatorProps) {
  const p = useThemePalette();
  const [weight, setWeight] = useState('');
  const [unit, setUnit] = useState<'lbs' | 'kg'>('lbs');
  const [activity, setActivity] = useState<QuickActivity>('moderate');
  const [result, setResult] = useState<number | null>(null);

  function calculate() {
    const w = Number(weight);
    if (!w || w <= 0) return;
    const weightLbs = unit === 'kg' ? kgToLbs(w) : w;
    const cal = quickEstimate(weightLbs, activity);
    setResult(cal);
    onResult(cal);
  }

  return (
    <View className="gap-5">
      <View className="flex-row items-start gap-3 rounded-xl border border-primary/10 bg-primary/5 px-4 py-3 dark:border-darkPrimary/10 dark:bg-darkPrimary/5">
        <Zap size={16} color={p.primary} style={{ marginTop: 2 }} />
        <Text className="flex-1 text-sm leading-relaxed text-foreground dark:text-darkForeground">
          A simple estimate using your weight. Quick and easy to get started.
        </Text>
      </View>

      <View className="gap-2">
        <Label>Your weight</Label>
        <View className="flex-row gap-2">
          <Input
            keyboardType="decimal-pad"
            placeholder={unit === 'lbs' ? 'e.g. 160' : 'e.g. 72'}
            value={weight}
            onChangeText={setWeight}
            className="flex-1"
          />
          <SegmentedControl
            value={unit}
            options={['lbs', 'kg'].map((value) => ({ value, label: value }))}
            onChange={(value) => setUnit(value as 'lbs' | 'kg')}
            className="w-28"
          />
        </View>
      </View>

      <View className="gap-2">
        <Label>Activity level</Label>
        <View className="gap-2">
          {(Object.entries(activityLabels) as [QuickActivity, string][]).map(([key, label]) => (
            <Pressable
              key={key}
              className={`rounded-xl border px-4 py-3 ${
                activity === key
                  ? 'border-primary bg-primary/5 dark:border-darkPrimary dark:bg-darkPrimary/5'
                  : 'border-border bg-card dark:border-darkBorder dark:bg-darkCard'
              }`}
              onPress={() => setActivity(key)}
            >
              <Text
                className={`text-left text-sm ${
                  activity === key
                    ? 'text-foreground dark:text-darkForeground'
                    : 'text-muted-foreground dark:text-darkMutedForeground'
                }`}
              >
                {label}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      <Button size="lg" className="w-full" onPress={calculate}>
        Calculate
      </Button>

      {result ? (
        <View className="rounded-2xl border border-primary/10 bg-primary/5 p-6 dark:border-darkPrimary/10 dark:bg-darkPrimary/5">
          <Text className="text-center text-sm text-muted-foreground dark:text-darkMutedForeground">
            Estimated maintenance
          </Text>
          <Text className="mt-1 text-center text-3xl font-bold text-primary dark:text-darkPrimary">
            {result.toLocaleString()}{' '}
            <Text className="text-lg font-normal text-primary dark:text-darkPrimary">cal/day</Text>
          </Text>
        </View>
      ) : null}
    </View>
  );
}
