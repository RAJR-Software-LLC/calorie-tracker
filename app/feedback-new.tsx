import { Stack, useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Text, View } from 'react-native';

import {
  FeedbackComposeForm,
  FEEDBACK_MESSAGE_MAX_CHARS,
} from '@/components/feedback/feedback-compose-form';
import { AppScreen } from '@/components/layout/app-screen';
import { Button } from '@/components/ui/button';
import { ApiError } from '@/lib/api/errors';
import { logAppError, toUserErrorMessage } from '@/lib/app-errors';
import {
  FeedbackAttachmentError,
  isFeedbackMediaLibraryPermissionDenied,
  isLikelyOfflineError,
  pickFeedbackImageFromLibrary,
  toUserFeedbackAttachmentMessage,
  uploadFeedbackAttachments,
  type LocalFeedbackImage,
} from '@/lib/feedback/attachments';
import { getFeedbackAppVersion, getFeedbackPlatform } from '@/lib/feedback/platform';
import { useCreateFeedbackMutation } from '@/lib/queries';
import { showToast } from '@/lib/toast';
import type { FeedbackCategory } from '@/types';

export default function FeedbackNewScreen() {
  const router = useRouter();
  const createMutation = useCreateFeedbackMutation();
  const [category, setCategory] = useState<FeedbackCategory | null>(null);
  const [message, setMessage] = useState('');
  const [images, setImages] = useState<LocalFeedbackImage[]>([]);
  const [imageProgress, setImageProgress] = useState<
    Record<string, 'uploading' | 'done' | 'error'>
  >({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [rateLimitedUntil, setRateLimitedUntil] = useState<number | null>(null);
  const [photoPermissionDenied, setPhotoPermissionDenied] = useState(false);
  const rateLimitTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (rateLimitTimer.current) clearTimeout(rateLimitTimer.current);
    };
  }, []);

  useFocusEffect(
    useCallback(() => {
      void isFeedbackMediaLibraryPermissionDenied().then(setPhotoPermissionDenied);
    }, [])
  );

  const rateLimited = rateLimitedUntil != null && Date.now() < rateLimitedUntil;

  const addImage = useCallback(async () => {
    setFormError(null);
    try {
      const picked = await pickFeedbackImageFromLibrary();
      setPhotoPermissionDenied(false);
      if (!picked) return;
      setImages((prev) => {
        if (prev.length >= 3) {
          showToast('You can attach up to 3 screenshots per report.', 'error');
          return prev;
        }
        return [...prev, picked];
      });
    } catch (err) {
      logAppError('feedback.pickImage', err);
      if (err instanceof FeedbackAttachmentError && err.code === 'permission-denied') {
        setPhotoPermissionDenied(true);
        return;
      }
      showToast(toUserFeedbackAttachmentMessage(err), 'error');
    }
  }, []);

  const onSubmit = async () => {
    setFormError(null);
    if (rateLimited) {
      setFormError('Too many reports. Please wait a moment before trying again.');
      return;
    }
    if (!category) {
      setFormError('Choose a category.');
      return;
    }
    const trimmed = message.trim();
    if (trimmed.length < 1) {
      setFormError('Enter a message.');
      return;
    }
    if (trimmed.length > FEEDBACK_MESSAGE_MAX_CHARS) {
      setFormError(`Message must be at most ${FEEDBACK_MESSAGE_MAX_CHARS} characters.`);
      return;
    }

    setSubmitting(true);
    try {
      const created = await createMutation.mutateAsync({
        category,
        message: trimmed,
        platform: getFeedbackPlatform(),
        appVersion: getFeedbackAppVersion(),
      });

      let failedUploads = 0;
      if (images.length > 0) {
        const results = await uploadFeedbackAttachments(created.id, images, (localId, phase) => {
          setImageProgress((prev) => ({ ...prev, [localId]: phase }));
        });
        failedUploads = results.filter((r) => !r.ok).length;
        if (failedUploads > 0) {
          showToast(
            `${failedUploads} screenshot${failedUploads === 1 ? '' : 's'} failed to upload. You can retry from the report.`,
            'error'
          );
        }
      }

      showToast(failedUploads > 0 ? 'Report created' : 'Report sent', 'success');
      router.replace(`/feedback-detail/${created.id}`);
    } catch (err) {
      logAppError('feedback.create', err);
      if (isLikelyOfflineError(err)) {
        setFormError('Connect to the internet to send feedback.');
        return;
      }
      if (err instanceof ApiError && err.status === 429) {
        const seconds = err.retryAfterSeconds ?? 60;
        const until = Date.now() + seconds * 1000;
        setRateLimitedUntil(until);
        if (rateLimitTimer.current) clearTimeout(rateLimitTimer.current);
        rateLimitTimer.current = setTimeout(() => setRateLimitedUntil(null), seconds * 1000);
        setFormError(`Too many reports. Try again in about ${seconds} seconds.`);
        return;
      }
      if (err instanceof ApiError && err.status === 400) {
        setFormError(toUserErrorMessage(err, 'Check your message and try again.'));
        return;
      }
      if (err instanceof FeedbackAttachmentError) {
        showToast(toUserFeedbackAttachmentMessage(err), 'error');
        return;
      }
      showToast(toUserErrorMessage(err, "Couldn't send feedback"), 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AppScreen showHeader={false}>
      <Stack.Screen
        options={{
          title: 'New report',
          headerBackTitle: 'Feedback',
          headerBackButtonDisplayMode: 'minimal',
        }}
      />
      <Text className="text-sm text-muted-foreground dark:text-darkMutedForeground">
        Tell us about a bug, a feature idea, or anything else. Screenshots are optional.
      </Text>

      <FeedbackComposeForm
        category={category}
        onCategoryChange={setCategory}
        message={message}
        onMessageChange={setMessage}
        images={images}
        onAddImage={() => void addImage()}
        onRemoveImage={(index) => setImages((prev) => prev.filter((_, i) => i !== index))}
        imageProgress={imageProgress}
        error={formError}
        disabled={submitting || rateLimited}
        photoPermissionDenied={photoPermissionDenied}
      />

      <Button onPress={() => void onSubmit()} disabled={submitting || rateLimited}>
        {submitting ? 'Sending…' : 'Submit report'}
      </Button>

      {rateLimited ? (
        <View>
          <Text className="text-center text-xs text-muted-foreground dark:text-darkMutedForeground">
            Submit is temporarily disabled after a rate limit.
          </Text>
        </View>
      ) : null}
    </AppScreen>
  );
}
