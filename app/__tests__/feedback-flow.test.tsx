import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';

import FeedbackNewScreen from '@/app/feedback-new';
import FeedbackListScreen from '@/app/feedback';
import { TestQueryProvider } from '@/lib/queries/test-utils';

const mockPush = jest.fn();
const mockReplace = jest.fn();
const mockGetFeedbackList = jest.fn();
const mockPostFeedback = jest.fn();

jest.mock('expo-router', () => {
  const React = require('react') as typeof import('react');
  return {
    useRouter: () => ({ push: mockPush, replace: mockReplace }),
    useFocusEffect: (cb: () => void) => {
      React.useEffect(() => {
        cb();
      }, [cb]);
    },
    Stack: {
      Screen: () => null,
    },
  };
});

jest.mock('@/components/auth/auth-provider', () => ({
  useAuth: () => ({
    user: { uid: 'u1', email: 'test@example.com' },
    loading: false,
  }),
}));

jest.mock('@/lib/api', () => ({
  getFeedbackList: (...args: unknown[]) => mockGetFeedbackList(...args),
  getFeedbackDetail: jest.fn(),
  postFeedback: (...args: unknown[]) => mockPostFeedback(...args),
  patchFeedback: jest.fn(),
  deleteFeedback: jest.fn(),
  postFeedbackComment: jest.fn(),
  postFeedbackAttachmentUploadUrl: jest.fn(),
  postFeedbackAttachmentComplete: jest.fn(),
}));

jest.mock('@/components/layout/app-screen', () => ({
  AppScreen: ({ children }: { children: React.ReactNode }) => children,
}));

jest.mock('@/lib/toast', () => ({
  showToast: jest.fn(),
}));

describe('feedback flow', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetFeedbackList.mockResolvedValue([]);
  });

  it('shows empty list copy and new report CTA', async () => {
    render(
      <TestQueryProvider>
        <FeedbackListScreen />
      </TestQueryProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('No reports yet')).toBeTruthy();
    });
    fireEvent.press(screen.getByText('New report'));
    expect(mockPush).toHaveBeenCalledWith('/feedback-new');
  });

  it('requires category and message before create', async () => {
    render(
      <TestQueryProvider>
        <FeedbackNewScreen />
      </TestQueryProvider>
    );

    fireEvent.press(screen.getByText('Submit report'));
    expect(await screen.findByText('Choose a category.')).toBeTruthy();
    expect(mockPostFeedback).not.toHaveBeenCalled();

    fireEvent.press(screen.getByText('Bug'));
    fireEvent.press(screen.getByText('Submit report'));
    expect(await screen.findByText('Enter a message.')).toBeTruthy();
    expect(mockPostFeedback).not.toHaveBeenCalled();
  });

  it('creates a report and navigates to detail', async () => {
    mockPostFeedback.mockResolvedValue({ id: 'fb-99' });

    render(
      <TestQueryProvider>
        <FeedbackNewScreen />
      </TestQueryProvider>
    );

    fireEvent.press(screen.getByText('Bug'));
    fireEvent.changeText(screen.getByLabelText('Feedback message'), 'App crashes on save');
    fireEvent.press(screen.getByText('Submit report'));

    await waitFor(() => {
      expect(mockPostFeedback).toHaveBeenCalledWith(
        expect.objectContaining({
          category: 'bug',
          message: 'App crashes on save',
        })
      );
    });
    expect(mockReplace).toHaveBeenCalledWith('/feedback-detail/fb-99');
  });
});
