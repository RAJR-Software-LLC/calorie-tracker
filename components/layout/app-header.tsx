import { useFocusEffect } from '@react-navigation/native';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import type { GetMeResponse } from '@/types';

import { useAuth } from '@/components/auth/auth-provider';
import { Avatar } from '@/components/ui/avatar';
import { getMe } from '@/lib/api';
import { logAppError } from '@/lib/app-errors';
import { useThemePalette } from '@/lib/use-theme-palette';
import { Leaf } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

export type AppHeaderProps = {
  forceLeaf?: boolean;
};

export function AppHeader({ forceLeaf = false }: AppHeaderProps = {}) {
  const p = useThemePalette();
  const { user } = useAuth();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [profile, setProfile] = useState<GetMeResponse>(null);
  const displayName = user?.displayName?.split(' ')[0] || 'Friend';
  const hasProfilePhoto = !forceLeaf && profile?.profilePhoto != null;

  useEffect(() => {
    if (!user) setProfile(null);
  }, [user]);

  useFocusEffect(
    useCallback(() => {
      if (forceLeaf || !user) return;
      let cancelled = false;
      void getMe()
        .then((me) => {
          if (!cancelled) setProfile(me);
        })
        .catch((err) => {
          logAppError('header/getMe', err);
        });
      return () => {
        cancelled = true;
      };
    }, [user, forceLeaf])
  );

  return (
    <View
      className="border-b border-border/50 bg-background dark:border-darkBorder dark:bg-darkBackground"
      style={{ paddingTop: insets.top }}
    >
      <View className="mx-auto w-full max-w-lg flex-row items-center justify-between px-4 py-3">
        <View>
          <Text className="text-sm text-muted-foreground dark:text-darkMutedForeground">
            {getGreeting()},
          </Text>
          <Text className="text-lg font-semibold text-foreground dark:text-darkForeground">
            {displayName}
          </Text>
        </View>
        <Pressable
          onPress={() => router.push('/(tabs)/settings')}
          className="h-9 w-9 items-center justify-center rounded-lg bg-primary/10 active:opacity-80 dark:bg-darkPrimary/10"
          accessibilityRole="button"
          accessibilityLabel="Open settings"
        >
          {hasProfilePhoto && profile?.profilePhoto ? (
            <Avatar
              photo={profile.profilePhoto}
              name={user?.displayName}
              email={user?.email}
              size={30}
              onRefreshNeeded={() => {
                void getMe()
                  .then(setProfile)
                  .catch((err) => logAppError('header/refreshProfilePhoto', err));
              }}
            />
          ) : (
            <Leaf size={20} color={p.primary} />
          )}
        </Pressable>
      </View>
    </View>
  );
}
