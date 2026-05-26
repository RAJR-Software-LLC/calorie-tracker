import { WorkoutActivityType } from '@kingstinct/react-native-healthkit';

export function toHealthKitActivityTypeName(type: WorkoutActivityType): string {
  const key = WorkoutActivityType[type];
  if (typeof key !== 'string') return 'HKWorkoutActivityTypeOther';
  const pascal = key.charAt(0).toUpperCase() + key.slice(1);
  return `HKWorkoutActivityType${pascal}`;
}

export function formatHealthKitWorkoutName(type: WorkoutActivityType): string {
  const key = WorkoutActivityType[type];
  if (typeof key !== 'string') return 'Workout';
  return key
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, (char) => char.toUpperCase())
    .trim();
}
