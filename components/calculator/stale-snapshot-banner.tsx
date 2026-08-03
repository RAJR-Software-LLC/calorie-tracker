import { Pressable, Text, View } from 'react-native';
import { RefreshCw } from 'lucide-react-native';

import { useThemePalette } from '@/lib/use-theme-palette';

type StaleSnapshotBannerProps = {
  onRecalculate?: () => void;
  message?: string;
};

export function StaleSnapshotBanner({
  onRecalculate,
  message = 'Your stats changed — recalculate calories.',
}: StaleSnapshotBannerProps) {
  const p = useThemePalette();

  return (
    <View className="flex-row items-start gap-3 rounded-xl border border-amber-500/40 bg-amber-500/10 px-3 py-3 dark:border-amber-400/40 dark:bg-amber-400/10">
      <RefreshCw size={16} color={p.primary} style={{ marginTop: 2 }} />
      <View className="min-w-0 flex-1 gap-2">
        <Text className="text-sm leading-relaxed text-foreground dark:text-darkForeground">
          {message}
        </Text>
        {onRecalculate ? (
          <Pressable
            onPress={onRecalculate}
            accessibilityRole="button"
            accessibilityLabel="Recalculate calories"
            className="self-start active:opacity-70"
          >
            <Text className="text-sm font-semibold text-primary dark:text-darkPrimary">
              Recalculate
            </Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}
