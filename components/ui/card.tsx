import { Text, View, type TextProps, type ViewProps } from 'react-native';

import { cn } from '@/lib/cn';

export function Card({ className, ...props }: ViewProps) {
  return (
    <View
      className={cn(
        'rounded-2xl border border-border/50 bg-card shadow-sm dark:border-darkBorder dark:bg-darkCard',
        className
      )}
      {...props}
    />
  );
}

export function CardHeader({ className, ...props }: ViewProps) {
  return <View className={cn('p-6 pb-2', className)} {...props} />;
}

export function CardTitle({ className, ...props }: TextProps) {
  return (
    <Text className={cn('text-2xl font-semibold text-foreground dark:text-darkForeground', className)} {...props} />
  );
}

export function CardDescription({ className, ...props }: TextProps) {
  return (
    <Text className={cn('text-sm text-muted-foreground dark:text-darkMutedForeground', className)} {...props} />
  );
}

export function CardContent({ className, ...props }: ViewProps) {
  return <View className={cn('p-6 pt-2', className)} {...props} />;
}

export function CardFooter({ className, ...props }: ViewProps) {
  return <View className={cn('flex-row items-center justify-center p-6 pt-0', className)} {...props} />;
}
