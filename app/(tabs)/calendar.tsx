import { Text, View } from 'react-native';

import { CalorieCalendar } from '@/components/calendar/calorie-calendar';
import { AppScreen } from '@/components/layout/app-screen';

export default function CalendarScreen() {
  return (
    <AppScreen>
      <View className="gap-1">
        <Text className="text-lg font-semibold text-foreground dark:text-darkForeground">Calendar</Text>
        <Text className="text-sm text-muted-foreground dark:text-darkMutedForeground">
          Tap a day to see meals and totals.
        </Text>
      </View>
      <CalorieCalendar />
    </AppScreen>
  );
}
