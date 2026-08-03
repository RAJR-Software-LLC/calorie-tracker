import { Pressable, Text, View } from 'react-native';
import { Pencil } from 'lucide-react-native';

import { useThemePalette } from '@/lib/use-theme-palette';

type CustomOverrideBannerProps = {
  onRecalculate?: () => void;
};

export function CustomOverrideBanner({ onRecalculate }: CustomOverrideBannerProps) {
  const p = useThemePalette();

  return (
    <View className="flex-row items-start gap-3 rounded-xl border border-border bg-muted/50 px-3 py-3 dark:border-darkBorder dark:bg-darkMuted/40">
      <Pencil size={16} color={p.mutedForeground} style={{ marginTop: 2 }} />
      <View className="min-w-0 flex-1 gap-2">
        <Text className="text-sm leading-relaxed text-foreground dark:text-darkForeground">
          You customized your calorie targets. They no longer match the science-backed snapshot.
          Re-apply a formula to sync them.
        </Text>
        {onRecalculate ? (
          <Pressable
            onPress={onRecalculate}
            accessibilityRole="button"
            accessibilityLabel="Re-apply calculator formula"
            className="self-start active:opacity-70"
          >
            <Text className="text-sm font-semibold text-primary dark:text-darkPrimary">
              Open calculator
            </Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}
