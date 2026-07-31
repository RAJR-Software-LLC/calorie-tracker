/** Stable notes sentinel when native health did not report active energy. */
export const CALORIES_NOT_REPORTED_SENTINEL = '__calories_not_reported__';

export function isCaloriesNotReported(notes?: string | null): boolean {
  if (notes == null) return false;
  return notes.includes(CALORIES_NOT_REPORTED_SENTINEL);
}

/** Notes for display: strip internal sentinel so users never see the raw token. */
export function displayExerciseNotes(notes?: string | null): string | null {
  if (notes == null) return null;
  const cleaned = notes
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0 && line !== CALORIES_NOT_REPORTED_SENTINEL)
    .join('\n')
    .trim();
  return cleaned.length > 0 ? cleaned : null;
}

export function formatExerciseCaloriesLabel(args: {
  caloriesBurned: number;
  notes?: string | null;
}): string {
  if (isCaloriesNotReported(args.notes)) {
    return 'Not reported';
  }
  return `${args.caloriesBurned} kcal`;
}

export function withCaloriesNotReportedNotes(existingNotes?: string | null): string {
  const trimmed = existingNotes?.trim() ?? '';
  if (trimmed.length === 0) return CALORIES_NOT_REPORTED_SENTINEL;
  if (trimmed.includes(CALORIES_NOT_REPORTED_SENTINEL)) return trimmed;
  return `${CALORIES_NOT_REPORTED_SENTINEL}\n${trimmed}`;
}
