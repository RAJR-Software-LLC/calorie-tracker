import { Platform, Pressable, Text, View } from 'react-native';

import { cn } from '@/lib/cn';

type SegmentOption<T extends string> = {
  value: T;
  label: string;
};

type SegmentedControlProps<T extends string> = {
  value: T;
  options: SegmentOption<T>[];
  onChange: (value: T) => void;
  className?: string;
  optionClassName?: string;
};

export function SegmentedControl<T extends string>({
  value,
  options,
  onChange,
  className,
  optionClassName,
}: SegmentedControlProps<T>) {
  return (
    <View
      className={cn(
        'h-12 flex-row overflow-hidden rounded-lg border border-input dark:border-darkBorder',
        className
      )}
    >
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <Pressable
            key={option.value}
            className={cn(
              'flex-1 items-center justify-center px-3',
              selected ? 'bg-primary dark:bg-darkPrimary' : 'bg-transparent',
              optionClassName
            )}
            style={{ paddingTop: 0, paddingBottom: 0 }}
            onPress={() => onChange(option.value)}
          >
            <Text
              className={cn(
                'text-sm font-medium',
                selected
                  ? 'text-primary-foreground dark:text-darkPrimaryForeground'
                  : 'text-muted-foreground dark:text-darkMutedForeground'
              )}
              style={{
                fontSize: 14,
                lineHeight: 20,
                paddingTop: 0,
                paddingBottom: 0,
                ...(Platform.OS === 'android'
                  ? { includeFontPadding: false, textAlignVertical: 'center' as const }
                  : null),
              }}
            >
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
