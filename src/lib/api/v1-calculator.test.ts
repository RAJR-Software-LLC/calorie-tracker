jest.mock('./client', () => ({
  apiRequest: jest.fn(),
}));

jest.mock('./retry-after-429', () => ({
  withRetryAfter429: (fn: () => Promise<unknown>) => fn(),
}));

import { apiRequest } from './client';
import { getCalculatorFormulas, postCalculatorApply, postCalculatorEstimate } from './v1';

const mockedRequest = apiRequest as jest.MockedFunction<typeof apiRequest>;

describe('calculator API clients', () => {
  beforeEach(() => {
    mockedRequest.mockReset();
  });

  it('GET formulas', async () => {
    mockedRequest.mockResolvedValue({ defaultFormulaId: 'mifflin_st_jeor', formulas: [] });
    await getCalculatorFormulas();
    expect(mockedRequest).toHaveBeenCalledWith('/me/calculator/formulas');
  });

  it('POST estimate', async () => {
    mockedRequest.mockResolvedValue({
      defaultFormulaId: 'mifflin_st_jeor',
      inputs: {},
      results: [],
    });
    await postCalculatorEstimate({ goalType: 'lose' });
    expect(mockedRequest).toHaveBeenCalledWith('/me/calculator/estimate', {
      method: 'POST',
      json: { goalType: 'lose' },
    });
  });

  it('POST apply requires formulaId', async () => {
    mockedRequest.mockResolvedValue({
      preferredFormulaId: 'mifflin_st_jeor',
      maintenanceCalories: 2000,
      calorieGoal: { mode: 'single', target: 1700 },
      goalType: 'lose',
      calorieCalculation: {},
    });
    await postCalculatorApply({ formulaId: 'mifflin_st_jeor', goalType: 'lose' });
    expect(mockedRequest).toHaveBeenCalledWith('/me/calculator/apply', {
      method: 'POST',
      json: { formulaId: 'mifflin_st_jeor', goalType: 'lose' },
    });
  });
});
