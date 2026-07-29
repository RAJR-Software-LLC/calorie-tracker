import { useRouter } from 'expo-router';
import { Pressable, Text, View } from 'react-native';
import { Leaf } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQueryClient } from '@tanstack/react-query';

import { useAuth } from '@/components/auth/auth-provider';
import { Avatar } from '@/components/ui/avatar';
import { invalidateMe, useMeProfilePhoto } from '@/lib/queries';
import { logAppError } from '@/lib/app-errors';
import { useThemePalette } from '@/lib/use-theme-palette';

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
  const queryClient = useQueryClient();
  const profilePhoto = useMeProfilePhoto({ enabled: !forceLeaf });
  const displayName = user?.displayName?.split(' ')[0] || 'Friend';
  const hasProfilePhoto = !forceLeaf && profilePhoto != null;

  const handleAvatarRefreshNeeded = () => {
    void invalidateMe(queryClient, user?.uid).catch((err) =>
      logAppError('header/refreshProfilePhoto', err)
    );
  };

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
          {hasProfilePhoto && profilePhoto ? (
            <Avatar
              photo={profilePhoto}
              name={user?.displayName}
              email={user?.email}
              size={30}
              onRefreshNeeded={handleAvatarRefreshNeeded}
            />
          ) : (
            <Leaf size={20} color={p.primary} />
          )}
        </Pressable>
      </View>
    </View>
  );
}
