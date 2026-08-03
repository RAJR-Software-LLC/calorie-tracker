import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { useAuth } from '@/components/auth/auth-provider';
import { patchMe } from '@/lib/api';
import { getCalculatorMissingFields, logAppError, toUserErrorMessage } from '@/lib/app-errors';
import {
  buildApplyBody,
  buildEstimateBody,
  buildProfileOverridesFromForm,
  CALCULATOR_INPUT_LABELS,
  formValuesFromProfile,
  type CalculatorFormValues,
} from '@/lib/calculator';
import {
  updateMeCache,
  useCalculatorApply,
  useCalculatorEstimate,
  useCalculatorFormulas,
  useMe,
} from '@/lib/queries';
import { queryClient } from '@/lib/queries/query-client';
import { showToast } from '@/lib/toast';
import type { FormulaEstimate, FormulaId, GetMeResponse } from '@/types';

function getMissingFromForm(form: CalculatorFormValues): string[] {
  const missing: string[] = [];
  const age = Number.parseInt(form.age.trim(), 10);
  if (!Number.isInteger(age) || age < 13 || age > 120) missing.push('age');
  if (form.sex !== 'male' && form.sex !== 'female') missing.push('sex');
  if (form.heightUnit === 'cm') {
    const h = Number(form.heightCm);
    if (!Number.isFinite(h) || h <= 0) missing.push('heightCm');
  } else if (!form.heightFeet.trim() || !form.heightInches.trim()) {
    missing.push('heightCm');
  }
  if (!form.weight.trim() || !Number.isFinite(Number(form.weight)) || Number(form.weight) <= 0) {
    missing.push('weightKg');
  }
  if (!form.activityLevel) missing.push('activityLevel');
  return missing;
}

