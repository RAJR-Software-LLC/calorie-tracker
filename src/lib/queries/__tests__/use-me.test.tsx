import { renderHook, waitFor } from '@testing-library/react-native';
import type { QueryClient } from '@tanstack/react-query';
import type { ReactNode } from 'react';

import { getMe } from '@/lib/api';
import { useMe } from '@/lib/queries/use-me';
import { TestQueryProvider, createTestQueryClient } from '@/lib/queries/test-utils';

jest.mock('@/components/auth/auth-provider', () => ({
  useAuth: () => ({
    user: { uid: 'user-1', displayName: 'Test', email: 'test@example.com' },
    loading: false,
  }),
}));

jest.mock('@/lib/api', () => ({
  getMe: jest.fn(),
}));

const mockGetMe = getMe as jest.Mock;

function createWrapper(client: QueryClient) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return <TestQueryProvider client={client}>{children}</TestQueryProvider>;
  };
}

describe('useMe', () => {
  beforeEach(() => {
    mockGetMe.mockReset();
    mockGetMe.mockResolvedValue({
      displayName: 'Test',
      email: 'test@example.com',
      profile: {
        heightCm: null,
        weightKg: null,
        heightUnit: 'cm',
        weightUnit: 'kg',
        age: null,
        sex: null,
        activityLevel: null,
      },
      profilePhoto: null,
    });
  });

  it('deduplicates parallel fetches for the same user', async () => {
    const client = createTestQueryClient();
    const wrapper = createWrapper(client);

    const { result: r1 } = renderHook(() => useMe(), { wrapper });
    const { result: r2 } = renderHook(() => useMe(), { wrapper });

    await waitFor(() => expect(r1.current.isSuccess).toBe(true));
    await waitFor(() => expect(r2.current.isSuccess).toBe(true));

    expect(mockGetMe).toHaveBeenCalledTimes(1);
  });
});
