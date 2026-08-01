/** Hierarchical TanStack Query keys — always include `uid` for user-scoped data. */
export const queryKeys = {
  me: (uid?: string) => ['me', uid] as const,
  entries: (uid?: string, date?: string) => ['entries', uid, date] as const,
  entriesRange: (uid?: string, start?: string, end?: string) =>
    ['entries', uid, 'range', start, end] as const,
  water: (uid?: string, date?: string) => ['water', uid, date] as const,
  exercise: (uid?: string, date?: string) => ['exercise', uid, date] as const,
  /** Prefix key for invalidating all day-scoped exercise queries for a user. */
  exerciseRoot: (uid?: string) => ['exercise', uid] as const,
  savedItems: (uid?: string) => ['savedItems', uid] as const,
  familySharedItems: (uid?: string, familyId?: string | null) =>
    ['familySharedItems', uid, familyId] as const,
  /** Prefix for invalidating all feedback queries for a user. */
  feedbackRoot: (uid?: string) => ['feedback', uid] as const,
  feedbackList: (uid?: string, status: string = 'all') =>
    ['feedback', uid, 'list', status] as const,
  feedbackDetail: (uid?: string, feedbackId?: string) =>
    ['feedback', uid, 'detail', feedbackId] as const,
};
