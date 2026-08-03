import { View } from 'react-native';

export function EstimateSkeleton({ count = 3 }: { count?: number }) {
  return (
    <View className="gap-2" accessibilityLabel="Loading estimates">
      {Array.from({ length: count }).map((_, index) => (
        <View
          key={index}
          className="h-24 animate-pulse rounded-xl border border-border bg-muted/50 dark:border-darkBorder dark:bg-darkMuted/40"
        />
      ))}
    </View>
  );
}
