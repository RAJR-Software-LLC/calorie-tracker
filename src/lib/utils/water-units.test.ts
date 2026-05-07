import {
  amountFromMl,
  amountToMl,
  convertWaterAmount,
  formatWaterAmountDisplay,
  formatWaterAmountForInput,
  getWaterQuickAddPresets,
  waterUnitFormLabel,
} from './water-units';

describe('water-units', () => {
  it('converts ml round-trip', () => {
    expect(amountToMl(500, 'ml')).toBe(500);
    expect(amountFromMl(500, 'ml')).toBe(500);
  });

  it('converts liters to ml', () => {
    expect(amountToMl(1.5, 'l')).toBe(1500);
    expect(amountFromMl(2000, 'l')).toBe(2);
  });

  it('formats ml display', () => {
    expect(formatWaterAmountDisplay(1200, 'ml')).toBe('1200 ml');
  });

  it('convertWaterAmount maps ml row to oz display', () => {
    const oz = convertWaterAmount(500, 'ml', 'oz_us');
    expect(oz).toBeCloseTo(500 / 29.5735295625, 5);
    expect(convertWaterAmount(oz, 'oz_us', 'ml')).toBeCloseTo(500, 5);
  });

  it('convertWaterAmount is identity when units match', () => {
    expect(convertWaterAmount(12.5, 'cup_us', 'cup_us')).toBe(12.5);
  });

  it('formatWaterAmountForInput trims trailing zeros', () => {
    expect(formatWaterAmountForInput(2, 'l')).toBe('2');
    expect(formatWaterAmountForInput(2.5, 'oz_us')).toBe('2.5');
  });

  it('waterUnitFormLabel matches settings options', () => {
    expect(waterUnitFormLabel('oz_us')).toBe('oz (US)');
    expect(waterUnitFormLabel('ml')).toBe('ml');
  });

  it('presets exist for each unit', () => {
    const units = ['ml', 'l', 'oz_us', 'oz_imperial', 'cup_us'] as const;
    for (const u of units) {
      const p = getWaterQuickAddPresets(u);
      expect(p.length).toBeGreaterThan(0);
      expect(p.every((x) => x.deltaInUnit > 0)).toBe(true);
    }
  });

  it('quick-add preset labels do not start with + (UI adds +)', () => {
    for (const u of ['ml', 'l', 'oz_us', 'oz_imperial', 'cup_us'] as const) {
      for (const pr of getWaterQuickAddPresets(u)) {
        expect(pr.label.startsWith('+')).toBe(false);
      }
    }
  });
});
