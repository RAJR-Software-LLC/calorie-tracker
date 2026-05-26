import { ApiError } from '@/lib/api/errors';
import type { ApiTimestamp, FamilySharedItemWithId, SavedItemWithId } from '@/types';

/** Stable API error strings for saved-item mutations (message-based discrimination). */
export const SAVED_ITEM_API_ERRORS = {
  STALE: 'Saved item was modified, refresh and retry',
  DUPLICATE_NAME: 'Saved item name already exists',
  NOT_FOUND: 'Saved item not found',
  MISSING_CONCURRENCY: 'Missing or invalid If-Unmodified-Since header',
} as const;

export type SavedItemMutationFailure =
  | 'stale'
  | 'duplicate_name'
  | 'not_found'
  | 'missing_concurrency';

export function isKnownCalories(value: number | 'unknown'): value is number {
  return value !== 'unknown';
}

export function formatSavedItemCalories(
  defaultCalories: number | 'unknown',
  defaultQuantity: number
): string {
  if (defaultCalories === 'unknown') return 'Unknown calories';
  const total = Math.round(defaultCalories * defaultQuantity);
  return `${total} cal`;
}

export function formatSavedItemCaloriesForList(defaultCalories: number | 'unknown'): string {
  if (defaultCalories === 'unknown') return 'Unknown calories';
  return `${defaultCalories} cal`;
}

export function toIfUnmodifiedSince(updatedAt: ApiTimestamp | unknown): string {
  if (typeof updatedAt === 'string' && updatedAt.trim().length > 0) {
    return updatedAt;
  }
  throw new Error('Saved item is missing a valid updatedAt timestamp');
}

function readApiErrorMessage(err: ApiError): string {
  if (typeof err.body === 'object' && err.body !== null && 'error' in err.body) {
    return String((err.body as { error?: unknown }).error);
  }
  return err.message;
}

export function classifySavedItemMutationError(err: unknown): SavedItemMutationFailure | null {
  if (!(err instanceof ApiError)) return null;
  const message = readApiErrorMessage(err);
  if (err.status === 404 || message === SAVED_ITEM_API_ERRORS.NOT_FOUND) {
    return 'not_found';
  }
  if (err.status === 409) {
    if (message === SAVED_ITEM_API_ERRORS.DUPLICATE_NAME) return 'duplicate_name';
    if (message === SAVED_ITEM_API_ERRORS.STALE) return 'stale';
    return 'stale';
  }
  if (err.status === 400 && message === SAVED_ITEM_API_ERRORS.MISSING_CONCURRENCY) {
    return 'missing_concurrency';
  }
  return null;
}

export function sortSavedItemsForManagement(items: SavedItemWithId[]): SavedItemWithId[] {
  return [...items].sort((a, b) =>
    a.itemName.localeCompare(b.itemName, undefined, { sensitivity: 'base' })
  );
}

export type SavedFoodSuggestionSource = 'personal' | 'family';

export type SavedFoodSuggestion =
  | { source: 'personal'; item: SavedItemWithId }
  | { source: 'family'; item: FamilySharedItemWithId };

export function normalizeSavedItemName(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, ' ');
}

export function mergeSavedFoodSuggestions(
  personalItems: SavedItemWithId[],
  familyItems: FamilySharedItemWithId[],
  query: string,
  limit = 5
): SavedFoodSuggestion[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];

  const personal = personalItems
    .filter((item) => item.itemName.toLowerCase().includes(q))
    .map((item) => ({ source: 'personal' as const, item }));

  const family = familyItems
    .filter((item) => item.itemName.toLowerCase().includes(q))
    .map((item) => ({ source: 'family' as const, item }));

  const byName = new Map<string, SavedFoodSuggestion>();
  for (const suggestion of personal) {
    byName.set(normalizeSavedItemName(suggestion.item.itemName), suggestion);
  }
  for (const suggestion of family) {
    const key = normalizeSavedItemName(suggestion.item.itemName);
    if (!byName.has(key)) {
      byName.set(key, suggestion);
    }
  }

  return [...byName.values()]
    .sort((a, b) =>
      a.item.itemName.localeCompare(b.item.itemName, undefined, { sensitivity: 'base' })
    )
    .slice(0, limit);
}

export function formatFamilySharerLabel(
  sharedBy: string | undefined,
  sharedByName: string | undefined,
  currentUserId: string | undefined
): string | null {
  if (!sharedByName?.trim()) return null;
  if (currentUserId && sharedBy === currentUserId) return 'Me';
  return sharedByName.trim();
}

export function isPersonalItemSharedWithFamily(
  item: SavedItemWithId,
  familySharedItems: FamilySharedItemWithId[],
  userId: string | undefined
): boolean {
  if (!userId) return false;
  const normalized = item.itemName.trim().toLowerCase();
  return familySharedItems.some(
    (shared) =>
      shared.sharedBy === userId && shared.itemName.trim().toLowerCase() === normalized
  );
}
