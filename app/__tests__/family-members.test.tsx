import { render, screen, waitFor } from '@testing-library/react-native';
import type { ReactNode } from 'react';

import { SharedItemsList } from '@/components/family/shared-items-list';
import type { FamilyWithId } from '@/types';

const mockGetFamily = jest.fn();
const mockGetFamilySharedItems = jest.fn();
const mockGetMe = jest.fn();
const mockAvatar = jest.fn();

jest.mock('@/lib/api', () => ({
  getFamily: (...args: unknown[]) => mockGetFamily(...args),
  getFamilySharedItems: (...args: unknown[]) => mockGetFamilySharedItems(...args),
  getMe: (...args: unknown[]) => mockGetMe(...args),
  getSavedItems: jest.fn(),
  postFamilySharedItem: jest.fn(),
}));

jest.mock('@/components/auth/auth-provider', () => ({
  useAuth: () => ({ user: { uid: 'uid-a', displayName: 'Alex' } }),
}));

jest.mock('@/components/ui/button', () => ({
  Button: ({ children }: { children?: ReactNode }) => <>{children}</>,
}));

jest.mock('@/components/ui/input', () => ({
  Input: () => null,
}));

jest.mock('@/components/ui/label', () => ({
  Label: ({ children }: { children?: ReactNode }) => <>{children}</>,
}));

jest.mock('@/components/ui/avatar', () => ({
  Avatar: (props: unknown) => {
    mockAvatar(props);
    return null;
  },
}));

function makeFamily(overrides: Partial<FamilyWithId> = {}): FamilyWithId {
  return {
    id: 'fam-1',
    name: 'Family One',
    createdBy: 'uid-a',
    members: ['uid-a', 'uid-b'],
    inviteCode: 'ABCD1234',
    createdAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

describe('SharedItemsList family members', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetFamilySharedItems.mockResolvedValue([]);
    mockGetMe.mockResolvedValue(null);
  });

  it('renders Me for current user, full names for others, and keeps header info visible', async () => {
    mockGetFamily.mockResolvedValue(
      makeFamily({
        memberProfiles: [
          {
            uid: 'uid-a',
            displayName: 'Alex Rivera',
            profilePhoto: { downloadUrl: 'https://example.com/alex.png' },
          },
          {
            uid: 'uid-b',
            displayName: 'Jordan Lee',
            profilePhoto: null,
          },
        ],
      })
    );

    render(<SharedItemsList familyId="fam-1" />);

    await waitFor(() => expect(mockGetFamily).toHaveBeenCalledWith('fam-1'));
    expect(screen.getByText('Family One')).toBeTruthy();
    expect(screen.getByText('2 members')).toBeTruthy();
    expect(screen.getByText('ABCD1234')).toBeTruthy();
    expect(screen.getByText('Me')).toBeTruthy();
    expect(screen.getByText('Jordan Lee')).toBeTruthy();
    expect(mockAvatar).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'Alex Rivera',
        photo: { downloadUrl: 'https://example.com/alex.png' },
      })
    );
  });

  it('falls back to uid list rows when memberProfiles is missing', async () => {
    mockGetFamily.mockResolvedValue(
      makeFamily({
        members: ['uid-a'],
      })
    );

    render(<SharedItemsList familyId="fam-1" />);

    await waitFor(() => expect(mockGetFamily).toHaveBeenCalledWith('fam-1'));
    expect(screen.getByText('1 member')).toBeTruthy();
    expect(screen.getByText('Me')).toBeTruthy();
    expect(mockAvatar).toHaveBeenCalledWith(
      expect.objectContaining({
        photo: null,
      })
    );
  });

  it('uses current user profile photo when memberProfiles photo is missing', async () => {
    mockGetFamily.mockResolvedValue(
      makeFamily({
        members: ['uid-a'],
      })
    );
    mockGetMe.mockResolvedValue({
      profilePhoto: {
        storagePath: 'users/uid-a/photo.jpg',
        contentType: 'image/jpeg',
        updatedAt: '2026-01-01T00:00:00.000Z',
        downloadUrl: 'https://example.com/me-photo.png',
      },
    });

    render(<SharedItemsList familyId="fam-1" />);

    await waitFor(() => expect(mockGetFamily).toHaveBeenCalledWith('fam-1'));
    expect(mockAvatar).toHaveBeenCalledWith(
      expect.objectContaining({
        photo: expect.objectContaining({
          downloadUrl: 'https://example.com/me-photo.png',
        }),
      })
    );
  });
});
