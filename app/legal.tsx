import { Text, View } from 'react-native';
import { Stack } from 'expo-router';

import { AppScreen } from '@/components/layout/app-screen';

export default function LegalScreen() {
  return (
    <AppScreen showHeader={false}>
      <Stack.Screen
        options={{
          title: 'Legal Disclosures',
          headerBackTitle: 'Settings',
        }}
      />
      <Text className="text-lg font-semibold text-foreground dark:text-darkForeground">Legal</Text>
      <Text className="text-sm text-muted-foreground dark:text-darkMutedForeground">
        Wellness and privacy disclosures
      </Text>

      <View className="gap-2 rounded-xl border border-border bg-card p-4 dark:border-darkBorder dark:bg-darkCard">
        <Text className="text-base font-semibold text-foreground dark:text-darkForeground">
          Wellness disclaimer
        </Text>
        <Text className="text-sm leading-6 text-muted-foreground dark:text-darkMutedForeground">
          Calorie Tracker is intended for general wellness, nutrition awareness, and informational use
          only. It is not a medical device and does not diagnose, treat, cure, or prevent any disease or
          medical condition.
        </Text>
        <Text className="text-sm leading-6 text-muted-foreground dark:text-darkMutedForeground">
          Always seek advice from a licensed healthcare professional for medical questions, diagnosis, or
          treatment decisions.
        </Text>
      </View>

      <View className="gap-2 rounded-xl border border-border bg-card p-4 dark:border-darkBorder dark:bg-darkCard">
        <Text className="text-base font-semibold text-foreground dark:text-darkForeground">
          Health data use
        </Text>
        <Text className="text-sm leading-6 text-muted-foreground dark:text-darkMutedForeground">
          We use nutrition and activity-related information you provide to power core app features such as
          logging, summaries, and goal tracking.
        </Text>
        <Text className="text-sm leading-6 text-muted-foreground dark:text-darkMutedForeground">
          We do not sell personal health-related data and do not use it for advertising profiling or
          marketing targeting.
        </Text>
      </View>
    </AppScreen>
  );
}
