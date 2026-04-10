import { Link } from 'expo-router';
import { Pressable, Text, View } from 'react-native';

export default function SignupScreen() {
  return (
    <View className="flex-1 justify-center bg-slate-100 px-6 dark:bg-slate-900">
      <Text className="text-2xl font-bold text-slate-900 dark:text-slate-100">Sign up</Text>
      <Text className="mt-2 text-slate-600 dark:text-slate-400">
        Create an account with Firebase Auth, then sign in to access /api/v1.
      </Text>
      <Link href="/(auth)/login" asChild>
        <Pressable>
          <Text className="mt-6 text-base text-blue-600 dark:text-blue-400">Back to log in</Text>
        </Pressable>
      </Link>
    </View>
  );
}
