import { ApiError } from '@/lib/api/errors';

import { getCalculatorMissingFields, toUserErrorMessage } from './app-errors';

describe('calculator error mapping', () => {
  it('extracts missingFields', () => {
    const err = new ApiError(400, 'Incomplete', {
      error: 'Incomplete calculator inputs',
      missingFields: ['age', 'sex'],
    });
    expect(getCalculatorMissingFields(err)).toEqual(['age', 'sex']);
    expect(toUserErrorMessage(err, 'fallback')).toContain('age');
  });

  it('returns null when missingFields has no valid strings', () => {
    const err = new ApiError(400, 'Incomplete', {
      error: 'Incomplete calculator inputs',
      missingFields: [null, 1],
    });
    expect(getCalculatorMissingFields(err)).toBeNull();
  });

  it('maps unknown formulaId', () => {
    const err = new ApiError(400, 'Unknown', { error: 'Unknown formulaId', formulaId: 'x' });
    expect(toUserErrorMessage(err, 'fallback')).toMatch(/formula/i);
  });
});
