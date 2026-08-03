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

/** Matches list caches only — `feedbackRoot` also prefixes detail queries. */
function feedbackListQueryFilter(uid: string | undefined) {
  return {
    queryKey: queryKeys.feedbackRoot(uid),
    predicate: (query: { queryKey: readonly unknown[] }) => query.queryKey[2] === 'list',
  };
}

function removeIdFromFeedbackList(
  old: FeedbackDocument[] | undefined,
  feedbackId: string
): FeedbackDocument[] | undefined {
  if (!Array.isArray(old)) return old;
  return old.filter((item) => item.id !== feedbackId);
}

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
      removeFeedbackFromListCaches(queryClient, user?.uid, feedbackId);
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
  queryClient.setQueriesData<FeedbackDocument[]>(feedbackListQueryFilter(uid), (old) =>
    removeIdFromFeedbackList(old, feedbackId)
  );
}

export type { FeedbackDetail, FeedbackDocument };
