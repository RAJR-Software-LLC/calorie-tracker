import { Pressable, Text, View } from 'react-native';

import { FEEDBACK_CATEGORIES, FEEDBACK_CATEGORY_LABELS } from '@/lib/feedback/labels';
import type { FeedbackCategory } from '@/types';

type Props = {
  value: FeedbackCategory | null;
  onChange: (category: FeedbackCategory) => void;
  disabled?: boolean;
};

export function FeedbackCategoryChips({ value, onChange, disabled }: Props) {
  return (
    <View className="flex-row flex-wrap gap-2">
      {FEEDBACK_CATEGORIES.map((category) => {
        const selected = value === category;
        return (
          <Pressable
            key={category}
            accessibilityRole="button"
            accessibilityState={{ selected, disabled: !!disabled }}
            disabled={disabled}
            onPress={() => onChange(category)}
            className={`rounded-xl px-3 py-2 ${
              selected
                ? 'bg-primary dark:bg-darkPrimary'
                : 'border border-border bg-card dark:border-darkBorder dark:bg-darkCard'
            } ${disabled ? 'opacity-50' : ''}`}
          >
            <Text
              className={`text-sm font-medium ${
                selected
                  ? 'text-primary-foreground dark:text-darkPrimaryForeground'
                  : 'text-foreground dark:text-darkForeground'
              }`}
            >
              {FEEDBACK_CATEGORY_LABELS[category]}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
