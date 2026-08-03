import { View } from 'react-native';

const SKELETON_KEYS = ['s0', 's1', 's2', 's3', 's4', 's5'] as const;

export function EstimateSkeleton({ count = 3 }: { count?: number }) {
  const keys = SKELETON_KEYS.slice(0, Math.min(count, SKELETON_KEYS.length));

  return (
    <View className="gap-2" accessibilityLabel="Loading estimates">
      {keys.map((key) => (
        <View
          key={key}
          className="h-24 animate-pulse rounded-xl border border-border bg-muted/50 dark:border-darkBorder dark:bg-darkMuted/40"
        />
      ))}
    </View>
  );
}
