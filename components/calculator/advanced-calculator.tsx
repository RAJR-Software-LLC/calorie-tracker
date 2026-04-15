import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { Sparkles } from 'lucide-react-native';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { SegmentedControl } from '@/components/ui/segmented-control';
import { useThemePalette } from '@/lib/use-theme-palette';
import {
  feetInchesToCm,
  lbsToKg,
  mifflinStJeor,
  type ActivityLevel,
  type Sex,
} from '@/lib/utils/calories';

const activityLabels: Record<ActivityLevel, string> = {
  sedentary: 'Sedentary (office job, little exercise)',
  light: 'Lightly active (1-3 days/week)',
  moderate: 'Moderately active (3-5 days/week)',
  active: 'Active (6-7 days/week)',
  very_active: 'Very active (intense daily exercise)',
};

type AdvancedCalculatorProps = {
  onResult: (maintenance: number) => void;
};

export function AdvancedCalculator({ onResult }: AdvancedCalculatorProps) {
  const p = useThemePalette();
  const [weightUnit, setWeightUnit] = useState<'lbs' | 'kg'>('lbs');
  const [heightUnit, setHeightUnit] = useState<'imperial' | 'metric'>('imperial');
  const [weight, setWeight] = useState('');
  const [heightCm, setHeightCm] = useState('');
  const [heightFeet, setHeightFeet] = useState('');
  const [heightInches, setHeightInches] = useState('');
  const [age, setAge] = useState('');
  const [sex, setSex] = useState<Sex>('male');
  const [activity, setActivity] = useState<ActivityLevel>('moderate');
  const [result, setResult] = useState<number | null>(null);

  function calculate() {
    const w = Number(weight);
    const a = Number(age);
    if (!w || !a) return;

    const weightKg = weightUnit === 'lbs' ? lbsToKg(w) : w;
    let hCm: number;
    if (heightUnit === 'imperial') {
      const ft = Number(heightFeet) || 0;
      const inNum = Number(heightInches) || 0;
      hCm = feetInchesToCm(ft, inNum);
    } else {
      hCm = Number(heightCm) || 0;
    }

    if (hCm <= 0) return;

    const cal = mifflinStJeor(weightKg, hCm, a, sex, activity);
    setResult(cal);
    onResult(cal);
  }

  return (
    <View className="gap-5">
      <View className="flex-row items-start gap-3 rounded-xl border border-primary/10 bg-primary/5 px-4 py-3 dark:border-darkPrimary/10 dark:bg-darkPrimary/5">
        <Sparkles size={16} color={p.primary} style={{ marginTop: 2 }} />
        <Text className="flex-1 text-sm leading-relaxed text-foreground dark:text-darkForeground">
          The Mifflin-St Jeor equation is the gold standard for estimating daily calorie needs. More inputs means a
          more personalized result.
        </Text>
      </View>

      <View className="gap-2">
        <Label>Sex</Label>
        <View className="flex-row gap-2">
          {(['male', 'female'] as Sex[]).map((s) => (
            <Pressable
              key={s}
              className={`flex-1 rounded-xl border px-4 py-3 ${
                sex === s
                  ? 'border-primary bg-primary/5 dark:border-darkPrimary dark:bg-darkPrimary/5'
                  : 'border-border bg-card dark:border-darkBorder dark:bg-darkCard'
              }`}
              onPress={() => setSex(s)}
            >
              <Text
                className={`text-center text-sm font-medium capitalize ${
                  sex === s ? 'text-foreground dark:text-darkForeground' : 'text-muted-foreground dark:text-darkMutedForeground'
                }`}
              >
                {s}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      <View className="gap-2">
        <Label>Age</Label>
        <Input keyboardType="number-pad" placeholder="e.g. 30" value={age} onChangeText={setAge} />
      </View>

      <View className="gap-2">
        <Label>Weight</Label>
        <View className="flex-row gap-2">
          <Input
            keyboardType="decimal-pad"
            placeholder={weightUnit === 'lbs' ? 'e.g. 160' : 'e.g. 72'}
            value={weight}
            onChangeText={setWeight}
            className="flex-1"
          />
          <SegmentedControl
            value={weightUnit}
            onChange={setWeightUnit}
            options={[
              { value: 'lbs', label: 'lbs' },
              { value: 'kg', label: 'kg' },
            ]}
            className="w-28"
          />
        </View>
      </View>

      <View className="gap-2">
        <View className="flex-row items-center justify-between">
          <Label>Height</Label>
          <Pressable onPress={() => setHeightUnit(heightUnit === 'imperial' ? 'metric' : 'imperial')}>
            <Text className="text-xs text-primary dark:text-darkPrimary">
              Switch to {heightUnit === 'imperial' ? 'cm' : 'ft/in'}
            </Text>
          </Pressable>
        </View>
        {heightUnit === 'imperial' ? (
          <View className="flex-row gap-2">
            <View className="flex-1 flex-row items-center gap-1">
              <Input keyboardType="number-pad" placeholder="5" value={heightFeet} onChangeText={setHeightFeet} />
              <Text className="text-sm text-muted-foreground">ft</Text>
            </View>
            <View className="flex-1 flex-row items-center gap-1">
              <Input keyboardType="number-pad" placeholder="8" value={heightInches} onChangeText={setHeightInches} />
              <Text className="text-sm text-muted-foreground">in</Text>
            </View>
          </View>
        ) : (
          <Input keyboardType="number-pad" placeholder="e.g. 173" value={heightCm} onChangeText={setHeightCm} />
        )}
      </View>

      <View className="gap-2">
        <Label>Activity level</Label>
        <View className="gap-2">
          {(Object.entries(activityLabels) as [ActivityLevel, string][]).map(([key, label]) => (
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
