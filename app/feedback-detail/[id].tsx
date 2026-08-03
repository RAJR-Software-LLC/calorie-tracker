import { Stack, useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type Dispatch,
  type MutableRefObject,
  type SetStateAction,
} from 'react';
import { ActivityIndicator, Alert, Pressable, Text, TextInput, View } from 'react-native';

import { FeedbackAddScreenshotButton } from '@/components/feedback/feedback-add-screenshot-button';
import { FeedbackAttachmentGallery } from '@/components/feedback/feedback-attachment-gallery';
import { FeedbackCommentThread } from '@/components/feedback/feedback-comment-thread';
import {
  FeedbackComposeForm,
  FEEDBACK_MESSAGE_MAX_CHARS,
} from '@/components/feedback/feedback-compose-form';
import { FeedbackStatusBadge } from '@/components/feedback/feedback-status-badge';
import { AppScreen } from '@/components/layout/app-screen';
import { Button } from '@/components/ui/button';
import { ApiError } from '@/lib/api/errors';
import { logAppError, toUserErrorMessage } from '@/lib/app-errors';
import {
  FEEDBACK_ATTACHMENT_MAX_COUNT,
  FeedbackAttachmentError,
  isFeedbackMediaLibraryPermissionDenied,
  isLikelyOfflineError,
  pickFeedbackImageFromLibrary,
  toUserFeedbackAttachmentMessage,
  uploadFeedbackAttachment,
  type LocalFeedbackImage,
} from '@/lib/feedback/attachments';
import { isFeedbackEditable } from '@/lib/feedback/editable';
import { FEEDBACK_CATEGORY_LABELS } from '@/lib/feedback/labels';
import {
  useDeleteFeedbackMutation,
  useFeedbackDetail,
  usePatchFeedbackMutation,
  usePostFeedbackCommentMutation,
} from '@/lib/queries';
import { showToast } from '@/lib/toast';
import { useThemePalette } from '@/lib/use-theme-palette';
import type { FeedbackCategory, FeedbackDetail } from '@/types';

type DetailQuery = ReturnType<typeof useFeedbackDetail>;
type PatchMutation = ReturnType<typeof usePatchFeedbackMutation>;
type CommentMutation = ReturnType<typeof usePostFeedbackCommentMutation>;
type DeleteMutation = ReturnType<typeof useDeleteFeedbackMutation>;

type FeedbackDetailDeps = {
  feedbackId: string | undefined;
  detail: FeedbackDetail | undefined;
  editable: boolean;
  editCategory: FeedbackCategory | null;
  editMessage: string;
  commentBody: string;
  retryImages: LocalFeedbackImage[];
  detailQuery: DetailQuery;
  patchMutation: PatchMutation;
  commentMutation: CommentMutation;
  deleteMutation: DeleteMutation;
  router: ReturnType<typeof useRouter>;
  leaveNotFound: () => void;
  setEditing: (value: boolean) => void;
  setEditCategory: (value: FeedbackCategory | null) => void;
  setEditMessage: (value: string) => void;
  setEditError: (value: string | null) => void;
  setCommentBody: (value: string) => void;
  setCommentError: (value: string | null) => void;
  setRetryImages: Dispatch<SetStateAction<LocalFeedbackImage[]>>;
  setUploadingRetry: (value: boolean) => void;
  setPhotoPermissionDenied: (value: boolean) => void;
};

function startEditFeedback(depsRef: MutableRefObject<FeedbackDetailDeps>): void {
  const deps = depsRef.current;
  if (!deps.detail || !deps.editable) return;
  deps.setEditCategory(deps.detail.category);
  deps.setEditMessage(deps.detail.message);
  deps.setEditError(null);
  deps.setEditing(true);
}

async function saveEditFeedback(depsRef: MutableRefObject<FeedbackDetailDeps>): Promise<void> {
  const deps = depsRef.current;
  if (!deps.feedbackId || !deps.detail) return;
  deps.setEditError(null);
  const trimmed = deps.editMessage.trim();
  if (!deps.editCategory) {
    deps.setEditError('Choose a category.');
    return;
  }
  if (trimmed.length < 1) {
    deps.setEditError('Enter a message.');
    return;
  }
  if (trimmed.length > FEEDBACK_MESSAGE_MAX_CHARS) {
    deps.setEditError(`Message must be at most ${FEEDBACK_MESSAGE_MAX_CHARS} characters.`);
    return;
  }

  const body: { category?: FeedbackCategory; message?: string } = {};
  if (deps.editCategory !== deps.detail.category) body.category = deps.editCategory;
  if (trimmed !== deps.detail.message) body.message = trimmed;
  if (!body.category && !body.message) {
    deps.setEditing(false);
    return;
  }

  try {
    await deps.patchMutation.mutateAsync(body);
    deps.setEditing(false);
    showToast('Report updated', 'success');
  } catch (err) {
    logAppError('feedback.patch', err, { feedbackId: deps.feedbackId });
    if (err instanceof ApiError && err.status === 409) {
      deps.setEditError('This report can no longer be edited.');
      deps.setEditing(false);
      void deps.detailQuery.refetch();
      showToast('This report can no longer be edited.', 'error');
      return;
    }
    if (err instanceof ApiError && err.status === 404) {
      deps.leaveNotFound();
      return;
    }
    if (err instanceof ApiError && err.status === 400) {
      deps.setEditError(toUserErrorMessage(err, 'Check your message and try again.'));
      return;
    }
    showToast(toUserErrorMessage(err, "Couldn't update report"), 'error');
  }
}

