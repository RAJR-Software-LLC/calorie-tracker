import { forwardRef } from 'react';
import { Platform, TextInput, type TextInputProps } from 'react-native';

import { cn } from '@/lib/cn';
import { useThemePalette } from '@/lib/use-theme-palette';

export const Input = forwardRef<TextInput, TextInputProps>(function Input(
  { className, placeholderTextColor, ...props },
  ref
) {
  const p = useThemePalette();
  const isMultiline = props.multiline ?? false;

  return (
    <TextInput
      ref={ref}
      placeholderTextColor={placeholderTextColor ?? p.mutedForeground}
      className={cn(
        'rounded-xl border border-border bg-background px-4 text-base text-foreground dark:border-darkBorder dark:bg-darkBackground dark:text-darkForeground',
        className
      )}
      style={[
        !isMultiline && { height: 48, paddingTop: 0, paddingBottom: 0, lineHeight: 20 },
        Platform.OS === 'android' && !isMultiline
          ? { textAlignVertical: 'center', includeFontPadding: false }
          : null,
        props.style,
      ]}
      {...props}
    />
  );
});
Input.displayName = 'Input';
