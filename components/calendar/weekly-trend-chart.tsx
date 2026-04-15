import { Text, View } from 'react-native';
import { TrendingUp } from 'lucide-react-native';

import { useThemePalette } from '@/lib/use-theme-palette';

type WeeklyTrendChartProps = {
  data: { date: string; calories: number; goal: number }[];
  goal: number;
};

export function WeeklyTrendChart({ data, goal }: WeeklyTrendChartProps) {
  const p = useThemePalette();
  const hasData = data.some((d) => d.calories > 0);
  const maxCal = Math.max(...data.map((d) => d.calories), goal, 1);

  if (!hasData) {
    return (
      <View className="items-center gap-2 rounded-2xl border border-border/50 bg-card p-6 dark:border-darkBorder dark:bg-darkCard">
        <TrendingUp size={24} color={p.mutedForeground} />
        <Text className="text-center text-sm text-muted-foreground dark:text-darkMutedForeground">
          Start logging to see your weekly trends
        </Text>
      </View>
    );
  }

  return (
    <View className="rounded-2xl border border-border/50 bg-card p-4 dark:border-darkBorder dark:bg-darkCard">
      <View className="mb-3 flex-row items-center gap-2">
        <TrendingUp size={16} color={p.primary} />
        <Text className="text-sm font-semibold text-foreground dark:text-darkForeground">Last 7 days</Text>
      </View>
      <View className="h-40 flex-row items-end justify-between gap-1">
        {data.map((d) => {
          const h = Math.max(8, (d.calories / maxCal) * 120);
          return (
            <View key={d.date} className="flex-1 items-center gap-1">
              <View
                className="w-full rounded-t bg-primary dark:bg-darkPrimary"
                style={{ height: h, maxHeight: 120, minHeight: 8 }}
              />
              <Text className="text-[10px] text-muted-foreground dark:text-darkMutedForeground">{d.date}</Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}
