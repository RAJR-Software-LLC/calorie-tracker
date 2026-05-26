import { ExerciseType } from 'react-native-health-connect';

export function toHealthConnectExerciseTypeName(exerciseType: number): string {
  const entry = Object.entries(ExerciseType).find(([, value]) => value === exerciseType);
  if (!entry) return 'EXERCISE_TYPE_OTHER_WORKOUT';
  return `EXERCISE_TYPE_${entry[0]}`;
}

export function formatHealthConnectExerciseName(exerciseType: number, title?: string): string {
  const trimmedTitle = title?.trim();
  if (trimmedTitle) return trimmedTitle;
  const entry = Object.entries(ExerciseType).find(([, value]) => value === exerciseType);
  if (!entry) return 'Workout';
  return entry[0]
    .toLowerCase()
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}
