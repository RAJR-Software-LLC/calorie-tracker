import { ExerciseType } from 'react-native-health-connect';

import {
  formatHealthConnectExerciseName,
  toHealthConnectExerciseTypeName,
} from './native-type-mapping.android';

describe('native type mapping (Health Connect)', () => {
  it('maps Health Connect exercise types to preset identifiers', () => {
    expect(toHealthConnectExerciseTypeName(ExerciseType.RUNNING)).toBe('EXERCISE_TYPE_RUNNING');
    expect(formatHealthConnectExerciseName(ExerciseType.RUNNING)).toBe('Running');
    expect(formatHealthConnectExerciseName(ExerciseType.RUNNING, 'Morning run')).toBe(
      'Morning run'
    );
  });
});
