import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';

import { SavedFoodsManagementModal } from '@/components/settings/saved-foods-management-modal';
import { ApiError } from '@/lib/api/errors';
import { SAVED_ITEM_API_ERRORS } from '@/lib/utils/saved-items';
import type { SavedItemWithId } from '@/types';

const mockUseAuth = jest.fn();
const mockRefreshSavedItems = jest.fn();
const mockUpdateSavedItemLocally = jest.fn();
const mockRemoveSavedItemLocally = jest.fn();
const mockPatchSavedItem = jest.fn();
const mockDeleteSavedItem = jest.fn();
const mockGetSavedItems = jest.fn();

jest.mock('@/components/auth/auth-provider', () => ({
  useAuth: () => mockUseAuth(),
}));

jest.mock('@/components/dashboard/dashboard-context', () => ({
  useDashboard: () => ({
    savedItems: mockSavedItems(),
    familySharedItems: mockFamilySharedItems(),
    refreshSavedItems: mockRefreshSavedItems,
    updateSavedItemLocally: mockUpdateSavedItemLocally,
    removeSavedItemLocally: mockRemoveSavedItemLocally,
  }),
}));

jest.mock('@/lib/api', () => ({
  patchSavedItem: (...args: unknown[]) => mockPatchSavedItem(...args),
  deleteSavedItem: (...args: unknown[]) => mockDeleteSavedItem(...args),
  getSavedItems: (...args: unknown[]) => mockGetSavedItems(...args),
}));

jest.mock('@/lib/toast', () => ({
  showToast: jest.fn(),
}));

let savedItemsState: SavedItemWithId[] = [];
let familySharedItemsState: {
  id: string;
  itemName: string;
  defaultQuantity: number;
  defaultCalories: number;
  sharedBy: string;
  sharedByName: string;
}[] = [];

function mockSavedItems() {
  return savedItemsState;
}

function mockFamilySharedItems() {
  return familySharedItemsState;
}

function makeItem(overrides: Partial<SavedItemWithId> = {}): SavedItemWithId {
  return {
    id: 'item-1',
    itemName: 'Oatmeal',
    defaultQuantity: 1,
    defaultCalories: 150,
    useCount: 1,
    lastUsed: '2026-01-01T00:00:00.000Z',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-02T00:00:00.000Z',
    deletedAt: null,
    deletedBy: null,
    ...overrides,
  };
}

describe('SavedFoodsManagementModal', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    savedItemsState = [makeItem()];
    familySharedItemsState = [];
    mockUseAuth.mockReturnValue({ user: { uid: 'uid-a' } });
    mockRefreshSavedItems.mockResolvedValue(undefined);
    mockGetSavedItems.mockResolvedValue(savedItemsState);
    mockPatchSavedItem.mockResolvedValue(undefined);
    mockDeleteSavedItem.mockResolvedValue(undefined);
  });

  it('renders personal saved items sorted alphabetically', async () => {
    savedItemsState = [
      makeItem({ id: 'b', itemName: 'Zucchini' }),
      makeItem({ id: 'a', itemName: 'Apple' }),
    ];

    render(<SavedFoodsManagementModal open onOpenChange={jest.fn()} />);

    await waitFor(() => expect(mockRefreshSavedItems).toHaveBeenCalled());
    const rows = screen.getAllByText(/Apple|Zucchini/);
    expect(rows[0]?.props.children).toBe('Apple');
  });

  it('patchSavedItem includes If-Unmodified-Since from selected row', async () => {
    render(<SavedFoodsManagementModal open onOpenChange={jest.fn()} />);
    await waitFor(() => expect(mockRefreshSavedItems).toHaveBeenCalled());

    fireEvent.press(screen.getByLabelText('Edit Oatmeal'));
    fireEvent.changeText(screen.getByDisplayValue('Oatmeal'), 'Steel-cut oats');
    fireEvent.press(screen.getByText('Save'));

    await waitFor(() => {
      expect(mockPatchSavedItem).toHaveBeenCalledWith(
        'item-1',
        { itemName: 'Steel-cut oats' },
        '2026-01-02T00:00:00.000Z'
      );
    });
  });

  it('shows duplicate name inline error on 409', async () => {
    mockPatchSavedItem.mockRejectedValue(
      new ApiError(409, SAVED_ITEM_API_ERRORS.DUPLICATE_NAME, {
        error: SAVED_ITEM_API_ERRORS.DUPLICATE_NAME,
      })
    );

    render(<SavedFoodsManagementModal open onOpenChange={jest.fn()} />);
    await waitFor(() => expect(mockRefreshSavedItems).toHaveBeenCalled());

    fireEvent.press(screen.getByLabelText('Edit Oatmeal'));
    fireEvent.changeText(screen.getByDisplayValue('Oatmeal'), 'Duplicate');
    fireEvent.press(screen.getByText('Save'));

    await waitFor(() => {
      expect(screen.getByText('You already have a saved food with this name.')).toBeTruthy();
    });
  });

  it('delete removes item locally with concurrency header', async () => {
    render(<SavedFoodsManagementModal open onOpenChange={jest.fn()} />);
    await waitFor(() => expect(mockRefreshSavedItems).toHaveBeenCalled());

    fireEvent.press(screen.getByLabelText('Delete Oatmeal'));

    await waitFor(() => {
      expect(mockDeleteSavedItem).toHaveBeenCalledWith('item-1', '2026-01-02T00:00:00.000Z');
      expect(mockRemoveSavedItemLocally).toHaveBeenCalledWith('item-1');
    });
  });
});
