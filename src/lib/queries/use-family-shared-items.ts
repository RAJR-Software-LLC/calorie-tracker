import { useQuery } from '@tanstack/react-query';

import { useAuth } from '@/components/auth/auth-provider';
import { getFamilySharedItems } from '@/lib/api';
import { ApiError } from '@/lib/api/errors';

import { queryKeys } from './keys';

const FAMILY_SHARED_STALE_TIME = 4 * 60_000;
const FAMILY_SHARED_GC_TIME = 15 * 60_000;

export function useFamilySharedItems(familyId: string | null | undefined) {
  const { user } = useAuth();
  return useQuery({
    queryKey: queryKeys.familySharedItems(user?.uid, familyId ?? null),
    queryFn: async () => {
      if (!familyId) return [];
      try {
        return await getFamilySharedItems(familyId);
      } catch (err) {
        if (err instanceof ApiError && err.status === 403) {
          return [];
        }
        throw err;
      }
    },
    enabled: !!user && !!familyId,
    staleTime: FAMILY_SHARED_STALE_TIME,
    gcTime: FAMILY_SHARED_GC_TIME,
  });
}