async function sendFeedbackComment(depsRef: MutableRefObject<FeedbackDetailDeps>): Promise<void> {
  const deps = depsRef.current;
  if (!deps.feedbackId || !deps.editable) return;
  deps.setCommentError(null);
  const trimmed = deps.commentBody.trim();
  if (!trimmed) {
    deps.setCommentError('Enter a comment.');
    return;
  }
  if (trimmed.length > 2000) {
    deps.setCommentError('Comment must be at most 2000 characters.');
    return;
  }
  try {
    await deps.commentMutation.mutateAsync({ body: trimmed });
    deps.setCommentBody('');
    showToast('Comment added', 'success');
  } catch (err) {
    logAppError('feedback.comment', err, { feedbackId: deps.feedbackId });
    if (isLikelyOfflineError(err)) {
      deps.setCommentError('Connect to the internet to send a comment.');
      return;
    }
    if (err instanceof ApiError && err.status === 409) {
      deps.setCommentError('This report can no longer accept comments.');
      void deps.detailQuery.refetch();
      showToast('This report can no longer accept comments.', 'error');
      return;
    }
    if (err instanceof ApiError && err.status === 404) {
      deps.leaveNotFound();
      return;
    }
    if (err instanceof ApiError && err.status === 400) {
      deps.setCommentError(toUserErrorMessage(err, 'Check your comment and try again.'));
      return;
    }
    showToast(toUserErrorMessage(err, "Couldn't add comment"), 'error');
  }
}

function confirmDeleteFeedback(depsRef: MutableRefObject<FeedbackDetailDeps>): void {
  const deps = depsRef.current;
  if (!deps.feedbackId) return;
  const feedbackId = deps.feedbackId;
  Alert.alert('Delete report?', 'This removes the report from your list. You cannot undo this.', [
    { text: 'Cancel', style: 'cancel' },
    {
      text: 'Delete',
      style: 'destructive',
      onPress: () => {
        deps.deleteMutation.mutate(feedbackId, {
          onError: (err) => {
            logAppError('feedback.delete', err, { feedbackId });
            if (err instanceof ApiError && err.status === 404) {
              deps.leaveNotFound();
              return;
            }
            showToast(toUserErrorMessage(err, "Couldn't delete report"), 'error');
          },
          onSuccess: () => {
            showToast('Report deleted', 'success');
            deps.router.replace('/feedback');
          },
        });
      },
    },
  ]);
}

