/**
 * Display / unit helpers only. BMR, TDEE, PAL multipliers, and recommended goals
 * are owned by the backend (`POST /api/v1/me/calculator/*`). Do not reimplement
 * Mifflin–St Jeor, Harris–Benedict, or Schofield here.
 *
 * Prefer `@/lib/utils/profile-measurements` for height/weight conversions in new code.
 */

export function lbsToKg(lbs: number): number {
  return lbs * 0.45359237;
}

export function kgToLbs(kg: number): number {
  return kg / 0.45359237;
}

export function cmToFeetInches(cm: number): { feet: number; inches: number } {
  const totalInches = cm / 2.54;
  return { feet: Math.floor(totalInches / 12), inches: Math.round(totalInches % 12) };
}

export function feetInchesToCm(feet: number, inches: number): number {
  return (feet * 12 + inches) * 2.54;
}
