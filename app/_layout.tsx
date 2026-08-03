import FontAwesome from '@expo/vector-icons/FontAwesome';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack, useRouter, useSegments, type Href } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { ActivityIndicator, View } from 'react-native';
import 'react-native-reanimated';
import Toast from 'react-native-toast-message';
import '../global.css';

import { AuthProvider, useAuth } from '@/components/auth/auth-provider';
import { useColorScheme } from '@/components/useColorScheme';
import { needsGoalsOnboarding } from '@/lib/calculator';
import { queryClient, useAppStateRevalidate, useMe } from '@/lib/queries';
import { QueryClientProvider } from '@tanstack/react-query';
import { installNotificationHandler, useNotificationTapRouter } from '@/lib/notifications/handler';
import { initMonitoring } from '@/lib/monitoring';
import { installExerciseBackgroundSyncTask } from '@/lib/exercise/native-sync/background-sync';
import { useThemePalette } from '@/lib/use-theme-palette';

export { ErrorBoundary } from 'expo-router';

export const unstable_settings = {
  initialRouteName: '(tabs)',
};

void SplashScreen.preventAutoHideAsync().catch(() => {
  // In some navigation/view-controller transitions there may be no splash to control.
});

export default function RootLayout() {
  const [loaded, error] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
    ...FontAwesome.font,
  });

  useEffect(() => {
    initMonitoring();
    installNotificationHandler();
    installExerciseBackgroundSyncTask();
  }, []);

  useEffect(() => {
    if (error) throw error;
  }, [error]);

  useEffect(() => {
    if (loaded) {
      void SplashScreen.hideAsync().catch(() => {
        // Ignore if native splash is not registered for this view controller.
      });
    }
  }, [loaded]);

  if (!loaded) {
    return null;
  }

  return (
    <AuthProvider>
      <QueryClientProvider client={queryClient}>
        <RootLayoutNav />
      </QueryClientProvider>
    </AuthProvider>
  );
}

function RootLayoutNav() {
  const colorScheme = useColorScheme();
  const palette = useThemePalette();
  const { user, loading } = useAuth();
  const segments = useSegments();
  const router = useRouter();
  const { data: me, isLoading: meLoading, isError: meError, isFetched: meFetched } = useMe({
    enabled: !!user,
  });
  useNotificationTapRouter(user, router);
  useAppStateRevalidate(!!user);

  useEffect(() => {
    if (loading) return;
    const seg0 = String(segments[0] ?? '');
    const inAuth = seg0 === '(auth)';
    const inOnboarding = seg0 === '(onboarding)';

    if (!user && !inAuth) {
      router.replace('/(auth)/login');
      return;
    }

    if (!user) return;

    // Offline /me failure: do not trap in onboarding.
    if (meError && !me) {
      if (inAuth || inOnboarding) {
        router.replace('/(tabs)');
      }
      return;
    }

    // Wait for first successful /me before deciding onboarding.
    if (meLoading || !meFetched) {
      return;
    }

    const needsOnboarding = needsGoalsOnboarding(me);

    if (needsOnboarding && !inOnboarding) {
      router.replace('/(onboarding)/goals' as Href);
      return;
    }

    if (!needsOnboarding && (inAuth || inOnboarding)) {
      router.replace('/(tabs)');
    }
  }, [user, loading, segments, router, me, meLoading, meError, meFetched]);

  if (loading || (user && meLoading && !me && !meError)) {
    return (
      <View className="flex-1 items-center justify-center bg-background dark:bg-darkBackground">
        <ActivityIndicator size="large" color={palette.primary} />
      </View>
    );
  }

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Stack>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="(auth)" options={{ headerShown: false }} />
        <Stack.Screen name="(onboarding)" options={{ headerShown: false }} />
        <Stack.Screen name="modal" options={{ presentation: 'modal' }} />
      </Stack>
      <Toast />
    </ThemeProvider>
  );
}
