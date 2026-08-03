import { Stack, useFocusEffect, useRouter } from 'expo-router';
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type Dispatch,
  type MutableRefObject,
  type SetStateAction,
} from 'react';
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

type CreateFeedbackMutation = ReturnType<typeof useCreateFeedbackMutation>;

type FeedbackNewDeps = {
  category: FeedbackCategory | null;
  message: string;
  images: LocalFeedbackImage[];
  rateLimited: boolean;
  createMutation: CreateFeedbackMutation;
  router: ReturnType<typeof useRouter>;
  rateLimitTimer: MutableRefObject<ReturnType<typeof setTimeout> | null>;
  setFormError: (value: string | null) => void;
  setSubmitting: (value: boolean) => void;
  setRateLimitedUntil: (value: number | null) => void;
  setImageProgress: Dispatch<SetStateAction<Record<string, 'uploading' | 'done' | 'error'>>>;
  setPhotoPermissionDenied: (value: boolean) => void;
  setImages: Dispatch<SetStateAction<LocalFeedbackImage[]>>;
};

async function addFeedbackImage(depsRef: MutableRefObject<FeedbackNewDeps>): Promise<void> {
  const deps = depsRef.current;
  deps.setFormError(null);
  try {
    const picked = await pickFeedbackImageFromLibrary();
    deps.setPhotoPermissionDenied(false);
    if (!picked) return;
    deps.setImages((prev) => {
      if (prev.length >= 3) {
        showToast('You can attach up to 3 screenshots per report.', 'error');
        return prev;
      }
      return [...prev, picked];
    });
  } catch (err) {
    logAppError('feedback.pickImage', err);
    if (err instanceof FeedbackAttachmentError && err.code === 'permission-denied') {
      deps.setPhotoPermissionDenied(true);
      return;
    }
    showToast(toUserFeedbackAttachmentMessage(err), 'error');
  }
}

async function submitNewFeedback(depsRef: MutableRefObject<FeedbackNewDeps>): Promise<void> {
  const deps = depsRef.current;
  deps.setFormError(null);
  if (deps.rateLimited) {
    deps.setFormError('Too many reports. Please wait a moment before trying again.');
    return;
  }
  if (!deps.category) {
    deps.setFormError('Choose a category.');
    return;
  }
  const trimmed = deps.message.trim();
  if (trimmed.length < 1) {
    deps.setFormError('Enter a message.');
    return;
  }
  if (trimmed.length > FEEDBACK_MESSAGE_MAX_CHARS) {
    deps.setFormError(`Message must be at most ${FEEDBACK_MESSAGE_MAX_CHARS} characters.`);
    return;
  }

  deps.setSubmitting(true);
  try {
    const created = await deps.createMutation.mutateAsync({
      category: deps.category,
      message: trimmed,
      platform: getFeedbackPlatform(),
      appVersion: getFeedbackAppVersion(),
    });

    let failedUploads = 0;
    if (deps.images.length > 0) {
      const results = await uploadFeedbackAttachments(created.id, deps.images, (localId, phase) => {
        deps.setImageProgress((prev) => ({ ...prev, [localId]: phase }));
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
    deps.router.replace(`/feedback-detail/${created.id}`);
  } catch (err) {
    logAppError('feedback.create', err);
    if (isLikelyOfflineError(err)) {
      deps.setFormError('Connect to the internet to send feedback.');
      return;
    }
    if (err instanceof ApiError && err.status === 429) {
      const seconds = err.retryAfterSeconds ?? 60;
      const until = Date.now() + seconds * 1000;
      deps.setRateLimitedUntil(until);
      if (deps.rateLimitTimer.current) clearTimeout(deps.rateLimitTimer.current);
      deps.rateLimitTimer.current = setTimeout(() => {
        deps.setRateLimitedUntil(null);
      }, seconds * 1000);
      deps.setFormError(`Too many reports. Try again in about ${seconds} seconds.`);
      return;
    }
    if (err instanceof ApiError && err.status === 400) {
      deps.setFormError(toUserErrorMessage(err, 'Check your message and try again.'));
      return;
    }
    if (err instanceof FeedbackAttachmentError) {
      showToast(toUserFeedbackAttachmentMessage(err), 'error');
      return;
    }
    showToast(toUserErrorMessage(err, "Couldn't send feedback"), 'error');
  } finally {
    deps.setSubmitting(false);
  }
}

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
  const rateLimited = rateLimitedUntil != null && Date.now() < rateLimitedUntil;

  const depsRef = useRef<FeedbackNewDeps>({
    category,
    message,
    images,
    rateLimited,
    createMutation,
    router,
    rateLimitTimer,
    setFormError,
    setSubmitting,
    setRateLimitedUntil,
    setImageProgress,
    setPhotoPermissionDenied,
    setImages,
  });
  depsRef.current = {
    category,
    message,
    images,
    rateLimited,
    createMutation,
    router,
    rateLimitTimer,
    setFormError,
    setSubmitting,
    setRateLimitedUntil,
    setImageProgress,
    setPhotoPermissionDenied,
    setImages,
  };

  useEffect(() => {
    const timer = rateLimitTimer;
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, []);

  useFocusEffect(
    useCallback(() => {
      void isFeedbackMediaLibraryPermissionDenied().then(setPhotoPermissionDenied);
    }, [])
  );

  const onAddImage = addFeedbackImage.bind(null, depsRef);
  const onSubmit = submitNewFeedback.bind(null, depsRef);

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
        onAddImage={() => void onAddImage()}
        onRemoveImage={(index) => {
          setImages((prev) => prev.filter((_, i) => i !== index));
        }}
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
