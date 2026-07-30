import { useCallback, useState } from 'react';
import { RefreshControl, Text, View } from 'react-native';
import { useQueryClient } from '@tanstack/react-query';

import { CalorieCalendar } from '@/components/calendar/calorie-calendar';
import { AppScreen } from '@/components/layout/app-screen';
import { useAuth } from '@/components/auth/auth-provider';
import { queryKeys } from '@/lib/queries';

export default function CalendarScreen() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(async () => {
    if (!user) return;
    setRefreshing(true);
    try {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.me(user.uid) }),
        queryClient.invalidateQueries({ queryKey: ['entries', user.uid] }),
      ]);
    } finally {
      setRefreshing(false);
    }
  }, [queryClient, user]);

  return (
    <AppScreen
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={() => void onRefresh()} />
      }
    >
      <View className="gap-1">
        <Text className="text-lg font-semibold text-foreground dark:text-darkForeground">
          Calendar
        </Text>
        <Text className="text-sm text-muted-foreground dark:text-darkMutedForeground">
          Tap a day to see meals and totals.
        </Text>
      </View>
      <CalorieCalendar />
    </AppScreen>
  );
}
