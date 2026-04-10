import { Text, View } from 'react-native';

import EditScreenInfo from '@/components/EditScreenInfo';

export default function DashboardScreen() {
  return (
    <View className="flex-1 items-center justify-center bg-slate-100 dark:bg-slate-900">
      <Text className="text-xl font-bold text-slate-900 dark:text-slate-100">Dashboard</Text>
      <Text className="mt-2 text-sm text-slate-600 dark:text-slate-400">
        NativeWind + Tailwind is wired up.
      </Text>
      <View className="mt-6 h-px w-[80%] bg-slate-300 dark:bg-slate-600" />
      <EditScreenInfo path="app/(tabs)/index.tsx" />
    </View>
  );
}
