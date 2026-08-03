import type {
  CalorieCalculationSnapshot,
  CalorieGoal,
  GetMeResponse,
  UserProfileFields,
} from '@/types';

function nearlyEqual(a: number, b: number, epsilon = 0.05): boolean {
  return Math.abs(a - b) <= epsilon;
}

function calorieGoalsEqual(a: CalorieGoal, b: CalorieGoal): boolean {
  if (a.mode !== b.mode) return false;
  if (a.mode === 'single' && b.mode === 'single') {
    return a.target === b.target;
  }
  if (a.mode === 'range' && b.mode === 'range') {
    return a.min === b.min && a.max === b.max;
  }
  return false;
}

/**
 * True when stored snapshot inputs no longer match the current profile,
 * or when the catalog formula version has moved past the snapshot.
 */
export function isSnapshotStale(
  snapshot: CalorieCalculationSnapshot | null | undefined,
  profile: UserProfileFields | null | undefined,
  catalogFormulaVersion?: string | null
): boolean {
  if (!snapshot || !profile) return false;

  if (
    catalogFormulaVersion != null &&
    catalogFormulaVersion !== '' &&
    snapshot.formulaVersion !== catalogFormulaVersion
  ) {
    return true;
  }

  const { inputs } = snapshot;
  if (profile.age == null || profile.age !== inputs.age) return true;
  if (profile.sex == null || profile.sex !== inputs.sex) return true;
  if (profile.activityLevel == null || profile.activityLevel !== inputs.activityLevel) return true;
  if (profile.heightCm == null || !nearlyEqual(profile.heightCm, inputs.heightCm)) return true;
  if (profile.weightKg == null || !nearlyEqual(profile.weightKg, inputs.weightKg, 0.01)) {
    return true;
  }
  return false;
}

/**
 * True when a science snapshot exists but maintenance/goal/goalType were
 * changed via PATCH /me without re-applying the calculator.
 */
export function isCustomCalorieOverride(me: GetMeResponse | null | undefined): boolean {
  if (!me?.calorieCalculation) return false;
  const snap = me.calorieCalculation;

  if (me.goalType != null && me.goalType !== snap.goalType) return true;

  if (me.maintenanceCalories == null || me.maintenanceCalories !== snap.tdee) return true;

  if (me.calorieGoal == null) return true;
  return !calorieGoalsEqual(me.calorieGoal, snap.recommendedCalorieGoal);
}

/** Users who still need the first-run goals onboarding. */
export function needsGoalsOnboarding(me: GetMeResponse | null | undefined): boolean {
  if (!me) return false;
  return (
    me.calorieCalculation == null && me.calorieGoal == null && me.maintenanceCalories == null
  );
}
