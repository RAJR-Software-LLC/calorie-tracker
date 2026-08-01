import { Text, TextInput, View } from 'react-native';

import { FeedbackAddScreenshotButton } from '@/components/feedback/feedback-add-screenshot-button';
import { FeedbackCategoryChips } from '@/components/feedback/feedback-category-chips';
import { FeedbackAttachmentGallery } from '@/components/feedback/feedback-attachment-gallery';
import type { LocalFeedbackImage } from '@/lib/feedback/attachments';
import { FEEDBACK_ATTACHMENT_MAX_COUNT } from '@/lib/feedback/attachments';
import type { FeedbackCategory } from '@/types';

export const FEEDBACK_MESSAGE_MAX_CHARS = 4000;

type Props = {
  category: FeedbackCategory | null;
  onCategoryChange: (category: FeedbackCategory) => void;
  message: string;
  onMessageChange: (message: string) => void;
  images?: LocalFeedbackImage[];
  onAddImage?: () => void;
  onRemoveImage?: (index: number) => void;
  imageProgress?: Record<string, 'uploading' | 'done' | 'error'>;
  error?: string | null;
  disabled?: boolean;
  /** When true, Add screenshot is disabled with permission guidance. */
  photoPermissionDenied?: boolean;
  showAttachments?: boolean;
};

export function FeedbackComposeForm({
  category,
  onCategoryChange,
  message,
  onMessageChange,
  images = [],
  onAddImage,
  onRemoveImage,
  imageProgress,
  error,
  disabled,
  photoPermissionDenied = false,
  showAttachments = true,
}: Props) {
  const canAddMore = images.length < FEEDBACK_ATTACHMENT_MAX_COUNT;

  return (
    <View className="gap-4">
      <View className="gap-2">
        <Text className="text-sm font-medium text-foreground dark:text-darkForeground">
          Category
        </Text>
        <FeedbackCategoryChips value={category} onChange={onCategoryChange} disabled={disabled} />
      </View>

      <View className="gap-2">
        <Text className="text-sm font-medium text-foreground dark:text-darkForeground">
          Message
        </Text>
        <TextInput
          accessibilityLabel="Feedback message"
          multiline
          textAlignVertical="top"
          value={message}
          onChangeText={onMessageChange}
          editable={!disabled}
          maxLength={FEEDBACK_MESSAGE_MAX_CHARS}
          placeholder="Describe the issue or idea…"
          placeholderTextColor="#9CA3AF"
          className="min-h-[140px] rounded-xl border border-border bg-card px-3 py-3 text-base text-foreground dark:border-darkBorder dark:bg-darkCard dark:text-darkForeground"
        />
        <Text className="text-xs text-muted-foreground dark:text-darkMutedForeground">
          {message.trim().length}/{FEEDBACK_MESSAGE_MAX_CHARS}
        </Text>
      </View>

      {showAttachments ? (
        <View className="gap-2">
          <Text className="text-sm font-medium text-foreground dark:text-darkForeground">
            Screenshots (optional, up to {FEEDBACK_ATTACHMENT_MAX_COUNT})
          </Text>
          <FeedbackAttachmentGallery
            attachments={[]}
            localUris={images.map((img) => img.uri)}
            editable={!disabled}
            onRemoveLocal={onRemoveImage}
          />
          {images.map((img) => {
            const phase = imageProgress?.[img.localId];
            if (!phase || phase === 'done') return null;
            return (
              <Text
                key={img.localId}
                className={`text-xs ${
                  phase === 'error'
                    ? 'text-destructive dark:text-darkDestructiveForeground'
                    : 'text-muted-foreground dark:text-darkMutedForeground'
                }`}
              >
                {phase === 'uploading'
                  ? 'Uploading screenshot…'
                  : 'Upload failed — you can retry from the report.'}
              </Text>
            );
          })}
          {canAddMore && onAddImage ? (
            <FeedbackAddScreenshotButton
              onPress={onAddImage}
              disabled={disabled}
              photoPermissionDenied={photoPermissionDenied}
            />
          ) : null}
        </View>
      ) : null}

      {error ? (
        <Text className="text-sm text-destructive dark:text-darkDestructiveForeground">
          {error}
        </Text>
      ) : null}
    </View>
  );
}
