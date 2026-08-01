import type { FeedbackStatus } from '@/types';

/** User may PATCH message/category and POST comments only in these statuses. */
export function isFeedbackEditable(status: FeedbackStatus): boolean {
  return status === 'open' || status === 'in_progress';
}
