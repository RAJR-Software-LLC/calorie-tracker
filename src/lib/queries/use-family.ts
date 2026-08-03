import { useQuery } from '@tanstack/react-query';

import { useAuth } from '@/components/auth/auth-provider';
import { getFamily } from '@/lib/api';

import { queryKeys } from './keys';

const FAMILY_STALE_TIME = 3 * 60_000;
const FAMILY_GC_TIME = 15 * 60_000;

export function useFamily(familyId: string | null | undefined) {
  const { user } = useAuth();
  return useQuery({
    queryKey: queryKeys.family(user?.uid, familyId ?? null),
    queryFn: () => {
      if (!familyId) {
        throw new Error('familyId required');
      }
      return getFamily(familyId);
    },
    enabled: !!user && !!familyId,
    staleTime: FAMILY_STALE_TIME,
    gcTime: FAMILY_GC_TIME,
  });
}
