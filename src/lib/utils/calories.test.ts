import { cmToFeetInches, feetInchesToCm, kgToLbs, lbsToKg } from './calories';

describe('calories display helpers', () => {
  it('converts pounds and kilograms', () => {
    expect(lbsToKg(220)).toBeCloseTo(99.79, 1);
    expect(kgToLbs(100)).toBeCloseTo(220.46, 1);
  });

  it('converts height units', () => {
    const { feet, inches } = cmToFeetInches(180);
    expect(feet).toBeGreaterThanOrEqual(5);
    expect(feetInchesToCm(5, 11)).toBeCloseTo(180.34, 0);
    expect(inches).toBeGreaterThanOrEqual(0);
  });
});
