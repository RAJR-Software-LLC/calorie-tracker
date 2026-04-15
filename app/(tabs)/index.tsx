import { Text, View } from 'react-native';

import { DashboardProvider, useDashboard } from '@/components/dashboard/dashboard-context';
import { DailySummary } from '@/components/dashboard/daily-summary';
import { EncouragementCard } from '@/components/dashboard/encouragement-card';
import { EntryList } from '@/components/dashboard/entry-list';
import { ExerciseSection } from '@/components/dashboard/exercise-section';
import { QuickLogButton } from '@/components/dashboard/quick-log-button';
import { AppScreen } from '@/components/layout/app-screen';
import { formatDate } from '@/lib/date';

function DashboardBody() {
  const { totalCalories, exerciseCalories, goalCalories } = useDashboard();
  const today = formatDate(new Date());

  return (
    <>
      <View className="flex-row items-center justify-between">
        <Text className="text-lg font-semibold text-foreground dark:text-darkForeground">Dashboard</Text>
      </View>
      <DailySummary consumed={totalCalories} goal={goalCalories} burned={exerciseCalories} />
      <EncouragementCard consumed={totalCalories} goal={goalCalories} />
      <QuickLogButton date={today} />
      <EntryList />
      <ExerciseSection date={today} />
    </>
  );
}

export default function DashboardScreen() {
  return (
    <DashboardProvider>
      <AppScreen>
        <DashboardBody />
      </AppScreen>
    </DashboardProvider>
  );
}
