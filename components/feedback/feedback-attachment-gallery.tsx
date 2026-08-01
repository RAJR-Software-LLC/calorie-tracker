import { Image, Pressable, Text, View } from 'react-native';

import type { FeedbackAttachment } from '@/types';

type Props = {
  attachments: FeedbackAttachment[];
  onExpiredUrl?: () => void;
  /** Local preview URIs while composing (before upload). */
  localUris?: string[];
  onRemoveLocal?: (index: number) => void;
  editable?: boolean;
};

export function FeedbackAttachmentGallery({
  attachments,
  onExpiredUrl,
  localUris,
  onRemoveLocal,
  editable,
}: Props) {
  if ((attachments?.length ?? 0) === 0 && (localUris?.length ?? 0) === 0) {
    return null;
  }

  return (
    <View className="flex-row flex-wrap gap-2">
      {attachments.map((att) => {
        const uri = att.downloadUrl;
        if (!uri) {
          return (
            <View
              key={att.storagePath}
              className="h-24 w-24 items-center justify-center rounded-lg bg-muted dark:bg-darkMuted"
            >
              <Text className="px-1 text-center text-xs text-muted-foreground dark:text-darkMutedForeground">
                Refresh to view
              </Text>
            </View>
          );
        }
        return (
          <Image
            key={att.storagePath}
            source={{ uri }}
            accessibilityLabel="Feedback screenshot"
            className="h-24 w-24 rounded-lg"
            resizeMode="cover"
            onError={() => onExpiredUrl?.()}
          />
        );
      })}
      {localUris?.map((uri, index) => (
        <View key={`local-${uri}-${index}`} className="relative">
          <Image
            source={{ uri }}
            accessibilityLabel="Selected screenshot"
            className="h-24 w-24 rounded-lg"
            resizeMode="cover"
          />
          {editable && onRemoveLocal ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Remove screenshot"
              onPress={() => onRemoveLocal(index)}
              className="absolute -right-1 -top-1 h-6 w-6 items-center justify-center rounded-full bg-destructive dark:bg-darkDestructive"
            >
              <Text className="text-xs font-bold text-white">×</Text>
            </Pressable>
          ) : null}
        </View>
      ))}
    </View>
  );
}
