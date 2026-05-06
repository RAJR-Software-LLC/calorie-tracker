import {
  buildHeightPatch,
  buildWeightPatch,
  cmToFeetInches,
  feetInchesToCm,
  kgToLb,
  lbToKg,
} from '@/src/lib/utils/profile-measurements';

describe('profile measurements utils', () => {
  it('converts between cm and ft/in consistently', () => {
    const imperial = cmToFeetInches(180);
    expect(imperial).toEqual({ feet: 5, inches: 11 });
    const cm = feetInchesToCm(imperial.feet, imperial.inches);
    expect(Math.round(cm)).toBe(180);
  });

  it('converts between kg and lb consistently', () => {
    const lb = kgToLb(80);
    expect(Math.round(lb * 10) / 10).toBe(176.4);
    const kg = lbToKg(lb);
    expect(Math.round(kg * 10) / 10).toBe(80);
  });

  it('rejects invalid imperial inches and partial imperial inputs', () => {
    expect(
      buildHeightPatch({ unit: 'ft_in', feetValue: '5', inchesValue: '12', cmValue: '' }).error
    ).toBeTruthy();
    expect(
      buildHeightPatch({ unit: 'ft_in', feetValue: '5', inchesValue: '', cmValue: '' }).error
    ).toBeTruthy();
  });

  it('builds unit-correct weight payloads', () => {
    expect(buildWeightPatch({ unit: 'kg', value: '70.5' }).value).toEqual({
      unit: 'kg',
      value: 70.5,
    });
    expect(buildWeightPatch({ unit: 'lb', value: '155' }).value).toEqual({
      unit: 'lb',
      value: 155,
    });
  });
});
