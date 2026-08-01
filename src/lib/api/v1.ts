import type {
  BulkExerciseResult,
  CalorieEntryWithId,
  CreateFamilyResponse,
  FeedbackDetail,
  FeedbackDocument,
  FeedbackStatus,
  GetExercisePresetsResponse,
  ExerciseSyncStateDocument,
  ExerciseWithId,
  FamilySharedItemWithId,
  FamilyWithMemberProfiles,
  GetMeResponse,
  GetWaterDailyQuery,
  JoinFamilyResponse,
  PatchExerciseBody,
  PatchFeedbackBody,
  PatchMeBody,
  PatchMeWaterBody,
  PostEntryBody,
  PostExerciseBulkBody,
  PostExerciseBody,
  PostFamilyBody,
  PostFamilySharedItemBody,
  PostFeedbackAttachmentCompleteBody,
  PostFeedbackAttachmentUploadUrlBody,
  PostFeedbackAttachmentUploadUrlResponse,
  PostFeedbackBody,
  PostFeedbackCommentBody,
  PostFeedbackCommentResponse,
  PostFeedbackResponse,
  PostJoinFamilyBody,
  PostProfilePhotoCompleteBody,
  PostProfilePhotoUploadUrlBody,
  PostProfilePhotoUploadUrlResponse,
  PostPushTokenBody,
  PostPushTokenResponse,
  PatchSavedItemBody,
  PostSavedItemBody,
  PutExerciseSyncStateBody,
  PutMeWaterBody,
  SavedItemWithId,
  WaterDailyWithId,
} from '@/types';

import { apiRequest } from './client';
import { withWater429Retry } from './water-429-retry';

export async function getMe(): Promise<GetMeResponse> {
  return apiRequest<GetMeResponse>('/me');
}

export async function patchMe(body: PatchMeBody): Promise<GetMeResponse> {
  return apiRequest<GetMeResponse>('/me', { method: 'PATCH', json: body });
}

export async function postProfilePhotoUploadUrl(
  body: PostProfilePhotoUploadUrlBody
): Promise<PostProfilePhotoUploadUrlResponse> {
  return apiRequest<PostProfilePhotoUploadUrlResponse>('/me/profile-photo/upload-url', {
    method: 'POST',
    json: body,
  });
}

export async function postProfilePhotoComplete(
  body: PostProfilePhotoCompleteBody
): Promise<GetMeResponse> {
  return apiRequest<GetMeResponse>('/me/profile-photo/complete', { method: 'POST', json: body });
}

export async function deleteProfilePhoto(): Promise<void> {
  await apiRequest<void>('/me/profile-photo', { method: 'DELETE' });
}

export async function postPushToken(body: PostPushTokenBody): Promise<PostPushTokenResponse> {
  return apiRequest<PostPushTokenResponse>('/me/push-tokens', { method: 'POST', json: body });
}

export async function deletePushToken(tokenId: string): Promise<void> {
  await apiRequest<void>(`/me/push-tokens/${encodeURIComponent(tokenId)}`, { method: 'DELETE' });
}

export type EntriesQuery = { date: string } | { startDate: string; endDate: string };

export async function getEntries(query: EntriesQuery): Promise<CalorieEntryWithId[]> {
  const params = new URLSearchParams(
    'date' in query ? { date: query.date } : { startDate: query.startDate, endDate: query.endDate }
  );
  return apiRequest<CalorieEntryWithId[]>(`/me/entries?${params.toString()}`);
}

export async function postEntry(body: PostEntryBody): Promise<{ id: string }> {
  return apiRequest<{ id: string }>('/me/entries', { method: 'POST', json: body });
}

export async function deleteEntry(entryId: string): Promise<void> {
  await apiRequest<void>(`/me/entries/${encodeURIComponent(entryId)}`, { method: 'DELETE' });
}

export async function getSavedItems(): Promise<SavedItemWithId[]> {
  return apiRequest<SavedItemWithId[]>('/me/saved-items');
}

