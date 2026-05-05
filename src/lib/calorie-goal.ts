import type { CalorieGoal } from '@/types';

export function formatCalorieGoal(goal: CalorieGoal | null): string | null {
  if (!goal) return null;
  if (goal.mode === 'single') {
    return String(goal.target);
  }
  return `${goal.min}-${goal.max}`;
}

export function getCalorieGoalUpperTarget(goal: CalorieGoal | null): number | null {
  if (!goal) return null;
  return goal.mode === 'single' ? goal.target : goal.max;
}

export function getCalorieGoalReferenceTarget(goal: CalorieGoal | null): number | null {
  if (!goal) return null;
  if (goal.mode === 'single') return goal.target;
  return Math.round((goal.min + goal.max) / 2);
}
