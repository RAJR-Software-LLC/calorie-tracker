import { Text, View } from 'react-native';

export default function CalculatorScreen() {
  return (
    <View className="flex-1 items-center justify-center bg-slate-100 px-4 dark:bg-slate-900">
      <Text className="text-xl font-semibold text-slate-900 dark:text-slate-100">Calculator</Text>
      <Text className="mt-2 text-center text-slate-600 dark:text-slate-400">
        Quick and advanced TDEE tools will live here (see src/lib/utils/calories).
      </Text>
    </View>
  );
}
