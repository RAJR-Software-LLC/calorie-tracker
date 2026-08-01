import { renderHook, waitFor } from '@testing-library/react-native';
import type { QueryClient } from '@tanstack/react-query';
import type { ReactNode } from 'react';

import { getFeedbackDetail, getFeedbackList } from '@/lib/api';
import { queryKeys } from '@/lib/queries/keys';
import { TestQueryProvider, createTestQueryClient } from '@/lib/queries/test-utils';
import { useFeedbackDetail, useFeedbackList } from '@/lib/queries/use-feedback';
import type { FeedbackDetail, FeedbackDocument } from '@/types';

jest.mock('@/components/auth/auth-provider', () => ({
  useAuth: () => ({
    user: { uid: 'user-1', displayName: 'Test', email: 'test@example.com' },
    loading: false,
  }),
}));

jest.mock('@/lib/api', () => ({
  getFeedbackList: jest.fn(),
  getFeedbackDetail: jest.fn(),
  postFeedback: jest.fn(),
  patchFeedback: jest.fn(),
  deleteFeedback: jest.fn(),
  postFeedbackComment: jest.fn(),
}));

const mockGetList = getFeedbackList as jest.Mock;
const mockGetDetail = getFeedbackDetail as jest.Mock;

function makeDoc(overrides: Partial<FeedbackDocument> = {}): FeedbackDocument {
  return {
    id: 'fb-1',
    userId: 'user-1',
    category: 'bug',
    message: 'Broken button',
    status: 'open',
    attachments: [],
    createdAt: '2026-07-01T00:00:00.000Z',
    updatedAt: '2026-07-01T00:00:00.000Z',
    deletedAt: null,
    ...overrides,
  };
}

function createWrapper(client: QueryClient) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return <TestQueryProvider client={client}>{children}</TestQueryProvider>;
  };
}

describe('useFeedbackList / useFeedbackDetail', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetList.mockResolvedValue([makeDoc()]);
    mockGetDetail.mockResolvedValue({
      ...makeDoc(),
      comments: [],
    } satisfies FeedbackDetail);
  });

  it('loads list with all filter key', async () => {
    const client = createTestQueryClient();
    const { result } = renderHook(() => useFeedbackList('all'), {
      wrapper: createWrapper(client),
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockGetList).toHaveBeenCalledWith(undefined);
    expect(client.getQueryData(queryKeys.feedbackList('user-1', 'all'))).toHaveLength(1);
  });

  it('loads list with status filter', async () => {
    const client = createTestQueryClient();
    const { result } = renderHook(() => useFeedbackList('open'), {
      wrapper: createWrapper(client),
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockGetList).toHaveBeenCalledWith({ status: 'open' });
  });

  it('loads detail by id', async () => {
    const client = createTestQueryClient();
    const { result } = renderHook(() => useFeedbackDetail('fb-1'), {
      wrapper: createWrapper(client),
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockGetDetail).toHaveBeenCalledWith('fb-1');
    expect(result.current.data?.message).toBe('Broken button');
  });
});