export async function postSavedItem(body: PostSavedItemBody): Promise<{ id: string }> {
  return apiRequest<{ id: string }>('/me/saved-items', { method: 'POST', json: body });
}

export async function patchSavedItemUsage(itemId: string): Promise<void> {
  await apiRequest<void>(`/me/saved-items/${encodeURIComponent(itemId)}/usage`, {
    method: 'PATCH',
  });
}

export async function patchSavedItem(
  itemId: string,
  body: PatchSavedItemBody,
  ifUnmodifiedSince: string
): Promise<void> {
  await apiRequest<void>(`/me/saved-items/${encodeURIComponent(itemId)}`, {
    method: 'PATCH',
    json: body,
    headers: { 'If-Unmodified-Since': ifUnmodifiedSince },
  });
}

export async function deleteSavedItem(itemId: string, ifUnmodifiedSince: string): Promise<void> {
  await apiRequest<void>(`/me/saved-items/${encodeURIComponent(itemId)}`, {
    method: 'DELETE',
    headers: { 'If-Unmodified-Since': ifUnmodifiedSince },
  });
}

export async function getExerciseForDate(date: string): Promise<ExerciseWithId[]> {
  const params = new URLSearchParams({ date });
  return apiRequest<ExerciseWithId[]>(`/me/exercise?${params.toString()}`);
}

export type ExerciseQuery =
  | { date: string }
  | { startDate: string; endDate: string }
  | { updatedSince: string };

export async function getExercises(query: ExerciseQuery): Promise<ExerciseWithId[]> {
  const params = new URLSearchParams(
    'date' in query
      ? { date: query.date }
      : 'updatedSince' in query
        ? { updatedSince: query.updatedSince }
        : { startDate: query.startDate, endDate: query.endDate }
  );
  return apiRequest<ExerciseWithId[]>(`/me/exercise?${params.toString()}`);
}

export async function getExercisesByDate(date: string): Promise<ExerciseWithId[]> {
  return getExercises({ date });
}

export async function getExercisesByRange(
  startDate: string,
  endDate: string
): Promise<ExerciseWithId[]> {
  return getExercises({ startDate, endDate });
}

export async function getExercisesUpdatedSince(updatedSince: string): Promise<ExerciseWithId[]> {
  return getExercises({ updatedSince });
}

export async function getExercisePresets(): Promise<GetExercisePresetsResponse> {
  return apiRequest<GetExercisePresetsResponse>('/me/exercise/presets');
}

export async function getExerciseSyncState(): Promise<ExerciseSyncStateDocument> {
  return apiRequest<ExerciseSyncStateDocument>('/me/exercise/sync-state');
}

export async function putExerciseSyncState(body: PutExerciseSyncStateBody): Promise<void> {
  await apiRequest<void>('/me/exercise/sync-state', { method: 'PUT', json: body });
}

export async function postExercise(body: PostExerciseBody): Promise<{ id: string }> {
  return apiRequest<{ id: string }>('/me/exercise', { method: 'POST', json: body });
}

export async function postExerciseBulk(body: PostExerciseBulkBody): Promise<BulkExerciseResult> {
  return apiRequest<BulkExerciseResult>('/me/exercise/bulk', { method: 'POST', json: body });
}

export async function patchExercise(exerciseId: string, body: PatchExerciseBody): Promise<void> {
  await apiRequest<void>(`/me/exercise/${encodeURIComponent(exerciseId)}`, {
    method: 'PATCH',
    json: body,
  });
}

export async function deleteExercise(exerciseId: string): Promise<void> {
  await apiRequest<void>(`/me/exercise/${encodeURIComponent(exerciseId)}`, { method: 'DELETE' });
}

function normalizeWaterQueryDate(date: string): string {
  return date.trim().replace(/\u2212/g, '-');
}

export async function getMeWater(query: GetWaterDailyQuery): Promise<WaterDailyWithId> {
  const date = normalizeWaterQueryDate(query.date);
  const params = new URLSearchParams({ date });
  return withWater429Retry(() => apiRequest<WaterDailyWithId>(`/me/water?${params.toString()}`));
}

