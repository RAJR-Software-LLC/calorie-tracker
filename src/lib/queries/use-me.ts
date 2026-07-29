import { useQuery, type QueryClient } from '@tanstack/react-query';

import { useAuth } from '@/components/auth/auth-provider';
import { getMe } from '@/lib/api';
import type { GetMeResponse, UserProfilePhotoWithDownload } from '@/types';

import { queryKeys } from './keys';

const ME_STALE_TIME = 5 * 60_000;
const ME_GC_TIME = 30 * 60_000;

export function useMe(options?: { enabled?: boolean }) {
  const { user } = useAuth();
  const queryEnabled = options?.enabled ?? true;
  return useQuery({
    queryKey: queryKeys.me(user?.uid),
    queryFn: getMe,
    enabled: !!user && queryEnabled,
    staleTime: ME_STALE_TIME,
    gcTime: ME_GC_TIME,
  });
}

export function useMeProfilePhoto(options?: { enabled?: boolean }): UserProfilePhotoWithDownload | null {
  const { data } = useMe(options);
  const photo = data?.profilePhoto;
  if (
    photo &&
    typeof photo === 'object' &&
    'downloadUrl' in photo &&
    typeof photo.downloadUrl === 'string' &&
    photo.downloadUrl.length > 0
  ) {
    return photo as UserProfilePhotoWithDownload;
  }
  return null;
}

export function updateMeCache(
  queryClient: QueryClient,
  uid: string | undefined,
  data: GetMeResponse
): void {
  if (!uid) return;
  queryClient.setQueryData(queryKeys.me(uid), data);
}

export function invalidateMe(queryClient: QueryClient, uid: string | undefined): Promise<void> {
  if (!uid) return Promise.resolve();
  return queryClient.invalidateQueries({ queryKey: queryKeys.me(uid) }).then(() => undefined);
}

export async function fetchMeIfStale(
  queryClient: QueryClient,
  uid: string
): Promise<GetMeResponse | null> {
  return queryClient.fetchQuery({
    queryKey: queryKeys.me(uid),
    queryFn: getMe,
    staleTime: ME_STALE_TIME,
  });
}
