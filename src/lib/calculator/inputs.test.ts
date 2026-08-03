import { buildApplyBody, buildEstimateBody, getMissingCalculatorFields } from './inputs';

describe('getMissingCalculatorFields', () => {
  it('lists all fields when profile is null', () => {
    expect(getMissingCalculatorFields(null)).toEqual([
      'age',
      'sex',
      'heightCm',
      'weightKg',
      'activityLevel',
    ]);
  });

  it('returns empty when complete', () => {
    expect(
      getMissingCalculatorFields({
        age: 28,
        sex: 'male',
        heightCm: 180,
        weightKg: 80,
        activityLevel: 'active',
        heightUnit: 'cm',
        weightUnit: 'kg',
      })
    ).toEqual([]);
  });

  it('does not invent sex defaults', () => {
    expect(
      getMissingCalculatorFields({
        age: 28,
        sex: null,
        heightCm: 180,
        weightKg: 80,
        activityLevel: 'active',
        heightUnit: 'cm',
        weightUnit: 'kg',
      })
    ).toContain('sex');
  });
});

describe('buildEstimateBody / buildApplyBody', () => {
  it('omits formulaId for all-formulas estimate', () => {
    const body = buildEstimateBody({ goalType: 'maintain', calorieGoalMode: 'range' });
    expect(body).toEqual({ goalType: 'maintain', calorieGoalMode: 'range' });
  });

  it('includes formulaId on apply', () => {
    const body = buildApplyBody({
      formulaId: 'mifflin_st_jeor',
      goalType: 'lose',
      calorieGoalMode: 'single',
      profile: { age: 30 },
    });
    expect(body.formulaId).toBe('mifflin_st_jeor');
    expect(body.profile).toEqual({ age: 30 });
  });
});
