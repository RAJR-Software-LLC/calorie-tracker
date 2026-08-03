import { Text, View } from 'react-native';

import { feedbackStatusLabel } from '@/lib/feedback/labels';
import type { FeedbackStatus } from '@/types';

type Props = {
  status: FeedbackStatus;
};

function statusStyles(status: FeedbackStatus): string {
  switch (status) {
    case 'open':
      return 'bg-primary/15 dark:bg-darkPrimary/25';
    case 'in_progress':
      return 'bg-amber-500/15 dark:bg-amber-400/20';
    case 'resolved':
      return 'bg-emerald-500/15 dark:bg-emerald-400/20';
    case 'closed':
      return 'bg-muted dark:bg-darkMuted';
  }
}

function statusTextClass(status: FeedbackStatus): string {
  switch (status) {
    case 'open':
      return 'text-primary dark:text-darkPrimary';
    case 'in_progress':
      return 'text-amber-800 dark:text-amber-200';
    case 'resolved':
      return 'text-emerald-800 dark:text-emerald-200';
    case 'closed':
      return 'text-muted-foreground dark:text-darkMutedForeground';
  }
}

export function FeedbackStatusBadge({ status }: Props) {
  return (
    <View className={`rounded-md px-2 py-1 ${statusStyles(status)}`}>
      <Text className={`text-xs font-semibold ${statusTextClass(status)}`}>
        {feedbackStatusLabel(status)}
      </Text>
    </View>
  );
}
