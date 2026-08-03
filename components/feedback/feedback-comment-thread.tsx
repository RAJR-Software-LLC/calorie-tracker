import { Text, View } from 'react-native';

import type { FeedbackCommentDocument } from '@/types';

type Props = {
  comments: FeedbackCommentDocument[];
};

function formatCommentTime(value: FeedbackCommentDocument['createdAt']): string {
  const raw = typeof value === 'string' ? value : '';
  const d = Date.parse(raw);
  if (!Number.isFinite(d)) return '';
  return new Date(d).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export function FeedbackCommentThread({ comments }: Props) {
  if (!comments.length) {
    return (
      <Text className="text-sm text-muted-foreground dark:text-darkMutedForeground">
        No comments yet.
      </Text>
    );
  }

  return (
    <View className="gap-3">
      {comments.map((comment) => {
        const isOps = comment.authorType === 'ops';
        return (
          <View
            key={comment.id}
            className={`rounded-xl border p-3 ${
              isOps
                ? 'border-primary/30 bg-primary/5 dark:border-darkPrimary/40 dark:bg-darkPrimary/10'
                : 'border-border bg-card dark:border-darkBorder dark:bg-darkCard'
            }`}
          >
            <View className="mb-1 flex-row items-center justify-between gap-2">
              <Text className="text-xs font-semibold text-foreground dark:text-darkForeground">
                {isOps ? 'Support' : 'You'}
              </Text>
              <Text className="text-xs text-muted-foreground dark:text-darkMutedForeground">
                {formatCommentTime(comment.createdAt)}
              </Text>
            </View>
            <Text selectable className="text-sm leading-5 text-foreground dark:text-darkForeground">
              {comment.body}
            </Text>
          </View>
        );
      })}
    </View>
  );
}
