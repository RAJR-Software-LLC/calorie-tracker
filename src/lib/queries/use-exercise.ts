import { useQuery } from '@tanstack/react-query';

import { useAuth } from '@/components/auth/auth-provider';
import { getExerciseForDate } from '@/lib/api';

import { queryKeys } from './keys';

const DAY_STALE_TIME = 60_000;
const DAY_GC_TIME = 10 * 60_000;

export function useExercise(date: string, enabled = true) {
  const { user } = useAuth();
  return useQuery({
    queryKey: queryKeys.exercise(user?.uid, date),
    queryFn: () => getExerciseForDate(date),
    enabled: !!user && !!date && enabled,
    staleTime: DAY_STALE_TIME,
    gcTime: DAY_GC_TIME,
  });
}
