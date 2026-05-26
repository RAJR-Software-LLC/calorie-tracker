import { ApiError } from '@/lib/api/errors';
import {
  classifySavedItemMutationError,
  formatSavedItemCalories,
  formatSavedItemCaloriesForList,
  formatFamilySharerLabel,
  isKnownCalories,
  isPersonalItemSharedWithFamily,
  mergeSavedFoodSuggestions,
  SAVED_ITEM_API_ERRORS,
  sortSavedItemsForManagement,
  toIfUnmodifiedSince,
} from '@/lib/utils/saved-items';
import type { FamilySharedItemWithId, SavedItemWithId } from '@/types';

function makeSavedItem(overrides: Partial<SavedItemWithId> = {}): SavedItemWithId {
  return {
    id: 'item-1',
    itemName: 'Apple',
    defaultQuantity: 1,
    defaultCalories: 95,
    useCount: 0,
    lastUsed: '2026-01-01T00:00:00.000Z',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-02T00:00:00.000Z',
    deletedAt: null,
    deletedBy: null,
    ...overrides,
  };
}

function makeFamilyItem(overrides: Partial<FamilySharedItemWithId> = {}): FamilySharedItemWithId {
  return {
    id: 'fam-item-1',
    itemName: 'Banana',
    defaultQuantity: 2,
    defaultCalories: 50,
    sharedBy: 'uid-a',
    sharedByName: 'Alex',
    sourceType: 'family',
    ...overrides,
  };
}

describe('saved-items utils', () => {
  it('isKnownCalories narrows unknown literal', () => {
    expect(isKnownCalories(100)).toBe(true);
    expect(isKnownCalories('unknown')).toBe(false);
  });

  it('formatSavedItemCalories handles known and unknown totals', () => {
    expect(formatSavedItemCalories(100, 2)).toBe('200 cal');
    expect(formatSavedItemCalories('unknown', 2)).toBe('Unknown calories');
  });

  it('formatSavedItemCaloriesForList shows per-unit calories in management list', () => {
    expect(formatSavedItemCaloriesForList(95)).toBe('95 cal');
    expect(formatSavedItemCaloriesForList('unknown')).toBe('Unknown calories');
  });

  it('toIfUnmodifiedSince returns ISO string', () => {
    expect(toIfUnmodifiedSince('2026-01-02T00:00:00.000Z')).toBe('2026-01-02T00:00:00.000Z');
    expect(() => toIfUnmodifiedSince(null)).toThrow(/updatedAt/);
  });

  it('classifies saved item mutation errors from API envelope', () => {
    expect(
      classifySavedItemMutationError(
        new ApiError(409, SAVED_ITEM_API_ERRORS.DUPLICATE_NAME, {
          error: SAVED_ITEM_API_ERRORS.DUPLICATE_NAME,
        })
      )
    ).toBe('duplicate_name');
    expect(
      classifySavedItemMutationError(
        new ApiError(409, SAVED_ITEM_API_ERRORS.STALE, { error: SAVED_ITEM_API_ERRORS.STALE })
      )
    ).toBe('stale');
    expect(
      classifySavedItemMutationError(
        new ApiError(404, SAVED_ITEM_API_ERRORS.NOT_FOUND, {
          error: SAVED_ITEM_API_ERRORS.NOT_FOUND,
        })
      )
    ).toBe('not_found');
    expect(
      classifySavedItemMutationError(
        new ApiError(400, SAVED_ITEM_API_ERRORS.MISSING_CONCURRENCY, {
          error: SAVED_ITEM_API_ERRORS.MISSING_CONCURRENCY,
        })
      )
    ).toBe('missing_concurrency');
  });

  it('sortSavedItemsForManagement sorts alphabetically', () => {
    const sorted = sortSavedItemsForManagement([
      makeSavedItem({ id: 'b', itemName: 'Zucchini' }),
      makeSavedItem({ id: 'a', itemName: 'Apple' }),
    ]);
    expect(sorted.map((item) => item.itemName)).toEqual(['Apple', 'Zucchini']);
  });

  it('mergeSavedFoodSuggestions prefers personal over family for same name', () => {
    const personal = [
      makeSavedItem({ id: 'p1', itemName: 'Jimmy Dean Breakfast Sandwich' }),
    ];
    const family = [
      makeFamilyItem({
        id: 'f1',
        itemName: 'Jimmy Dean Breakfast Sandwich',
        sharedBy: 'uid-a',
        sharedByName: 'Jolie',
      }),
    ];
    const merged = mergeSavedFoodSuggestions(personal, family, 'jimmy');
    expect(merged).toHaveLength(1);
    expect(merged[0]?.source).toBe('personal');
  });

  it('formatFamilySharerLabel shows Me for current user', () => {
    expect(formatFamilySharerLabel('uid-a', 'Jolie', 'uid-a')).toBe('Me');
    expect(formatFamilySharerLabel('uid-b', 'Jordan', 'uid-a')).toBe('Jordan');
  });

  it('isPersonalItemSharedWithFamily matches by name and sharer uid', () => {
    const item = makeSavedItem({ itemName: 'Soup' });
    const familyItems = [makeFamilyItem({ itemName: 'Soup', sharedBy: 'uid-a' })];
    expect(isPersonalItemSharedWithFamily(item, familyItems, 'uid-a')).toBe(true);
    expect(isPersonalItemSharedWithFamily(item, familyItems, 'uid-b')).toBe(false);
  });
});
