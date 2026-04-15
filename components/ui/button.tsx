import { forwardRef } from 'react';
import { Pressable, Text, type PressableProps, type TextProps } from 'react-native';

import { cn } from '@/lib/cn';

export type ButtonProps = PressableProps & {
  variant?: 'default' | 'outline' | 'ghost' | 'destructive';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  children: React.ReactNode;
  textClassName?: string;
};

export const Button = forwardRef<React.ComponentRef<typeof Pressable>, ButtonProps>(
  function Button(
    { variant = 'default', size = 'default', className, textClassName, children, disabled, ...rest },
    ref
  ) {
    const base =
      'flex-row items-center justify-center rounded-xl active:opacity-90 disabled:opacity-50';
    const variants: Record<NonNullable<ButtonProps['variant']>, string> = {
      default: 'bg-primary dark:bg-darkPrimary',
      outline: 'border border-border bg-transparent dark:border-darkBorder',
      ghost: 'bg-transparent',
      destructive: 'border border-destructive bg-transparent dark:border-darkDestructive',
    };
    const sizes: Record<NonNullable<ButtonProps['size']>, string> = {
      sm: 'px-3 py-2',
      default: 'px-4 py-3',
      lg: 'px-5 py-4',
      icon: 'h-10 w-10 items-center justify-center p-0',
    };
    const textVariants: Record<NonNullable<ButtonProps['variant']>, string> = {
      default: 'text-primary-foreground dark:text-darkPrimaryForeground font-semibold',
      outline: 'text-foreground font-semibold dark:text-darkForeground',
      ghost: 'text-foreground font-medium dark:text-darkForeground',
      destructive: 'text-destructive dark:text-darkDestructiveForeground font-semibold',
    };
    const textSizes: Record<NonNullable<ButtonProps['size']>, string> = {
      sm: 'text-sm',
      default: 'text-base',
      lg: 'text-base',
      icon: 'text-base',
    };

    return (
      <Pressable
        ref={ref}
        disabled={disabled}
        className={cn(base, variants[variant], sizes[size], className)}
        {...rest}
      >
        {typeof children === 'string' ? (
          <Text className={cn(textVariants[variant], textSizes[size], textClassName)}>{children}</Text>
        ) : (
          children
        )}
      </Pressable>
    );
  }
);

export function ButtonLabel({ className, ...props }: TextProps) {
  return (
    <Text
      className={cn('text-base font-semibold text-primary-foreground dark:text-darkPrimaryForeground', className)}
      {...props}
    />
  );
}
