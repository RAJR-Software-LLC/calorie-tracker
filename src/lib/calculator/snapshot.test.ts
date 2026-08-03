import type { CalorieCalculationSnapshot, GetMeResponse, UserProfileFields } from '@/types';

import { isCustomCalorieOverride, isSnapshotStale, needsGoalsOnboarding } from './snapshot';

const baseInputs = {
  age: 30,
  sex: 'female' as const,
  heightCm: 165,
  weightKg: 60,
  activityLevel: 'moderate' as const,
};

const snapshot: CalorieCalculationSnapshot = {
  formulaId: 'mifflin_st_jeor',
  formulaVersion: '2026.08.1',
  goalType: 'lose',
  inputs: baseInputs,
  inputsFingerprint: 'abc',
  bmr: 1400,
  activityMultiplier: 1.55,
  tdee: 2170,
  recommendedCalorieGoal: { mode: 'single', target: 1870 },
  warnings: [],
  citations: [],
  calculatedAt: '2026-08-01T00:00:00.000Z',
};

const matchingProfile: UserProfileFields = {
  ...baseInputs,
  heightUnit: 'cm',
  weightUnit: 'kg',
};

describe('isSnapshotStale', () => {
  it('returns false when profile matches snapshot', () => {
    expect(isSnapshotStale(snapshot, matchingProfile)).toBe(false);
  });

  it('returns true when weight changes', () => {
    expect(isSnapshotStale(snapshot, { ...matchingProfile, weightKg: 62 })).toBe(true);
  });

  it('returns true when catalog formula version advances', () => {
    expect(isSnapshotStale(snapshot, matchingProfile, '2026.09.1')).toBe(true);
  });

  it('returns false for null snapshot', () => {
    expect(isSnapshotStale(null, matchingProfile)).toBe(false);
  });
});

describe('isCustomCalorieOverride', () => {
  const meBase = {
    displayName: 'Test',
    email: 't@example.com',
    createdAt: '2026-01-01T00:00:00.000Z',
    profile: matchingProfile,
    familyId: null,
    notifications: {
      enabled: false,
      reminderTimes: [],
      categories: {
        mealReminders: true,
        goalStatus: true,
        streaks: true,
        familyEvents: true,
        accountAdmin: true,
      },
      quietHours: null,
      timezone: 'UTC',
      goalStatusTime: '19:00',
    },
    calorieCalculation: snapshot,
    maintenanceCalories: 2170,
    calorieGoal: { mode: 'single' as const, target: 1870 },
    goalType: 'lose' as const,
  } satisfies GetMeResponse;

  it('returns false when values match snapshot', () => {
    expect(isCustomCalorieOverride(meBase)).toBe(false);
  });

  it('returns true when calorieGoal was manually changed', () => {
    expect(
      isCustomCalorieOverride({
        ...meBase,
        calorieGoal: { mode: 'single', target: 1600 },
      })
    ).toBe(true);
  });

  it('returns true when maintenance diverges', () => {
    expect(isCustomCalorieOverride({ ...meBase, maintenanceCalories: 2000 })).toBe(true);
  });
});

describe('needsGoalsOnboarding', () => {
  it('returns true when no goals or snapshot', () => {
    expect(
      needsGoalsOnboarding({
        calorieCalculation: null,
        calorieGoal: null,
        maintenanceCalories: null,
      } as GetMeResponse)
    ).toBe(true);
  });

  it('returns false when manual goal exists without snapshot', () => {
    expect(
      needsGoalsOnboarding({
        calorieCalculation: null,
        calorieGoal: { mode: 'single', target: 2000 },
        maintenanceCalories: null,
      } as GetMeResponse)
    ).toBe(false);
  });
});
