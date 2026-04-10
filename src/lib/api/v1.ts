import type {
  CalorieEntryWithId,
  CreateFamilyResponse,
  ExerciseWithId,
  FamilySharedItemWithId,
  FamilyWithId,
  GetMeResponse,
  JoinFamilyResponse,
  PatchMeBody,
  PostEntryBody,
  PostExerciseBody,
  PostFamilyBody,
  PostFamilySharedItemBody,
  PostJoinFamilyBody,
  PostSavedItemBody,
  SavedItemWithId,
} from '@/types';

import { apiRequest } from './client';

export async function getMe(): Promise<GetMeResponse> {
  return apiRequest<GetMeResponse>('/me');
}

export async function patchMe(body: PatchMeBody): Promise<GetMeResponse> {
  return apiRequest<GetMeResponse>('/me', { method: 'PATCH', json: body });
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

export async function postExercise(body: PostExerciseBody): Promise<{ id: string }> {
  return apiRequest<{ id: string }>('/me/exercise', { method: 'POST', json: body });
}

export async function deleteExercise(exerciseId: string): Promise<void> {
  await apiRequest<void>(`/me/exercise/${encodeURIComponent(exerciseId)}`, { method: 'DELETE' });
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
