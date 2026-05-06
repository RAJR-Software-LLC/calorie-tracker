import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import type { EffectCallback } from 'react';

import { AppHeader } from '@/components/layout/app-header';

const mockPush = jest.fn();
const mockUseAuth = jest.fn();
const mockGetMe = jest.fn();
const focusCallbacks: EffectCallback[] = [];

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush }),
}));

jest.mock('@react-navigation/native', () => ({
  useFocusEffect: (callback: EffectCallback) => {
    const { useEffect: useReactEffect } = jest.requireActual<typeof import('react')>('react');
    useReactEffect(() => {
      focusCallbacks.push(callback);
      const cleanup = callback();
      return () => {
        if (typeof cleanup === 'function') cleanup();
      };
    }, [callback]);
  },
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

describe('AppHeader', () => {
  beforeEach(() => {
    mockPush.mockReset();
    mockGetMe.mockReset();
    mockUseAuth.mockReset();
    focusCallbacks.length = 0;
    mockUseAuth.mockReturnValue({
      user: { displayName: 'Alex Doe', email: 'alex@example.com' },
      loading: false,
    });
  });

  it('shows leaf fallback when no profile photo exists', async () => {
    mockGetMe.mockResolvedValue({ profilePhoto: null });

    render(<AppHeader />);

    await waitFor(() => expect(mockGetMe).toHaveBeenCalled());
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

    render(<AppHeader />);

    await waitFor(() => expect(screen.getByText('AvatarImage')).toBeTruthy());
  });

  it('navigates to settings when the right action is pressed', async () => {
    mockGetMe.mockResolvedValue({ profilePhoto: null });

    render(<AppHeader />);
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

    render(<AppHeader forceLeaf />);

    expect(screen.getByText('LeafIcon')).toBeTruthy();
    expect(screen.queryByText('AvatarImage')).toBeNull();
  });

  it('does not call getMe when forceLeaf is set', async () => {
    mockGetMe.mockResolvedValue({ profilePhoto: null });

    render(<AppHeader forceLeaf />);

    await waitFor(() => expect(focusCallbacks.length).toBeGreaterThan(0));
    expect(mockGetMe).not.toHaveBeenCalled();
  });

  it('refetches getMe when the screen regains focus', async () => {
    mockGetMe.mockResolvedValueOnce({ profilePhoto: null });

    render(<AppHeader />);
    await waitFor(() => expect(screen.getByText('LeafIcon')).toBeTruthy());
    expect(mockGetMe).toHaveBeenCalledTimes(1);

    mockGetMe.mockResolvedValueOnce({
      profilePhoto: {
        storagePath: 'users/u/profile-photo.jpg',
        contentType: 'image/jpeg',
        updatedAt: new Date().toISOString(),
        downloadUrl: 'https://example.com/photo.jpg',
      },
    });

    await act(async () => {
      focusCallbacks[focusCallbacks.length - 1]?.();
    });

    await waitFor(() => expect(mockGetMe).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(screen.getByText('AvatarImage')).toBeTruthy());
  });
});
