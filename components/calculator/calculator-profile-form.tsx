import { Pressable, Text, View } from 'react-native';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { SegmentedControl } from '@/components/ui/segmented-control';
import type { CalculatorFormValues } from '@/lib/calculator';
import type { ActivityLevel, GoalType, Sex } from '@/types';

const ACTIVITY_OPTIONS: { value: ActivityLevel; label: string }[] = [
  { value: 'sedentary', label: 'Sedentary' },
  { value: 'light', label: 'Light' },
  { value: 'moderate', label: 'Moderate' },
  { value: 'active', label: 'Active' },
  { value: 'very_active', label: 'Very active' },
];

const GOAL_OPTIONS: { value: GoalType; label: string }[] = [
  { value: 'lose', label: 'Lose' },
  { value: 'maintain', label: 'Maintain' },
  { value: 'gain', label: 'Gain' },
];

type CalculatorProfileFormProps = {
  value: CalculatorFormValues;
  onChange: (next: CalculatorFormValues) => void;
  disabled?: boolean;
  showGoalControls?: boolean;
};

export function CalculatorProfileForm({
  value,
  onChange,
  disabled = false,
  showGoalControls = true,
}: CalculatorProfileFormProps) {
  function patch(partial: Partial<CalculatorFormValues>) {
    onChange({ ...value, ...partial });
  }

  return (
    <View className="gap-4">
      <View className="gap-2">
        <Label>Age</Label>
        <Input
          keyboardType="number-pad"
          placeholder="e.g. 30"
          value={value.age}
          editable={!disabled}
          onChangeText={(age) => {
            patch({ age });
          }}
        />
      </View>

      <View className="gap-2">
        <Label>Sex (for equations)</Label>
        <View className="flex-row gap-2">
          {(['female', 'male'] as const).map((sex) => {
            const selected = value.sex === sex;
            return (
              <Pressable
                key={sex}
                disabled={disabled}
                onPress={() => {
                  patch({ sex: sex as Sex });
                }}
                accessibilityRole="button"
                accessibilityState={{ selected }}
                className={`flex-1 rounded-lg border py-2.5 ${
                  selected
                    ? 'border-primary bg-primary dark:border-darkPrimary dark:bg-darkPrimary'
                    : 'border-border dark:border-darkBorder'
                }`}
              >
                <Text
                  className={`text-center text-sm font-semibold capitalize ${
                    selected
                      ? 'text-primary-foreground dark:text-darkPrimaryForeground'
                      : 'text-muted-foreground dark:text-darkMutedForeground'
                  }`}
                >
                  {sex}
                </Text>
              </Pressable>
            );
          })}
        </View>
        {!value.sex ? (
          <Text className="text-xs text-muted-foreground dark:text-darkMutedForeground">
            Required. Select the sex used by standard BMR equations (male/female only in v1).
          </Text>
        ) : null}
      </View>

      <View className="gap-2">
        <View className="flex-row items-center justify-between">
          <Label>Height</Label>
          <SegmentedControl
            value={value.heightUnit}
            onChange={(heightUnit) => {
              patch({ heightUnit });
            }}
            options={[
              { value: 'cm', label: 'cm' },
              { value: 'ft_in', label: 'ft/in' },
            ]}
            className="w-32"
          />
        </View>
        {value.heightUnit === 'cm' ? (
          <Input
            keyboardType="decimal-pad"
            placeholder="e.g. 170"
            value={value.heightCm}
            editable={!disabled}
            onChangeText={(heightCm) => {
              patch({ heightCm });
            }}
          />
        ) : (
          <View className="flex-row gap-2">
            <View className="flex-1">
              <Input
                keyboardType="number-pad"
                placeholder="ft"
                value={value.heightFeet}
                editable={!disabled}
                onChangeText={(heightFeet) => {
                  patch({ heightFeet });
                }}
              />
            </View>
            <View className="flex-1">
              <Input
                keyboardType="number-pad"
                placeholder="in"
                value={value.heightInches}
                editable={!disabled}
                onChangeText={(heightInches) => {
                  patch({ heightInches });
                }}
              />
            </View>
          </View>
        )}
      </View>

      <View className="gap-2">
        <View className="flex-row items-center justify-between">
          <Label>Weight</Label>
          <SegmentedControl
            value={value.weightUnit}
            onChange={(weightUnit) => {
              patch({ weightUnit });
            }}
            options={[
              { value: 'kg', label: 'kg' },
              { value: 'lb', label: 'lb' },
            ]}
            className="w-28"
          />
        </View>
        <Input
          keyboardType="decimal-pad"
          placeholder={value.weightUnit === 'kg' ? 'e.g. 70' : 'e.g. 154'}
          value={value.weight}
          editable={!disabled}
          onChangeText={(weight) => {
            patch({ weight });
          }}
        />
      </View>

      <View className="gap-2">
        <Label>Activity level</Label>
        <View className="gap-1.5">
          {ACTIVITY_OPTIONS.map((option) => {
            const selected = value.activityLevel === option.value;
            return (
              <Pressable
                key={option.value}
                disabled={disabled}
                onPress={() => {
                  patch({ activityLevel: option.value });
                }}
                className={`rounded-lg border px-3 py-2.5 ${
                  selected
                    ? 'border-primary bg-primary/5 dark:border-darkPrimary dark:bg-darkPrimary/10'
                    : 'border-border dark:border-darkBorder'
                }`}
              >
                <Text
                  className={`text-sm font-medium ${
                    selected
                      ? 'text-foreground dark:text-darkForeground'
                      : 'text-muted-foreground dark:text-darkMutedForeground'
                  }`}
                >
                  {option.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      {showGoalControls ? (
        <>
          <View className="gap-2">
            <Label>Weight goal</Label>
            <SegmentedControl
              value={value.goalType}
              onChange={(goalType) => {
                patch({ goalType: goalType as GoalType });
              }}
              options={GOAL_OPTIONS}
            />
          </View>
          <View className="gap-2">
            <Label>Calorie goal mode</Label>
            <SegmentedControl
              value={value.calorieGoalMode}
              onChange={(calorieGoalMode) => {
                patch({ calorieGoalMode: calorieGoalMode as 'single' | 'range' });
              }}
              options={[
                { value: 'single', label: 'Single' },
                { value: 'range', label: 'Range' },
              ]}
            />
          </View>
        </>
      ) : null}
    </View>
  );
}
