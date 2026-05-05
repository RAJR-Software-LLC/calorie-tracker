import { Text, View } from 'react-native';

import { useDashboard } from '@/components/dashboard/dashboard-context';
import { DailySummary } from '@/components/dashboard/daily-summary';
import { EncouragementCard } from '@/components/dashboard/encouragement-card';
import { EntryList } from '@/components/dashboard/entry-list';
import { ExerciseSection } from '@/components/dashboard/exercise-section';
import { QuickLogButton } from '@/components/dashboard/quick-log-button';
import { AppScreen } from '@/components/layout/app-screen';
import { formatDate } from '@/lib/date';

function DashboardBody() {
  const { totalCalories, exerciseCalories, calorieGoal } = useDashboard();
  const today = formatDate(new Date());

  return (
    <>
      <View className="flex-row items-center justify-between">
        <Text className="text-lg font-semibold text-foreground dark:text-darkForeground">
          Dashboard
        </Text>
      </View>
      <DailySummary consumed={totalCalories} goal={calorieGoal} burned={exerciseCalories} />
      <EncouragementCard consumed={totalCalories} goal={calorieGoal} />
      <QuickLogButton date={today} />
      <EntryList />
      <ExerciseSection date={today} />
    </>
  );
}

export default function DashboardScreen() {
  return (
    <AppScreen>
      <DashboardBody />
    </AppScreen>
  );
}