export async function putMeWater(body: PutMeWaterBody): Promise<WaterDailyWithId> {
  return withWater429Retry(() =>
    apiRequest<WaterDailyWithId>('/me/water', { method: 'PUT', json: body })
  );
}

export async function patchMeWater(body: PatchMeWaterBody): Promise<WaterDailyWithId> {
  return withWater429Retry(() =>
    apiRequest<WaterDailyWithId>('/me/water', { method: 'PATCH', json: body })
  );
}

export async function postFamily(body: PostFamilyBody): Promise<CreateFamilyResponse> {
  return apiRequest<CreateFamilyResponse>('/families', { method: 'POST', json: body });
}

export async function postJoinFamily(body: PostJoinFamilyBody): Promise<JoinFamilyResponse> {
  return apiRequest<JoinFamilyResponse>('/families/join', { method: 'POST', json: body });
}

export async function getFamily(familyId: string): Promise<FamilyWithMemberProfiles> {
  return apiRequest<FamilyWithMemberProfiles>(`/families/${encodeURIComponent(familyId)}`);
}

export async function getFamilySharedItems(familyId: string): Promise<FamilySharedItemWithId[]> {
  return apiRequest<FamilySharedItemWithId[]>(
    `/families/${encodeURIComponent(familyId)}/shared-items`
  );
}

export async function postFamilySharedItem(
  familyId: string,
  body: PostFamilySharedItemBody
): Promise<{ id: string }> {
  return apiRequest<{ id: string }>(`/families/${encodeURIComponent(familyId)}/shared-items`, {
    method: 'POST',
    json: body,
  });
}

export type FeedbackListQuery = {
  status?: FeedbackStatus;
};

export async function getFeedbackList(query?: FeedbackListQuery): Promise<FeedbackDocument[]> {
  const params = new URLSearchParams();
  if (query?.status) params.set('status', query.status);
  const qs = params.toString();
  return apiRequest<FeedbackDocument[]>(qs ? `/me/feedback?${qs}` : '/me/feedback');
}

export async function postFeedback(body: PostFeedbackBody): Promise<PostFeedbackResponse> {
  return apiRequest<PostFeedbackResponse>('/me/feedback', { method: 'POST', json: body });
}

export async function getFeedbackDetail(feedbackId: string): Promise<FeedbackDetail> {
  return apiRequest<FeedbackDetail>(`/me/feedback/${encodeURIComponent(feedbackId)}`);
}

export async function patchFeedback(feedbackId: string, body: PatchFeedbackBody): Promise<void> {
  await apiRequest<void>(`/me/feedback/${encodeURIComponent(feedbackId)}`, {
    method: 'PATCH',
    json: body,
  });
}

export async function deleteFeedback(feedbackId: string): Promise<void> {
  await apiRequest<void>(`/me/feedback/${encodeURIComponent(feedbackId)}`, {
    method: 'DELETE',
  });
}

export async function postFeedbackComment(
  feedbackId: string,
  body: PostFeedbackCommentBody
): Promise<PostFeedbackCommentResponse> {
  return apiRequest<PostFeedbackCommentResponse>(
    `/me/feedback/${encodeURIComponent(feedbackId)}/comments`,
    { method: 'POST', json: body }
  );
}

export async function postFeedbackAttachmentUploadUrl(
  feedbackId: string,
  body: PostFeedbackAttachmentUploadUrlBody
): Promise<PostFeedbackAttachmentUploadUrlResponse> {
  return apiRequest<PostFeedbackAttachmentUploadUrlResponse>(
    `/me/feedback/${encodeURIComponent(feedbackId)}/attachments/upload-url`,
    { method: 'POST', json: body }
  );
}

export async function postFeedbackAttachmentComplete(
  feedbackId: string,
  body: PostFeedbackAttachmentCompleteBody
): Promise<void> {
  await apiRequest<void>(`/me/feedback/${encodeURIComponent(feedbackId)}/attachments/complete`, {
    method: 'POST',
    json: body,
  });
}
