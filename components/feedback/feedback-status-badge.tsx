import { Text, View } from 'react-native';

import { FEEDBACK_STATUS_LABELS } from '@/lib/feedback/labels';
import type { FeedbackStatus } from '@/types';

type Props = {
  status: FeedbackStatus;
};

const STATUS_STYLES: Record<FeedbackStatus, string> = {
  open: 'bg-primary/15 dark:bg-darkPrimary/25',
  in_progress: 'bg-amber-500/15 dark:bg-amber-400/20',
  resolved: 'bg-emerald-500/15 dark:bg-emerald-400/20',
  closed: 'bg-muted dark:bg-darkMuted',
};

const STATUS_TEXT: Record<FeedbackStatus, string> = {
  open: 'text-primary dark:text-darkPrimary',
  in_progress: 'text-amber-800 dark:text-amber-200',
  resolved: 'text-emerald-800 dark:text-emerald-200',
  closed: 'text-muted-foreground dark:text-darkMutedForeground',
};

export function FeedbackStatusBadge({ status }: Props) {
  return (
    <View className={`rounded-md px-2 py-1 ${STATUS_STYLES[status]}`}>
      <Text className={`text-xs font-semibold ${STATUS_TEXT[status]}`}>
        {FEEDBACK_STATUS_LABELS[status]}
      </Text>
    </View>
  );
}