export function useCalculatorFlow(options?: { persistProfileBeforeEstimate?: boolean }) {
  const persistProfileBeforeEstimate = options?.persistProfileBeforeEstimate ?? true;
  const { user } = useAuth();
  const { data: me, isLoading: meLoading, isError: meError, refetch: refetchMe } = useMe();
  const formulasQuery = useCalculatorFormulas();
  const estimateMutation = useCalculatorEstimate();
  const applyMutation = useCalculatorApply();
  const seededRef = useRef(false);

  const [form, setForm] = useState<CalculatorFormValues>(() =>
    formValuesFromProfile(me?.profile, {
      goalType: me?.goalType ?? 'maintain',
      calorieGoalMode: me?.calorieGoal?.mode ?? 'single',
    })
  );
  const [selectedFormulaId, setSelectedFormulaId] = useState<FormulaId | null>(
    me?.preferredFormulaId ?? null
  );
  const [results, setResults] = useState<FormulaEstimate[]>([]);
  const [estimateError, setEstimateError] = useState<string | null>(null);
  const [missingFields, setMissingFields] = useState<string[]>([]);

  useEffect(() => {
    if (!me || seededRef.current) return;
    seededRef.current = true;
    setForm(
      formValuesFromProfile(me.profile, {
        goalType: me.goalType ?? 'maintain',
        calorieGoalMode: me.calorieGoal?.mode ?? 'single',
      })
    );
    if (me.preferredFormulaId) {
      setSelectedFormulaId(me.preferredFormulaId);
    }
  }, [me]);

  useEffect(() => {
    const defaultId = formulasQuery.data?.defaultFormulaId;
    if (!selectedFormulaId && defaultId) {
      setSelectedFormulaId(defaultId);
    }
  }, [formulasQuery.data?.defaultFormulaId, selectedFormulaId]);

  const catalogVersion = formulasQuery.data?.formulas[0]?.formulaVersion ?? null;

  const clientMissing = useMemo(() => getMissingFromForm(form), [form]);

  const missingLabels = useMemo(() => {
    const fields = missingFields.length > 0 ? missingFields : clientMissing;
    return fields.map(
      (f) => CALCULATOR_INPUT_LABELS[f as keyof typeof CALCULATOR_INPUT_LABELS] ?? f
    );
  }, [missingFields, clientMissing]);

  const selectedEstimate = useMemo(
    () => results.find((r) => r.formulaId === selectedFormulaId) ?? null,
    [results, selectedFormulaId]
  );

  const runEstimate = useCallback(
    async (formulaId?: FormulaId) => {
      setEstimateError(null);
      setMissingFields([]);

      const { overrides, errors } = buildProfileOverridesFromForm(form);
      if (errors.length > 0) {
        setEstimateError(errors[0] ?? 'Check your inputs.');
        return null;
      }

      try {
        if (persistProfileBeforeEstimate && overrides) {
          const patched = await patchMe({
            profile: {
              ...overrides,
              heightUnit: form.heightUnit,
              weightUnit: form.weightUnit,
            },
            goalType: form.goalType,
          });
          if (patched && user?.uid) {
            updateMeCache(queryClient, user.uid, patched);
          }
        }

        const body = buildEstimateBody({
          goalType: form.goalType,
          calorieGoalMode: form.calorieGoalMode,
          formulaId,
          profile: persistProfileBeforeEstimate ? undefined : overrides,
        });
        // If we did not persist, send overrides so estimate still works.
        if (persistProfileBeforeEstimate) {
          // After PATCH, estimate uses stored profile.
        } else if (overrides) {
          body.profile = overrides;
        }

        const response = await estimateMutation.mutateAsync(body);
        setResults(response.results);
        const nextSelected =
          (selectedFormulaId &&
            response.results.some((r) => r.formulaId === selectedFormulaId) &&
            selectedFormulaId) ||
          response.defaultFormulaId;
        setSelectedFormulaId(nextSelected);
        return response;
      } catch (err) {
        logAppError('calculator/estimate', err);
        const missing = getCalculatorMissingFields(err);
        if (missing) {
          setMissingFields(missing);
          setEstimateError(toUserErrorMessage(err, 'Complete your profile to estimate calories.'));
        } else {
          setEstimateError(
            toUserErrorMessage(err, 'Could not estimate calories. Check your connection and try again.')
          );
        }
        return null;
      }
    },
    [
      form,
      persistProfileBeforeEstimate,
      estimateMutation,
      selectedFormulaId,
      user?.uid,
    ]
  );

  const runApply = useCallback(async () => {
    const formulaId = selectedFormulaId ?? formulasQuery.data?.defaultFormulaId;
    if (!formulaId) {
      showToast('Choose a formula first.', 'error');
      return null;
    }

    const { overrides, errors } = buildProfileOverridesFromForm(form);
    if (errors.length > 0) {
      showToast(errors[0] ?? 'Check your inputs.', 'error');
      return null;
    }

    try {
      if (persistProfileBeforeEstimate && overrides) {
        const patched = await patchMe({
          profile: {
            ...overrides,
            heightUnit: form.heightUnit,
            weightUnit: form.weightUnit,
          },
          goalType: form.goalType,
        });
        if (patched && user?.uid) {
          updateMeCache(queryClient, user.uid, patched);
        }
      }

      const body = buildApplyBody({
        formulaId,
        goalType: form.goalType,
        calorieGoalMode: form.calorieGoalMode,
        profile: persistProfileBeforeEstimate ? undefined : overrides,
      });

      const result = await applyMutation.mutateAsync(body);
      showToast('Calorie targets updated.', 'success');
      return result;
    } catch (err) {
      logAppError('calculator/apply', err);
      const missing = getCalculatorMissingFields(err);
      if (missing) setMissingFields(missing);
      showToast(
        toUserErrorMessage(err, 'Could not apply formula. Check your connection and try again.'),
        'error'
      );
      return null;
    }
  }, [
    selectedFormulaId,
    formulasQuery.data?.defaultFormulaId,
    form,
    persistProfileBeforeEstimate,
    applyMutation,
    user?.uid,
  ]);

  return {
    me: me as GetMeResponse | undefined,
    meLoading,
    meError,
    refetchMe,
    form,
    setForm,
    formulasQuery,
    catalogVersion,
    selectedFormulaId,
    setSelectedFormulaId,
    results,
    selectedEstimate,
    estimateError,
    missingLabels,
    clientMissing,
    estimating: estimateMutation.isPending,
    applying: applyMutation.isPending,
    runEstimate,
    runApply,
  };
}
