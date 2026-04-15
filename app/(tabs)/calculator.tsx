import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { AdvancedCalculator } from '@/components/calculator/advanced-calculator';
import { QuickCalculator } from '@/components/calculator/quick-calculator';
import { AppScreen } from '@/components/layout/app-screen';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

type TabKey = 'quick' | 'advanced';

export default function CalculatorScreen() {
  const [tab, setTab] = useState<TabKey>('quick');
  const [maintenance, setMaintenance] = useState<number | null>(null);

  return (
    <AppScreen>
      <Text className="text-lg font-semibold text-foreground dark:text-darkForeground">Calculator</Text>
      <Text className="text-sm text-muted-foreground dark:text-darkMutedForeground">
        Estimate daily maintenance calories from weight and activity.
      </Text>

      <View className="flex-row rounded-xl border border-border p-1 dark:border-darkBorder">
        {(['quick', 'advanced'] as const).map((key) => (
          <Pressable
            key={key}
            onPress={() => setTab(key)}
            className={`flex-1 rounded-lg py-2.5 ${tab === key ? 'bg-primary dark:bg-darkPrimary' : ''}`}
          >
            <Text
              className={`text-center text-sm font-semibold ${
                tab === key
                  ? 'text-primary-foreground dark:text-darkPrimaryForeground'
                  : 'text-muted-foreground dark:text-darkMutedForeground'
              }`}
            >
              {key === 'quick' ? 'Quick' : 'Advanced'}
            </Text>
          </Pressable>
        ))}
      </View>

      {tab === 'quick' ? (
        <QuickCalculator onResult={setMaintenance} />
      ) : (
        <AdvancedCalculator onResult={setMaintenance} />
      )}

      {maintenance != null ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Estimated maintenance</CardTitle>
          </CardHeader>
          <CardContent>
            <Text className="text-2xl font-bold text-foreground dark:text-darkForeground">
              {Math.round(maintenance)} <Text className="text-base font-normal text-muted-foreground">kcal/day</Text>
            </Text>
          </CardContent>
        </Card>
      ) : null}
    </AppScreen>
  );
}
