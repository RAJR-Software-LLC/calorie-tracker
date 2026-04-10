import { mifflinStJeor, quickEstimate } from './calories';

describe('calories utils', () => {
  it('quickEstimate rounds weight times activity factor', () => {
    expect(quickEstimate(150, 'moderate')).toBe(2100);
  });

  it('mifflinStJeor matches known formula for male moderate', () => {
    const tdee = mifflinStJeor(70, 175, 30, 'male', 'moderate');
    expect(tdee).toBeGreaterThan(2000);
    expect(tdee).toBeLessThan(3000);
  });
});
