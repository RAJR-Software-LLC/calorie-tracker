import type { UserDocument, UserHabits } from '@/types';

export function mergeUserHabits(habits: UserDocument['habits'] | undefined): UserHabits {
  return {
    calorieTrackingEnabled: habits?.calorieTrackingEnabled ?? true,
    exerciseTrackingEnabled: habits?.exerciseTrackingEnabled ?? true,
    waterTrackingEnabled: habits?.waterTrackingEnabled ?? true,
    waterDefaultUnit: habits?.waterDefaultUnit ?? 'ml',
    waterGoalAmount: habits?.waterGoalAmount ?? null,
    waterGoalUnit: habits?.waterGoalUnit ?? null,
  };
}
