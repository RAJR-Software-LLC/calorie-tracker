import { Text, View } from 'react-native';
import Svg, { Circle, G } from 'react-native-svg';
import { Dumbbell, Flame } from 'lucide-react-native';

import { useThemePalette } from '@/lib/use-theme-palette';

type DailySummaryProps = {
  consumed: number;
  goal: number | null;
  burned: number;
};

export function DailySummary({ consumed, goal, burned }: DailySummaryProps) {
  const p = useThemePalette();
  const effectiveGoal = goal || 2000;
  const remaining = effectiveGoal - consumed + burned;
  const progress = Math.min((consumed / effectiveGoal) * 100, 100);
  const circumference = 2 * Math.PI * 56;
  const strokeDashoffset = circumference - (progress / 100) * circumference;

  const progressColor = progress <= 85 ? p.primary : p.mutedForeground;

  return (
    <View className="items-center gap-4 rounded-2xl border border-border/50 bg-card p-6 shadow-sm dark:border-darkBorder dark:bg-darkCard">
      <View className="relative h-36 w-36 items-center justify-center">
        <Svg width={128} height={128} viewBox="0 0 128 128">
          <G rotation="-90" origin="64, 64">
            <Circle cx={64} cy={64} r={56} fill="none" stroke={p.border} strokeWidth={8} />
            <Circle
              cx={64}
              cy={64}
              r={56}
              fill="none"
              stroke={progressColor}
              strokeWidth={8}
              strokeLinecap="round"
              strokeDasharray={`${circumference}`}
              strokeDashoffset={Math.max(strokeDashoffset, 0)}
            />
          </G>
        </Svg>
        <View className="absolute items-center">
          <Text className="text-2xl font-bold" style={{ color: progressColor }}>
            {consumed.toLocaleString()}
          </Text>
          <Text className="text-xs text-muted-foreground dark:text-darkMutedForeground">
            of {effectiveGoal.toLocaleString()} cal
          </Text>
        </View>
      </View>

      <View className="w-full flex-row items-center justify-around">
        <View className="items-center gap-1">
          <View className="flex-row items-center gap-1.5">
            <Flame size={16} color={p.mutedForeground} />
            <Text className="text-xs font-medium text-muted-foreground dark:text-darkMutedForeground">
              Remaining
            </Text>
          </View>
          <Text className="text-lg font-semibold text-foreground dark:text-darkForeground">
            {remaining > 0 ? remaining.toLocaleString() : 0}
          </Text>
        </View>
        {burned > 0 && (
          <View className="items-center gap-1">
            <View className="flex-row items-center gap-1.5">
              <Dumbbell size={16} color={p.mutedForeground} />
              <Text className="text-xs font-medium text-muted-foreground dark:text-darkMutedForeground">
                Burned
              </Text>
            </View>
            <Text className="text-lg font-semibold text-foreground dark:text-darkForeground">
              {burned.toLocaleString()}
            </Text>
          </View>
        )}
      </View>

      {!goal && (
        <Text className="text-center text-xs text-muted-foreground dark:text-darkMutedForeground">
          Using default 2,000 cal goal. Set yours in the Calculator tab!
        </Text>
      )}
    </View>
  );
}
