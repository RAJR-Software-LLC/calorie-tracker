import { Pressable, Text, View } from 'react-native';

import { FeedbackStatusBadge } from '@/components/feedback/feedback-status-badge';
import { FEEDBACK_CATEGORY_LABELS } from '@/lib/feedback/labels';
import type { FeedbackDocument } from '@/types';

type Props = {
  item: FeedbackDocument;
  onPress: () => void;
};

function formatCreatedAt(value: FeedbackDocument['createdAt']): string {
  const raw = typeof value === 'string' ? value : '';
  const d = Date.parse(raw);
  if (!Number.isFinite(d)) return '';
  return new Date(d).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export function FeedbackListItem({ item, onPress }: Props) {
  const preview = item.message.trim().replace(/\s+/g, ' ');
  const truncated = preview.length > 120 ? `${preview.slice(0, 117)}…` : preview;
  const attachmentCount = item.attachments?.length ?? 0;

  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      className="gap-2 rounded-xl border border-border bg-card p-4 dark:border-darkBorder dark:bg-darkCard"
    >
      <View className="flex-row items-center justify-between gap-2">
        <Text className="text-sm font-semibold text-foreground dark:text-darkForeground">
          {FEEDBACK_CATEGORY_LABELS[item.category]}
        </Text>
        <FeedbackStatusBadge status={item.status} />
      </View>
      <Text className="text-sm leading-5 text-muted-foreground dark:text-darkMutedForeground">
        {truncated}
      </Text>
      <View className="flex-row items-center justify-between">
        <Text className="text-xs text-muted-foreground dark:text-darkMutedForeground">
          {formatCreatedAt(item.createdAt)}
        </Text>
        {attachmentCount > 0 ? (
          <Text className="text-xs text-muted-foreground dark:text-darkMutedForeground">
            {attachmentCount} screenshot{attachmentCount === 1 ? '' : 's'}
          </Text>
        ) : null}
      </View>
    </Pressable>
  );
}
