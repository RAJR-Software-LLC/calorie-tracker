import type { WaterUnit } from '@/types';

/** Canonical conversions to milliliters (display math only). */
const ML_PER_L = 1000;
const ML_PER_US_OZ = 29.5735295625;
const ML_PER_IMPERIAL_OZ = 28.4130625;
const ML_PER_US_CUP = 236.5882365;

export function amountToMl(amount: number, unit: WaterUnit): number {
  switch (unit) {
    case 'ml':
      return amount;
    case 'l':
      return amount * ML_PER_L;
    case 'oz_us':
      return amount * ML_PER_US_OZ;
    case 'oz_imperial':
      return amount * ML_PER_IMPERIAL_OZ;
    case 'cup_us':
      return amount * ML_PER_US_CUP;
    default: {
      const _exhaustive: never = unit;
      return _exhaustive;
    }
  }
}

export function amountFromMl(ml: number, unit: WaterUnit): number {
  switch (unit) {
    case 'ml':
      return ml;
    case 'l':
      return ml / ML_PER_L;
    case 'oz_us':
      return ml / ML_PER_US_OZ;
    case 'oz_imperial':
      return ml / ML_PER_IMPERIAL_OZ;
    case 'cup_us':
      return ml / ML_PER_US_CUP;
    default: {
      const _exhaustive: never = unit;
      return _exhaustive;
    }
  }
}

/** Convert a volume amount between display/storage units (via ml). */
export function convertWaterAmount(amount: number, fromUnit: WaterUnit, toUnit: WaterUnit): number {
  if (fromUnit === toUnit) return amount;
  return amountFromMl(amountToMl(amount, fromUnit), toUnit);
}

/** Stable display rounding per unit (not for persistence). */
export function formatWaterAmountDisplay(amount: number, unit: WaterUnit): string {
  const rounded = roundForDisplay(amount, unit);
  switch (unit) {
    case 'ml':
      return `${Math.round(rounded)} ml`;
    case 'l':
      return `${rounded.toFixed(2)} L`.replace(/\.?0+$/, '');
    case 'oz_us':
    case 'oz_imperial':
      return `${rounded.toFixed(1)} oz`;
    case 'cup_us':
      return `${rounded.toFixed(2)} cup`.replace(/\.?0+$/, '');
    default: {
      const _exhaustive: never = unit;
      return String(_exhaustive);
    }
  }
}

function roundForDisplay(amount: number, unit: WaterUnit): number {
  switch (unit) {
    case 'ml':
      return Math.round(amount);
    case 'l':
      return Math.round(amount * 1000) / 1000;
    case 'oz_us':
    case 'oz_imperial':
      return Math.round(amount * 10) / 10;
    case 'cup_us':
      return Math.round(amount * 100) / 100;
    default: {
      const _exhaustive: never = unit;
      return _exhaustive;
    }
  }
}

/** Plain numeric string for an input field (same rounding as display, no unit suffix). */
export function formatWaterAmountForInput(amount: number, unit: WaterUnit): string {
  const r = roundForDisplay(amount, unit);
  switch (unit) {
    case 'ml':
      return String(Math.round(r));
    case 'l': {
      const s = r.toFixed(3).replace(/\.?0+$/, '');
      return s === '' ? '0' : s;
    }
    case 'oz_us':
    case 'oz_imperial': {
      const s = r.toFixed(1).replace(/\.?0+$/, '');
      return s === '' ? '0' : s;
    }
    case 'cup_us': {
      const s = r.toFixed(2).replace(/\.?0+$/, '');
      return s === '' ? '0' : s;
    }
    default: {
      const _exhaustive: never = unit;
      return String(_exhaustive);
    }
  }
}

export type WaterQuickAddPreset = { label: string; deltaInUnit: number };

/**
 * Client-only quick-add amounts in the given display unit (sent as PATCH `deltaAmount` when API uses same unit as row).
 */
export function getWaterQuickAddPresets(unit: WaterUnit): WaterQuickAddPreset[] {
  switch (unit) {
    case 'ml':
      return [
        { label: 'Cup 250', deltaInUnit: 250 },
        { label: 'Bottle 500', deltaInUnit: 500 },
        { label: '1 L', deltaInUnit: 1000 },
      ];
    case 'l':
      return [
        { label: '0.25 L', deltaInUnit: 0.25 },
        { label: '0.5 L', deltaInUnit: 0.5 },
        { label: '1 L', deltaInUnit: 1 },
      ];
    case 'oz_us':
      return [
        { label: '8 oz', deltaInUnit: 8 },
        { label: '16 oz', deltaInUnit: 16 },
        { label: '24 oz', deltaInUnit: 24 },
      ];
    case 'oz_imperial':
      return [
        { label: '8 oz', deltaInUnit: 8 },
        { label: '16 oz', deltaInUnit: 16 },
        { label: '20 oz', deltaInUnit: 20 },
      ];
    case 'cup_us':
      return [
        { label: '1 cup', deltaInUnit: 1 },
        { label: '2 cups', deltaInUnit: 2 },
        { label: '4 cups', deltaInUnit: 4 },
      ];
    default: {
      const _exhaustive: never = unit;
      return _exhaustive;
    }
  }
}

export const WATER_UNIT_OPTIONS: { value: WaterUnit; label: string }[] = [
  { value: 'ml', label: 'ml' },
  { value: 'l', label: 'L' },
  { value: 'oz_us', label: 'oz (US)' },
  { value: 'oz_imperial', label: 'oz (imperial)' },
  { value: 'cup_us', label: 'cup (US)' },
];

/** Settings-aligned label for form copy (e.g. "Amount in oz (US)"). */
export function waterUnitFormLabel(unit: WaterUnit): string {
  return WATER_UNIT_OPTIONS.find((o) => o.value === unit)?.label ?? unit;
}