async function addRetryFeedbackImage(depsRef: MutableRefObject<FeedbackDetailDeps>): Promise<void> {
  const deps = depsRef.current;
  if (!deps.detail || !deps.editable) return;
  const remaining = FEEDBACK_ATTACHMENT_MAX_COUNT - (deps.detail.attachments?.length ?? 0);
  if (remaining <= 0) {
    showToast('You can attach up to 3 screenshots per report.', 'error');
    return;
  }
  try {
    const picked = await pickFeedbackImageFromLibrary();
    deps.setPhotoPermissionDenied(false);
    if (!picked) return;
    deps.setRetryImages((prev) => {
      if (prev.length >= remaining) {
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

async function uploadRetryFeedbackImages(
  depsRef: MutableRefObject<FeedbackDetailDeps>
): Promise<void> {
  const deps = depsRef.current;
  if (!deps.feedbackId || deps.retryImages.length === 0) return;
  deps.setUploadingRetry(true);
  const remaining: LocalFeedbackImage[] = [];
  let failures = 0;
  for (const image of deps.retryImages) {
    try {
      await uploadFeedbackAttachment(deps.feedbackId, image);
    } catch (err) {
      failures += 1;
      remaining.push(image);
      logAppError('feedback.retryUpload', err, {
        feedbackId: deps.feedbackId,
        localId: image.localId,
      });
      if (err instanceof ApiError && err.status === 409) {
        showToast('You can attach up to 3 screenshots per report.', 'error');
        break;
      }
    }
  }
  deps.setRetryImages(remaining);
  deps.setUploadingRetry(false);
  void deps.detailQuery.refetch();
  if (failures === 0) {
    showToast('Screenshots uploaded', 'success');
  } else {
    showToast('Some screenshots failed to upload. You can try again.', 'error');
  }
}

export default function FeedbackDetailScreen() {
  const router = useRouter();
  const p = useThemePalette();
  const params = useLocalSearchParams<{ id: string }>();
  const feedbackId = typeof params.id === 'string' ? params.id : undefined;

  const detailQuery = useFeedbackDetail(feedbackId);
  const patchMutation = usePatchFeedbackMutation(feedbackId ?? '');
  const commentMutation = usePostFeedbackCommentMutation(feedbackId ?? '');
  const deleteMutation = useDeleteFeedbackMutation();

  const [editing, setEditing] = useState(false);
  const [editCategory, setEditCategory] = useState<FeedbackCategory | null>(null);
  const [editMessage, setEditMessage] = useState('');
  const [editError, setEditError] = useState<string | null>(null);
  const [commentBody, setCommentBody] = useState('');
  const [commentError, setCommentError] = useState<string | null>(null);
  const [retryImages, setRetryImages] = useState<LocalFeedbackImage[]>([]);
  const [uploadingRetry, setUploadingRetry] = useState(false);
  const [photoPermissionDenied, setPhotoPermissionDenied] = useState(false);

  const refetchDetail = detailQuery.refetch;
  const detail = detailQuery.data;
  const editable = detail ? isFeedbackEditable(detail.status) : false;

  const leaveNotFound = useCallback(() => {
    showToast('That report is no longer available.', 'error');
    router.replace('/feedback');
  }, [router]);

  const depsRef = useRef<FeedbackDetailDeps>({
    feedbackId,
    detail,
    editable,
    editCategory,
    editMessage,
    commentBody,
    retryImages,
    detailQuery,
    patchMutation,
    commentMutation,
    deleteMutation,
    router,
    leaveNotFound,
    setEditing,
    setEditCategory,
    setEditMessage,
    setEditError,
    setCommentBody,
    setCommentError,
    setRetryImages,
    setUploadingRetry,
    setPhotoPermissionDenied,
  });
  depsRef.current = {
    feedbackId,
    detail,
    editable,
    editCategory,
    editMessage,
    commentBody,
    retryImages,
    detailQuery,
    patchMutation,
    commentMutation,
    deleteMutation,
    router,
    leaveNotFound,
    setEditing,
    setEditCategory,
    setEditMessage,
    setEditError,
    setCommentBody,
    setCommentError,
    setRetryImages,
    setUploadingRetry,
    setPhotoPermissionDenied,
  };

  useFocusEffect(
    useCallback(() => {
      void refetchDetail();
      void isFeedbackMediaLibraryPermissionDenied().then(setPhotoPermissionDenied);
    }, [refetchDetail])
  );

  useEffect(() => {
    if (!detailQuery.isError) return;
    const err = detailQuery.error;
    if (err instanceof ApiError && err.status === 404) {
      leaveNotFound();
    }
  }, [detailQuery.isError, detailQuery.error, leaveNotFound]);

  const startEdit = startEditFeedback.bind(null, depsRef);
  const saveEdit = saveEditFeedback.bind(null, depsRef);
  const sendComment = sendFeedbackComment.bind(null, depsRef);
  const confirmDelete = confirmDeleteFeedback.bind(null, depsRef);
  const addRetryImage = addRetryFeedbackImage.bind(null, depsRef);
  const uploadRetries = uploadRetryFeedbackImages.bind(null, depsRef);

  if (!feedbackId) {
    return (
      <AppScreen showHeader={false}>
        <Text className="text-sm text-muted-foreground dark:text-darkMutedForeground">
          Report not found.
        </Text>
      </AppScreen>
    );
  }

  if (detailQuery.isLoading && !detail) {
    return (
      <AppScreen showHeader={false}>
        <View className="items-center py-16">
          <ActivityIndicator size="large" color={p.primary} />
        </View>
      </AppScreen>
    );
  }

  if (!detail) {
    return (
      <AppScreen showHeader={false}>
        <Text className="text-sm text-muted-foreground dark:text-darkMutedForeground">
          {detailQuery.isError
            ? toUserErrorMessage(detailQuery.error, "Couldn't load report")
            : 'Report not found.'}
        </Text>
        <Button variant="outline" onPress={() => router.replace('/feedback')}>
          Back to list
        </Button>
      </AppScreen>
    );
  }

  return (
    <AppScreen showHeader={false}>
      <Stack.Screen
        options={{
          title: 'Report',
          headerBackTitle: 'Feedback',
          headerBackButtonDisplayMode: 'minimal',
        }}
      />
      <View className="flex-row items-center justify-between gap-2">
        <Text className="text-lg font-semibold text-foreground dark:text-darkForeground">
          {FEEDBACK_CATEGORY_LABELS[detail.category]}
        </Text>
        <FeedbackStatusBadge status={detail.status} />
      </View>

      {!editable ? (
        <Text className="text-sm text-muted-foreground dark:text-darkMutedForeground">
          This report is {detail.status === 'resolved' ? 'resolved' : 'closed'} and can no longer be
          edited.
        </Text>
      ) : null}

      {editing && editable ? (
        <View className="gap-3">
          <FeedbackComposeForm
            category={editCategory}
            onCategoryChange={setEditCategory}
            message={editMessage}
            onMessageChange={setEditMessage}
            error={editError}
            disabled={patchMutation.isPending}
            showAttachments={false}
          />
          <View className="flex-row gap-2">
            <Button
              variant="outline"
              className="flex-1"
              onPress={() => setEditing(false)}
              disabled={patchMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              className="flex-1"
              onPress={() => void saveEdit()}
              disabled={patchMutation.isPending}
            >
              {patchMutation.isPending ? 'Saving…' : 'Save'}
            </Button>
          </View>
        </View>
      ) : (
        <View className="gap-3 rounded-xl border border-border bg-card p-4 dark:border-darkBorder dark:bg-darkCard">
          <Text selectable className="text-base leading-6 text-foreground dark:text-darkForeground">
            {detail.message}
          </Text>
          {editable ? (
            <Pressable accessibilityRole="button" onPress={startEdit}>
              <Text className="text-sm font-medium text-primary dark:text-darkPrimary">
                Edit message
              </Text>
            </Pressable>
          ) : null}
        </View>
      )}

      <View className="gap-2">
        <Text className="text-base font-semibold text-foreground dark:text-darkForeground">
          Screenshots
        </Text>
        <FeedbackAttachmentGallery
          attachments={detail.attachments ?? []}
          onExpiredUrl={() => void detailQuery.refetch()}
        />
        {(detail.attachments?.length ?? 0) === 0 && retryImages.length === 0 ? (
          <Text className="text-sm text-muted-foreground dark:text-darkMutedForeground">
            No screenshots attached.
          </Text>
        ) : null}
        {editable && (detail.attachments?.length ?? 0) < FEEDBACK_ATTACHMENT_MAX_COUNT ? (
          <View className="gap-2">
            <FeedbackAttachmentGallery
              attachments={[]}
              localUris={retryImages.map((img) => img.uri)}
              editable
              onRemoveLocal={(index) =>
                setRetryImages((prev) => prev.filter((_, i) => i !== index))
              }
            />
            <FeedbackAddScreenshotButton
              onPress={() => void addRetryImage()}
              disabled={uploadingRetry}
              photoPermissionDenied={photoPermissionDenied}
            />
            {retryImages.length > 0 ? (
              <Button onPress={() => void uploadRetries()} disabled={uploadingRetry}>
                {uploadingRetry ? 'Uploading…' : 'Upload screenshots'}
              </Button>
            ) : null}
          </View>
        ) : null}
      </View>

      <View className="gap-2">
        <Text className="text-base font-semibold text-foreground dark:text-darkForeground">
          Comments
        </Text>
        <FeedbackCommentThread comments={detail.comments ?? []} />
        {editable ? (
          <View className="gap-2">
            <TextInput
              accessibilityLabel="Add a comment"
              multiline
              textAlignVertical="top"
              value={commentBody}
              onChangeText={setCommentBody}
              editable={!commentMutation.isPending}
              maxLength={2000}
              placeholder="Add a comment…"
              placeholderTextColor="#9CA3AF"
              className="min-h-[96px] rounded-xl border border-border bg-card px-3 py-3 text-base text-foreground dark:border-darkBorder dark:bg-darkCard dark:text-darkForeground"
            />
            {commentError ? (
              <Text className="text-sm text-destructive dark:text-darkDestructiveForeground">
                {commentError}
              </Text>
            ) : null}
            <Button onPress={() => void sendComment()} disabled={commentMutation.isPending}>
              {commentMutation.isPending ? 'Sending…' : 'Send comment'}
            </Button>
          </View>
        ) : null}
      </View>

      <Button variant="destructive" onPress={confirmDelete} disabled={deleteMutation.isPending}>
        Delete report
      </Button>
    </AppScreen>
  );
}
