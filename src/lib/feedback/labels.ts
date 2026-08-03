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

export function feedbackCategoryLabel(category: FeedbackCategory): string {
  switch (category) {
    case 'bug':
      return FEEDBACK_CATEGORY_LABELS.bug;
    case 'feature_request':
      return FEEDBACK_CATEGORY_LABELS.feature_request;
    case 'other':
      return FEEDBACK_CATEGORY_LABELS.other;
  }
}

export function feedbackStatusLabel(status: FeedbackStatus): string {
  switch (status) {
    case 'open':
      return FEEDBACK_STATUS_LABELS.open;
    case 'in_progress':
      return FEEDBACK_STATUS_LABELS.in_progress;
    case 'resolved':
      return FEEDBACK_STATUS_LABELS.resolved;
    case 'closed':
      return FEEDBACK_STATUS_LABELS.closed;
  }
}
