import { useQuery } from '@tanstack/react-query';

import { useAuth } from '@/components/auth/auth-provider';
import { getSavedItems } from '@/lib/api';

import { queryKeys } from './keys';

const SAVED_ITEMS_STALE_TIME = 3 * 60_000;
const SAVED_ITEMS_GC_TIME = 15 * 60_000;

export function useSavedItems() {
  const { user } = useAuth();
  return useQuery({
    queryKey: queryKeys.savedItems(user?.uid),
    queryFn: getSavedItems,
    enabled: !!user,
    staleTime: SAVED_ITEMS_STALE_TIME,
    gcTime: SAVED_ITEMS_GC_TIME,
  });
}
