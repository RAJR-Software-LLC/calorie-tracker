import { WorkoutActivityType } from '@kingstinct/react-native-healthkit';

import {
  formatHealthKitWorkoutName,
  toHealthKitActivityTypeName,
} from './native-type-mapping.ios';

describe('native type mapping (HealthKit)', () => {
  it('maps HealthKit workout activity types to preset identifiers', () => {
    expect(toHealthKitActivityTypeName(WorkoutActivityType.running)).toBe(
      'HKWorkoutActivityTypeRunning'
    );
    expect(formatHealthKitWorkoutName(WorkoutActivityType.running)).toBe('Running');
  });
});
