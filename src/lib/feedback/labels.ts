import type { FeedbackCategory, FeedbackStatus } from '@/types';

export const FEEDBACK_CATEGORY_LABELS: Record<FeedbackCategory, string> = {
  bug: 'Bug',
  feature_request: 'Feature request',
  other: 'Other',
};

export const FEEDBACK_STATUS_LABELS: Record<FeedbackStatus, string> = {
  open: 'Open',
  in_progress: 'In progress',
  resolved: 'Resolved',
  closed: 'Closed',
};

export const FEEDBACK_CATEGORIES: FeedbackCategory[] = ['bug', 'feature_request', 'other'];

export const FEEDBACK_STATUSES: FeedbackStatus[] = ['open', 'in_progress', 'resolved', 'closed'];
