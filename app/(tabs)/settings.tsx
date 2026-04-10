import { Link } from 'expo-router';
import { Pressable, Text, View } from 'react-native';

export default function SettingsScreen() {
  return (
    <View className="flex-1 items-center justify-center bg-slate-100 px-4 dark:bg-slate-900">
      <Text className="text-xl font-semibold text-slate-900 dark:text-slate-100">Settings</Text>
      <Text className="mt-2 text-center text-slate-600 dark:text-slate-400">
        Profile and notifications will use PATCH /api/v1/me.
      </Text>
      <Link href="/(auth)/login" asChild>
        <Pressable>
          <Text className="mt-6 text-base text-blue-600 dark:text-blue-400">
            Open log in (auth shell)
          </Text>
        </Pressable>
      </Link>
    </View>
  );
}
