import type {
  HeightPatchValue,
  HeightUnit,
  PatchProfileBody,
  UserProfileFields,
  WeightPatchValue,
  WeightUnit,
} from '@/types';

const KG_PER_LB = 0.45359237;
const INCHES_PER_FOOT = 12;
const CM_PER_INCH = 2.54;

function roundTo(value: number, decimals: number): number {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

export function kgToLb(kg: number): number {
  return kg / KG_PER_LB;
}

export function lbToKg(lb: number): number {
  return lb * KG_PER_LB;
}

export function cmToFeetInches(cm: number): { feet: number; inches: number } {
  const totalInches = Math.round(cm / CM_PER_INCH);
  const feet = Math.floor(totalInches / INCHES_PER_FOOT);
  const inches = totalInches % INCHES_PER_FOOT;
  return { feet, inches };
}

export function feetInchesToCm(feet: number, inches: number): number {
  return (feet * INCHES_PER_FOOT + inches) * CM_PER_INCH;
}

export function formatDisplayWeightFromKg(kg: number | null, unit: WeightUnit): string {
  if (kg == null || !Number.isFinite(kg)) return '';
  const value = unit === 'kg' ? kg : kgToLb(kg);
  return String(roundTo(value, 1));
}

export function formatDisplayHeightFromCm(
  cm: number | null,
  unit: HeightUnit
): { cm: string; feet: string; inches: string } {
  if (cm == null || !Number.isFinite(cm)) {
    return { cm: '', feet: '', inches: '' };
  }

  if (unit === 'cm') {
    return { cm: String(roundTo(cm, 1)), feet: '', inches: '' };
  }

  const imperial = cmToFeetInches(cm);
  return {
    cm: '',
    feet: String(imperial.feet),
    inches: String(imperial.inches),
  };
}

export type AnthropometricFieldErrors = Partial<Record<'height' | 'weight', string>>;

export function buildHeightPatch(input: {
  unit: HeightUnit;
  cmValue: string;
  feetValue: string;
  inchesValue: string;
}): { value: HeightPatchValue | null; error?: string } {
  if (input.unit === 'cm') {
    const trimmed = input.cmValue.trim();
    if (!trimmed) return { value: null };
    const parsed = Number(trimmed);
    if (!Number.isFinite(parsed) || parsed <= 0 || parsed > 300) {
      return { value: null, error: 'Enter a valid height in cm.' };
    }
    return { value: { unit: 'cm', value: parsed } };
  }

  const feetText = input.feetValue.trim();
  const inchesText = input.inchesValue.trim();

  if (!feetText && !inchesText) return { value: null };
  if (!feetText || !inchesText) {
    return { value: null, error: 'Enter both feet and inches.' };
  }

  const feet = Number(feetText);
  const inches = Number(inchesText);
  if (
    !Number.isInteger(feet) ||
    !Number.isInteger(inches) ||
    feet < 0 ||
    inches < 0 ||
    inches > 11 ||
    (feet === 0 && inches === 0)
  ) {
    return { value: null, error: 'Use valid feet/inches (inches must be 0-11).' };
  }

  return { value: { unit: 'ft_in', feet, inches } };
}

export function buildWeightPatch(input: {
  unit: WeightUnit;
  value: string;
}): { value: WeightPatchValue | null; error?: string } {
  const trimmed = input.value.trim();
  if (!trimmed) return { value: null };

  const parsed = Number(trimmed);
  if (!Number.isFinite(parsed) || parsed <= 0 || parsed > 1400) {
    return { value: null, error: `Enter a valid weight in ${input.unit}.` };
  }

  return { value: { unit: input.unit, value: parsed } };
}

export function buildAnthropometricPatch(args: {
  initialProfile: UserProfileFields | null | undefined;
  current: {
    heightUnit: HeightUnit;
    weightUnit: WeightUnit;
    heightCm: string;
    heightFeet: string;
    heightInches: string;
    weight: string;
  };
}): { profilePatch: PatchProfileBody; errors: AnthropometricFieldErrors } {
  const errors: AnthropometricFieldErrors = {};
  const profilePatch: PatchProfileBody = {};

  const height = buildHeightPatch({
    unit: args.current.heightUnit,
    cmValue: args.current.heightCm,
    feetValue: args.current.heightFeet,
    inchesValue: args.current.heightInches,
  });
  if (height.error) {
    errors.height = height.error;
  } else {
    profilePatch.height = height.value;
  }

  const weight = buildWeightPatch({
    unit: args.current.weightUnit,
    value: args.current.weight,
  });
  if (weight.error) {
    errors.weight = weight.error;
  } else {
    profilePatch.weight = weight.value;
  }

  profilePatch.heightUnit = args.current.heightUnit;
  profilePatch.weightUnit = args.current.weightUnit;

  const initialHeightUnit = args.initialProfile?.heightUnit;
  const initialWeightUnit = args.initialProfile?.weightUnit;
  if (initialHeightUnit === profilePatch.heightUnit) delete profilePatch.heightUnit;
  if (initialWeightUnit === profilePatch.weightUnit) delete profilePatch.weightUnit;

  return { profilePatch, errors };
}
