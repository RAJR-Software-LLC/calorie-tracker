import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';

import { AppHeader } from '@/components/layout/app-header';
import { TestQueryProvider } from '@/lib/queries/test-utils';

const mockPush = jest.fn();
const mockUseAuth = jest.fn();
const mockGetMe = jest.fn();

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush }),
}));

jest.mock('@/components/auth/auth-provider', () => ({
  useAuth: () => mockUseAuth(),
}));

jest.mock('@/lib/api', () => ({
  getMe: () => mockGetMe(),
}));

jest.mock('lucide-react-native', () => ({
  Leaf: () => {
    const { Text: RNText } = jest.requireActual<typeof import('react-native')>('react-native');
    return <RNText>LeafIcon</RNText>;
  },
}));

jest.mock('@/components/ui/avatar', () => ({
  Avatar: () => {
    const { Text: RNText } = jest.requireActual<typeof import('react-native')>('react-native');
    return <RNText>AvatarImage</RNText>;
  },
}));

function renderHeader(props?: { forceLeaf?: boolean }) {
  return render(
    <TestQueryProvider>
      <AppHeader {...props} />
    </TestQueryProvider>
  );
}

describe('AppHeader', () => {
  beforeEach(() => {
    mockPush.mockReset();
    mockGetMe.mockReset();
    mockUseAuth.mockReset();
    mockUseAuth.mockReturnValue({
      user: { uid: 'u1', displayName: 'Alex Doe', email: 'alex@example.com' },
      loading: false,
    });
  });

  it('shows leaf fallback when no profile photo exists', async () => {
    mockGetMe.mockResolvedValue({ profilePhoto: null });

    renderHeader();

    await waitFor(() => expect(mockGetMe).toHaveBeenCalledTimes(1));
    expect(screen.getByText('LeafIcon')).toBeTruthy();
  });

  it('shows avatar when profile photo exists', async () => {
    mockGetMe.mockResolvedValue({
      profilePhoto: {
        storagePath: 'users/u/profile-photo.jpg',
        contentType: 'image/jpeg',
        updatedAt: new Date().toISOString(),
        downloadUrl: 'https://example.com/photo.jpg',
      },
    });

    renderHeader();

    await waitFor(() => expect(screen.getByText('AvatarImage')).toBeTruthy());
    expect(mockGetMe).toHaveBeenCalledTimes(1);
  });

  it('navigates to settings when the right action is pressed', async () => {
    mockGetMe.mockResolvedValue({ profilePhoto: null });

    renderHeader();
    await waitFor(() => expect(mockGetMe).toHaveBeenCalled());

    fireEvent.press(screen.getByLabelText('Open settings'));

    expect(mockPush).toHaveBeenCalledWith('/(tabs)/settings');
  });

  it('shows leaf when forceLeaf is set even if a profile photo exists', () => {
    mockGetMe.mockResolvedValue({
      profilePhoto: {
        storagePath: 'users/u/profile-photo.jpg',
        contentType: 'image/jpeg',
        updatedAt: new Date().toISOString(),
        downloadUrl: 'https://example.com/photo.jpg',
      },
    });

    renderHeader({ forceLeaf: true });

    expect(screen.getByText('LeafIcon')).toBeTruthy();
    expect(screen.queryByText('AvatarImage')).toBeNull();
  });

  it('does not call getMe when forceLeaf is set', async () => {
    mockGetMe.mockResolvedValue({ profilePhoto: null });

    renderHeader({ forceLeaf: true });

    await waitFor(() => expect(screen.getByText('LeafIcon')).toBeTruthy());
    expect(mockGetMe).not.toHaveBeenCalled();
  });
});
