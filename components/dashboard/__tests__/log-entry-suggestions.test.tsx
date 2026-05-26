import { fireEvent, render, screen } from '@testing-library/react-native';

import { LogEntryForm } from '@/components/dashboard/log-entry-modal';
import type { FamilySharedItemWithId, SavedItemWithId } from '@/types';

const mockUseAuth = jest.fn();

jest.mock('@/components/auth/auth-provider', () => ({
  useAuth: () => mockUseAuth(),
}));

jest.mock('@/components/dashboard/dashboard-context', () => ({
  useDashboard: () => ({
    savedItems: mockSavedItems(),
    familySharedItems: mockFamilySharedItems(),
    refreshEntries: jest.fn(),
    refreshSavedItems: jest.fn(),
  }),
}));

jest.mock('@/lib/api', () => ({
  postEntry: jest.fn(),
  postSavedItem: jest.fn(),
  patchSavedItemUsage: jest.fn(),
}));

jest.mock('@/lib/toast', () => ({
  showToast: jest.fn(),
}));

let savedItemsState: SavedItemWithId[] = [];
let familySharedItemsState: FamilySharedItemWithId[] = [];

function mockSavedItems() {
  return savedItemsState;
}

function mockFamilySharedItems() {
  return familySharedItemsState;
}

describe('LogEntryForm suggestions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseAuth.mockReturnValue({ user: { uid: 'uid-a' } });
    savedItemsState = [
      {
        id: 'p1',
        itemName: 'Apple',
        defaultQuantity: 1,
        defaultCalories: 95,
        useCount: 0,
        lastUsed: '2026-01-01T00:00:00.000Z',
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
        deletedAt: null,
        deletedBy: null,
      },
    ];
    familySharedItemsState = [
      {
        id: 'f1',
        itemName: 'Apricot',
        defaultQuantity: 1,
        defaultCalories: 17,
        sharedBy: 'uid-b',
        sharedByName: 'Jordan',
        sourceType: 'family',
      },
    ];
  });

  it('shows personal and family badges when names differ', () => {
    render(<LogEntryForm date="2026-05-26" onSuccess={jest.fn()} />);
    fireEvent.changeText(screen.getByPlaceholderText('e.g. Chicken sandwich'), 'a');

    expect(screen.getByText('Personal')).toBeTruthy();
    expect(screen.getByText('Family')).toBeTruthy();
    expect(screen.getByText(/Shared by Jordan/)).toBeTruthy();
  });

  it('shows Me when family suggestion was shared by current user and personal copy is absent', () => {
    savedItemsState = [];
    familySharedItemsState = [
      {
        id: 'f1',
        itemName: 'Jimmy Dean Breakfast Sandwich',
        defaultQuantity: 1,
        defaultCalories: 350,
        sharedBy: 'uid-a',
        sharedByName: 'Jolie',
        sourceType: 'family',
      },
    ];

    render(<LogEntryForm date="2026-05-26" onSuccess={jest.fn()} />);
    fireEvent.changeText(screen.getByPlaceholderText('e.g. Chicken sandwich'), 'jimmy');

    expect(screen.getByText(/Shared by Me/)).toBeTruthy();
  });

  it('does not prefill calories when selecting unknown personal item', () => {
    savedItemsState = [
      {
        id: 'p2',
        itemName: 'Mystery snack',
        defaultQuantity: 1,
        defaultCalories: 'unknown',
        useCount: 0,
        lastUsed: '2026-01-01T00:00:00.000Z',
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
        deletedAt: null,
        deletedBy: null,
      },
    ];

    render(<LogEntryForm date="2026-05-26" onSuccess={jest.fn()} />);
    fireEvent.changeText(screen.getByPlaceholderText('e.g. Chicken sandwich'), 'myst');
    fireEvent.press(screen.getByText('Mystery snack'));

    expect(screen.getByDisplayValue('Mystery snack')).toBeTruthy();
    expect(screen.queryByDisplayValue('unknown')).toBeNull();
    expect(screen.getByPlaceholderText('e.g. 400').props.value).toBe('');
  });
});
