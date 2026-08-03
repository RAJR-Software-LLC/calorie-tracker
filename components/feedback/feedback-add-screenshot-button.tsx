import { Text, View } from 'react-native';

import { Button } from '@/components/ui/button';
import { FEEDBACK_PHOTO_PERMISSION_MESSAGE } from '@/lib/feedback/attachments';

type Props = {
  onPress: () => void;
  disabled?: boolean;
  photoPermissionDenied?: boolean;
};

/** Shared Add screenshot control with permission-denied guidance. */
export function FeedbackAddScreenshotButton({
  onPress,
  disabled,
  photoPermissionDenied = false,
}: Props) {
  return (
    <View className="gap-1">
      <Button
        variant="outline"
        accessibilityRole="button"
        accessibilityLabel="Add screenshot"
        onPress={onPress}
        disabled={!!disabled || photoPermissionDenied}
        accessibilityState={{ disabled: !!disabled || photoPermissionDenied }}
      >
        Add screenshot
      </Button>
      {photoPermissionDenied ? (
        <Text className="text-xs text-muted-foreground dark:text-darkMutedForeground">
          {FEEDBACK_PHOTO_PERMISSION_MESSAGE}
        </Text>
      ) : null}
    </View>
  );
}
