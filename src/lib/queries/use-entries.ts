import { useQuery } from '@tanstack/react-query';

import { useAuth } from '@/components/auth/auth-provider';
import { getEntries } from '@/lib/api';

import { queryKeys } from './keys';

const DAY_STALE_TIME = 60_000;
const DAY_GC_TIME = 10 * 60_000;

export function useEntries(date: string) {
  const { user } = useAuth();
  return useQuery({
    queryKey: queryKeys.entries(user?.uid, date),
    queryFn: () => getEntries({ date }),
    enabled: !!user && !!date,
    staleTime: DAY_STALE_TIME,
    gcTime: DAY_GC_TIME,
  });
}

export function useEntriesRange(startDate: string, endDate: string) {
  const { user } = useAuth();
  return useQuery({
    queryKey: queryKeys.entriesRange(user?.uid, startDate, endDate),
    queryFn: () => getEntries({ startDate, endDate }),
    enabled: !!user && !!startDate && !!endDate,
    staleTime: DAY_STALE_TIME,
    gcTime: DAY_GC_TIME,
  });
}
