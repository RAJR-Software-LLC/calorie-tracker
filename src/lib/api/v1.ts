import type {
  BulkExerciseResult,
  CalorieEntryWithId,
  CreateFamilyResponse,
  GetExercisePresetsResponse,
  ExerciseWithId,
  FamilySharedItemWithId,
  FamilyWithId,
  GetMeResponse,
  GetWaterDailyQuery,
  JoinFamilyResponse,
  PatchExerciseBody,
  PatchMeBody,
  PatchMeWaterBody,
  PostEntryBody,
  PostExerciseBulkBody,
  PostExerciseBody,
  PostFamilyBody,
  PostFamilySharedItemBody,
  PostJoinFamilyBody,
  PostProfilePhotoCompleteBody,
  PostProfilePhotoUploadUrlBody,
  PostProfilePhotoUploadUrlResponse,
  PostPushTokenBody,
  PostPushTokenResponse,
  PostSavedItemBody,
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

export async function deleteSavedItem(itemId: string): Promise<void> {
  await apiRequest<void>(`/me/saved-items/${encodeURIComponent(itemId)}`, { method: 'DELETE' });
}

export async function getExerciseForDate(date: string): Promise<ExerciseWithId[]> {
  const params = new URLSearchParams({ date });
  return apiRequest<ExerciseWithId[]>(`/me/exercise?${params.toString()}`);
}

export type ExerciseQuery = { date: string } | { startDate: string; endDate: string };

export async function getExercises(query: ExerciseQuery): Promise<ExerciseWithId[]> {
  const params = new URLSearchParams(
    'date' in query ? { date: query.date } : { startDate: query.startDate, endDate: query.endDate }
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

export async function getExercisePresets(): Promise<GetExercisePresetsResponse> {
  return apiRequest<GetExercisePresetsResponse>('/me/exercise/presets');
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

export async function getFamily(familyId: string): Promise<FamilyWithId> {
  return apiRequest<FamilyWithId>(`/families/${encodeURIComponent(familyId)}`);
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
