import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react-native';
import type { ReactNode } from 'react';

jest.mock('@/components/auth/auth-provider', () => ({
  useAuth: () => ({ user: { uid: 'u1' }, loading: false }),
}));

jest.mock('@/lib/api', () => ({
  getCalculatorFormulas: jest.fn(),
  getMe: jest.fn(),
  postCalculatorApply: jest.fn(),
  postCalculatorEstimate: jest.fn(),
}));

import {
  getCalculatorFormulas,
  getMe,
  postCalculatorApply,
} from '@/lib/api';
import { queryKeys } from '@/lib/queries/keys';
import { useCalculatorApply, useCalculatorFormulas } from '@/lib/queries/use-calculator';

function wrapper(client: QueryClient) {
  return function W({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  };
}

describe('useCalculator hooks', () => {
  it('loads formulas catalog', async () => {
    (getCalculatorFormulas as jest.Mock).mockResolvedValue({
      defaultFormulaId: 'mifflin_st_jeor',
      formulas: [{ id: 'mifflin_st_jeor', formulaVersion: '2026.08.1' }],
    });
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const { result } = renderHook(() => useCalculatorFormulas(), { wrapper: wrapper(client) });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.defaultFormulaId).toBe('mifflin_st_jeor');
  });

  it('updates me cache after apply', async () => {
    const applyResult = {
      preferredFormulaId: 'mifflin_st_jeor',
      maintenanceCalories: 2200,
      calorieGoal: { mode: 'single', target: 1900 },
      goalType: 'lose',
      calorieCalculation: { formulaId: 'mifflin_st_jeor', tdee: 2200 },
    };
    (postCalculatorApply as jest.Mock).mockResolvedValue(applyResult);
    (getMe as jest.Mock).mockResolvedValue({
      uid: 'u1',
      ...applyResult,
      profile: {},
    });
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    client.setQueryData(queryKeys.me('u1'), { uid: 'u1', maintenanceCalories: null });

    const { result } = renderHook(() => useCalculatorApply(), { wrapper: wrapper(client) });
    await act(async () => {
      await result.current.mutateAsync({
        formulaId: 'mifflin_st_jeor',
        goalType: 'lose',
      });
    });

    await waitFor(() => {
      const me = client.getQueryData(queryKeys.me('u1')) as { maintenanceCalories: number };
      expect(me.maintenanceCalories).toBe(2200);
    });
  });
});
