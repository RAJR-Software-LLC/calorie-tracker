import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useAuth } from '@/components/auth/auth-provider';
import {
  getCalculatorFormulas,
  getMe,
  postCalculatorApply,
  postCalculatorEstimate,
} from '@/lib/api';
import type { GetMeResponse, PostCalculatorApplyBody, PostCalculatorEstimateBody } from '@/types';

import { queryKeys } from './keys';
import { updateMeCache } from './use-me';

/** Catalog is versioned; keep warm but refresh periodically. */
const FORMULAS_STALE_TIME = 60 * 60_000;
const FORMULAS_GC_TIME = 6 * 60 * 60_000;

export function useCalculatorFormulas(options?: { enabled?: boolean }) {
  const { user } = useAuth();
  const queryEnabled = options?.enabled ?? true;
  return useQuery({
    queryKey: queryKeys.calculatorFormulas(user?.uid),
    queryFn: getCalculatorFormulas,
    enabled: !!user && queryEnabled,
    staleTime: FORMULAS_STALE_TIME,
    gcTime: FORMULAS_GC_TIME,
  });
}

export function useCalculatorEstimate() {
  return useMutation({
    mutationFn: (body: PostCalculatorEstimateBody) => postCalculatorEstimate(body),
  });
}

export function useCalculatorApply() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (body: PostCalculatorApplyBody) => postCalculatorApply(body),
    onSuccess: async (applyResult) => {
      if (!user?.uid) return;
      // Refetch /me so ETag and full document stay coherent after apply writes.
      try {
        const me = await getMe();
        updateMeCache(queryClient, user.uid, me);
      } catch {
        const previous = queryClient.getQueryData<GetMeResponse>(queryKeys.me(user.uid));
        if (previous) {
          updateMeCache(queryClient, user.uid, {
            ...previous,
            preferredFormulaId: applyResult.preferredFormulaId,
            maintenanceCalories: applyResult.maintenanceCalories,
            calorieGoal: applyResult.calorieGoal,
            goalType: applyResult.goalType,
            calorieCalculation: applyResult.calorieCalculation,
          });
        }
      }
      await queryClient.invalidateQueries({ queryKey: queryKeys.calculatorFormulas(user.uid) });
    },
  });
}
