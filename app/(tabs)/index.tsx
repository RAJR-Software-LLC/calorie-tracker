import { useCallback, useRef, useState } from 'react';
import { RefreshControl, Text, View } from 'react-native';

import { useDashboard } from '@/components/dashboard/dashboard-context';
import { DailySummary } from '@/components/dashboard/daily-summary';
import { EncouragementCard } from '@/components/dashboard/encouragement-card';
import { EntryList } from '@/components/dashboard/entry-list';
import { ExerciseSection } from '@/components/dashboard/exercise-section';
import { QuickLogButton } from '@/components/dashboard/quick-log-button';
import { WaterSection } from '@/components/dashboard/water-section';
import { AppScreen } from '@/components/layout/app-screen';
import { useFocusEffect } from '@react-navigation/native';

function DashboardBody() {
  const {
    totalCalories,
    exerciseCalories,
    calorieGoal,
    habits,
    refreshDayDataIfStale,
    refreshAll,
    calendarDay,
  } = useDashboard();
  const skipNextFocusRefresh = useRef(true);
  const [refreshing, setRefreshing] = useState(false);

  useFocusEffect(
    useCallback(() => {
      if (skipNextFocusRefresh.current) {
        skipNextFocusRefresh.current = false;
        return;
      }
      void refreshDayDataIfStale();
    }, [refreshDayDataIfStale])
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await refreshAll();
    } finally {
      setRefreshing(false);
    }
  }, [refreshAll]);

  return (
    <AppScreen
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void onRefresh()} />}
    >
      <View className="flex-row items-center justify-between">
        <Text className="text-lg font-semibold text-foreground dark:text-darkForeground">
          Dashboard
        </Text>
      </View>
      <DailySummary consumed={totalCalories} goal={calorieGoal} burned={exerciseCalories} />
      <EncouragementCard consumed={totalCalories} goal={calorieGoal} />
      <QuickLogButton date={calendarDay} />
      <EntryList />
      {habits.waterTrackingEnabled !== false ? <WaterSection date={calendarDay} /> : null}
      {habits.exerciseTrackingEnabled !== false ? <ExerciseSection date={calendarDay} /> : null}
    </AppScreen>
  );
}

export default function DashboardScreen() {
  return <DashboardBody />;
}
