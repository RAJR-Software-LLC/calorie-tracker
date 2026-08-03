import type {
  ActivityLevel,
  CalculatorProfileOverrides,
  FormulaId,
  GoalType,
  HeightUnit,
  PostCalculatorApplyBody,
  PostCalculatorEstimateBody,
  Sex,
  UserProfileFields,
  WeightUnit,
} from '@/types';

import {
  buildHeightPatch,
  buildWeightPatch,
} from '@/lib/utils/profile-measurements';

export const REQUIRED_CALCULATOR_INPUT_KEYS = [
  'age',
  'sex',
  'heightCm',
  'weightKg',
  'activityLevel',
] as const;

export type CalculatorInputKey = (typeof REQUIRED_CALCULATOR_INPUT_KEYS)[number];

export const CALCULATOR_INPUT_LABELS: Record<CalculatorInputKey, string> = {
  age: 'Age',
  sex: 'Sex',
  heightCm: 'Height',
  weightKg: 'Weight',
  activityLevel: 'Activity level',
};

/** Client-side gate — never invent sex/age defaults when profile is incomplete. */
export function getMissingCalculatorFields(
  profile: UserProfileFields | null | undefined
): CalculatorInputKey[] {
  if (!profile) return [...REQUIRED_CALCULATOR_INPUT_KEYS];
  const missing: CalculatorInputKey[] = [];
  if (profile.age == null || !Number.isFinite(profile.age) || profile.age <= 0) {
    missing.push('age');
  }
  if (profile.sex !== 'male' && profile.sex !== 'female') {
    missing.push('sex');
  }
  if (profile.heightCm == null || !Number.isFinite(profile.heightCm) || profile.heightCm <= 0) {
    missing.push('heightCm');
  }
  if (profile.weightKg == null || !Number.isFinite(profile.weightKg) || profile.weightKg <= 0) {
    missing.push('weightKg');
  }
  if (profile.activityLevel == null) {
    missing.push('activityLevel');
  }
  return missing;
}

export type CalculatorFormValues = {
  age: string;
  sex: Sex | null;
  activityLevel: ActivityLevel | null;
  goalType: GoalType;
  calorieGoalMode: 'single' | 'range';
  heightUnit: HeightUnit;
  weightUnit: WeightUnit;
  heightCm: string;
  heightFeet: string;
  heightInches: string;
  weight: string;
};

export function formValuesFromProfile(
  profile: UserProfileFields | null | undefined,
  defaults?: Partial<Pick<CalculatorFormValues, 'goalType' | 'calorieGoalMode'>>
): CalculatorFormValues {
  const heightUnit = profile?.heightUnit ?? 'ft_in';
  const weightUnit = profile?.weightUnit ?? 'lb';
  let heightCm = '';
  let heightFeet = '';
  let heightInches = '';
  if (profile?.heightCm != null) {
    if (heightUnit === 'cm') {
      heightCm = String(Math.round(profile.heightCm * 10) / 10);
    } else {
      const totalInches = Math.round(profile.heightCm / 2.54);
      heightFeet = String(Math.floor(totalInches / 12));
      heightInches = String(totalInches % 12);
    }
  }
  let weight = '';
  if (profile?.weightKg != null) {
    if (weightUnit === 'kg') {
      weight = String(Math.round(profile.weightKg * 10) / 10);
    } else {
      weight = String(Math.round((profile.weightKg / 0.45359237) * 10) / 10);
    }
  }
  return {
    age: profile?.age != null ? String(profile.age) : '',
    sex: profile?.sex ?? null,
    activityLevel: profile?.activityLevel ?? null,
    goalType: defaults?.goalType ?? 'maintain',
    calorieGoalMode: defaults?.calorieGoalMode ?? 'single',
    heightUnit,
    weightUnit,
    heightCm,
    heightFeet,
    heightInches,
    weight,
  };
}

export function buildProfileOverridesFromForm(
  form: CalculatorFormValues
): { overrides: CalculatorProfileOverrides | null; errors: string[] } {
  const errors: string[] = [];
  const overrides: CalculatorProfileOverrides = {};

  const ageTrimmed = form.age.trim();
  if (ageTrimmed) {
    const age = Number.parseInt(ageTrimmed, 10);
    if (!Number.isInteger(age) || age < 13 || age > 120) {
      errors.push('Enter a valid age (13–120).');
    } else {
      overrides.age = age;
    }
  }

  if (form.sex === 'male' || form.sex === 'female') {
    overrides.sex = form.sex;
  }

  if (form.activityLevel) {
    overrides.activityLevel = form.activityLevel;
  }

  const height = buildHeightPatch({
    unit: form.heightUnit,
    cmValue: form.heightCm,
    feetValue: form.heightFeet,
    inchesValue: form.heightInches,
  });
  if (height.error) errors.push(height.error);
  if (height.value) overrides.height = height.value;

  const weight = buildWeightPatch({ unit: form.weightUnit, value: form.weight });
  if (weight.error) errors.push(weight.error);
  if (weight.value) overrides.weight = weight.value;

  if (errors.length > 0) return { overrides: null, errors };
  if (Object.keys(overrides).length === 0) return { overrides: null, errors: [] };
  return { overrides, errors: [] };
}

export function buildEstimateBody(input: {
  goalType: GoalType;
  formulaId?: FormulaId;
  calorieGoalMode?: 'single' | 'range';
  profile?: CalculatorProfileOverrides | null;
}): PostCalculatorEstimateBody {
  const body: PostCalculatorEstimateBody = {
    goalType: input.goalType,
  };
  if (input.formulaId) body.formulaId = input.formulaId;
  if (input.calorieGoalMode) body.calorieGoalMode = input.calorieGoalMode;
  if (input.profile) body.profile = input.profile;
  return body;
}

export function buildApplyBody(input: {
  formulaId: FormulaId;
  goalType: GoalType;
  calorieGoalMode?: 'single' | 'range';
  profile?: CalculatorProfileOverrides | null;
}): PostCalculatorApplyBody {
  const body: PostCalculatorApplyBody = {
    formulaId: input.formulaId,
    goalType: input.goalType,
  };
  if (input.calorieGoalMode) body.calorieGoalMode = input.calorieGoalMode;
  if (input.profile) body.profile = input.profile;
  return body;
}
