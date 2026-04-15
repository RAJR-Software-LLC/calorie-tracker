import { Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Leaf } from 'lucide-react-native';

import { useAuth } from '@/components/auth/auth-provider';
import { useThemePalette } from '@/lib/use-theme-palette';

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

export function AppHeader() {
  const p = useThemePalette();
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const displayName = user?.displayName?.split(' ')[0] || 'Friend';

  return (
    <View
      className="border-b border-border/50 bg-background dark:border-darkBorder dark:bg-darkBackground"
      style={{ paddingTop: insets.top }}
    >
      <View className="mx-auto w-full max-w-lg flex-row items-center justify-between px-4 py-3">
        <View>
          <Text className="text-sm text-muted-foreground dark:text-darkMutedForeground">{getGreeting()},</Text>
          <Text className="text-lg font-semibold text-foreground dark:text-darkForeground">{displayName}</Text>
        </View>
        <View className="h-9 w-9 items-center justify-center rounded-lg bg-primary/10 dark:bg-darkPrimary/10">
          <Leaf size={20} color={p.primary} />
        </View>
      </View>
    </View>
  );
}
