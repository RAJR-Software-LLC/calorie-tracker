import { Link } from 'expo-router';
import { Pressable, Text, View } from 'react-native';

export default function LoginScreen() {
  return (
    <View className="flex-1 justify-center bg-slate-100 px-6 dark:bg-slate-900">
      <Text className="text-2xl font-bold text-slate-900 dark:text-slate-100">Log in</Text>
      <Text className="mt-2 text-slate-600 dark:text-slate-400">
        Wire Firebase Auth here, then call the API with Firebase ID tokens.
      </Text>
      <Link href="/(auth)/signup" asChild>
        <Pressable>
          <Text className="mt-6 text-base text-blue-600 dark:text-blue-400">Go to sign up</Text>
        </Pressable>
      </Link>
    </View>
  );
}
