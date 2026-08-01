import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useAuth } from '@/components/auth/auth-provider';
import {
  deleteFeedback,
  getFeedbackDetail,
  getFeedbackList,
  patchFeedback,
  postFeedback,
  postFeedbackComment,
  type FeedbackListQuery,
} from '@/lib/api';
import type {
  FeedbackDetail,
  FeedbackDocument,
  FeedbackStatus,
  PatchFeedbackBody,
  PostFeedbackBody,
  PostFeedbackCommentBody,
} from '@/types';

import { queryKeys } from './keys';

const FEEDBACK_STALE_TIME = 60_000;
const FEEDBACK_GC_TIME = 10 * 60_000;

export function useFeedbackList(status?: FeedbackStatus | 'all') {
  const { user } = useAuth();
  const filter: FeedbackStatus | undefined = status && status !== 'all' ? status : undefined;
  const query: FeedbackListQuery | undefined = filter ? { status: filter } : undefined;

  return useQuery({
    queryKey: queryKeys.feedbackList(user?.uid, filter ?? 'all'),
    queryFn: () => getFeedbackList(query),
    enabled: !!user,
    staleTime: FEEDBACK_STALE_TIME,
    gcTime: FEEDBACK_GC_TIME,
  });
}

export function useFeedbackDetail(feedbackId: string | undefined) {
  const { user } = useAuth();
  return useQuery({
    queryKey: queryKeys.feedbackDetail(user?.uid, feedbackId),
    queryFn: () => getFeedbackDetail(feedbackId!),
    enabled: !!user && !!feedbackId,
    staleTime: FEEDBACK_STALE_TIME,
    gcTime: FEEDBACK_GC_TIME,
  });
}

export function useInvalidateFeedback() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return {
    invalidateLists: () =>
      queryClient.invalidateQueries({ queryKey: queryKeys.feedbackRoot(user?.uid) }),
    invalidateDetail: (feedbackId: string) =>
      queryClient.invalidateQueries({
        queryKey: queryKeys.feedbackDetail(user?.uid, feedbackId),
      }),
  };
}

export function useCreateFeedbackMutation() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: (body: PostFeedbackBody) => postFeedback(body),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.feedbackRoot(user?.uid) });
    },
  });
}

export function usePatchFeedbackMutation(feedbackId: string) {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: (body: PatchFeedbackBody) => patchFeedback(feedbackId, body),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.feedbackDetail(user?.uid, feedbackId),
      });
      void queryClient.invalidateQueries({ queryKey: queryKeys.feedbackRoot(user?.uid) });
    },
  });
}

export function useDeleteFeedbackMutation() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: (feedbackId: string) => deleteFeedback(feedbackId),
    onSuccess: (_data, feedbackId) => {
      queryClient.setQueriesData<FeedbackDocument[]>(
        { queryKey: queryKeys.feedbackRoot(user?.uid) },
        (old) => (old ? old.filter((item) => item.id !== feedbackId) : old)
      );
      queryClient.removeQueries({
        queryKey: queryKeys.feedbackDetail(user?.uid, feedbackId),
      });
      void queryClient.invalidateQueries({ queryKey: queryKeys.feedbackRoot(user?.uid) });
    },
  });
}

export function usePostFeedbackCommentMutation(feedbackId: string) {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: (body: PostFeedbackCommentBody) => postFeedbackComment(feedbackId, body),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.feedbackDetail(user?.uid, feedbackId),
      });
    },
  });
}

export function removeFeedbackFromListCaches(
  queryClient: ReturnType<typeof useQueryClient>,
  uid: string | undefined,
  feedbackId: string
): void {
  queryClient.setQueriesData<FeedbackDocument[]>(
    { queryKey: queryKeys.feedbackRoot(uid) },
    (old) => (old ? old.filter((item) => item.id !== feedbackId) : old)
  );
}

export type { FeedbackDetail, FeedbackDocument };
