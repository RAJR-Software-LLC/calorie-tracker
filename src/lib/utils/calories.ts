export type ActivityLevel = 'sedentary' | 'light' | 'moderate' | 'active' | 'very_active';

export type Sex = 'male' | 'female';

const activityMultipliers: Record<ActivityLevel, number> = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  active: 1.725,
  very_active: 1.9,
};

const quickMultipliers: Record<string, number> = {
  sedentary: 12,
  light: 13,
  moderate: 14,
  active: 15,
};

/**
 * Quick estimate: weight (lbs) x activity multiplier (12-15)
 */
export function quickEstimate(
  weightLbs: number,
  activity: 'sedentary' | 'light' | 'moderate' | 'active'
): number {
  return Math.round(weightLbs * quickMultipliers[activity]);
}

/**
 * Mifflin-St Jeor Equation:
 * Men:   (10 x weight_kg) + (6.25 x height_cm) - (5 x age) + 5
 * Women: (10 x weight_kg) + (6.25 x height_cm) - (5 x age) - 161
 * Then multiply by activity factor
 */
export function mifflinStJeor(
  weightKg: number,
  heightCm: number,
  age: number,
  sex: Sex,
  activityLevel: ActivityLevel
): number {
  const base = 10 * weightKg + 6.25 * heightCm - 5 * age + (sex === 'male' ? 5 : -161);
  return Math.round(base * activityMultipliers[activityLevel]);
}

/**
 * Recommend goal calories based on maintenance and goal type
 */
export function recommendGoalCalories(
  maintenance: number,
  goalType: 'lose' | 'gain' | 'maintain'
): { recommended: number; message: string } {
  switch (goalType) {
    case 'lose':
      return {
        recommended: maintenance - 300,
        message:
          'A gentle deficit of 250-500 calories below maintenance is sustainable. We recommend starting with a 300 calorie deficit.',
      };
    case 'gain':
      return {
        recommended: maintenance + 300,
        message:
          'A modest surplus of 250-500 calories supports healthy growth. We recommend starting with a 300 calorie surplus.',
      };
    case 'maintain':
      return {
        recommended: maintenance,
        message:
          'Eating around your maintenance level helps your body stay balanced and energized.',
      };
  }
}

export function lbsToKg(lbs: number): number {
  return lbs * 0.453592;
}

export function kgToLbs(kg: number): number {
  return kg / 0.453592;
}

export function cmToFeetInches(cm: number): { feet: number; inches: number } {
  const totalInches = cm / 2.54;
  return { feet: Math.floor(totalInches / 12), inches: Math.round(totalInches % 12) };
}

export function feetInchesToCm(feet: number, inches: number): number {
  return (feet * 12 + inches) * 2.54;
}
