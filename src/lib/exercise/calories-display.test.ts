import {
  CALORIES_NOT_REPORTED_SENTINEL,
  displayExerciseNotes,
  formatExerciseCaloriesLabel,
  isCaloriesNotReported,
  withCaloriesNotReportedNotes,
} from './calories-display';

describe('calories display helpers', () => {
  it('detects and formats not-reported calories', () => {
    expect(isCaloriesNotReported(CALORIES_NOT_REPORTED_SENTINEL)).toBe(true);
    expect(formatExerciseCaloriesLabel({ caloriesBurned: 0, notes: CALORIES_NOT_REPORTED_SENTINEL })).toBe(
      'Not reported'
    );
    expect(formatExerciseCaloriesLabel({ caloriesBurned: 120, notes: null })).toBe('120 kcal');
  });

  it('hides sentinel from user-facing notes', () => {
    expect(displayExerciseNotes(CALORIES_NOT_REPORTED_SENTINEL)).toBeNull();
    expect(displayExerciseNotes(`${CALORIES_NOT_REPORTED_SENTINEL}\nFelt strong`)).toBe('Felt strong');
  });

  it('preserves existing notes when attaching sentinel', () => {
    expect(withCaloriesNotReportedNotes(null)).toBe(CALORIES_NOT_REPORTED_SENTINEL);
    expect(withCaloriesNotReportedNotes('Hard effort')).toBe(
      `${CALORIES_NOT_REPORTED_SENTINEL}\nHard effort`
    );
  });
});
