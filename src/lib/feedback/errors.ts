import { ApiError } from '@/lib/api/errors';
import { toUserErrorMessage } from '@/lib/app-errors';

/**
 * User-facing copy for feedback list/detail load failures.
 * Surfaces Firestore index setup / building hints when the API reports a precondition failure.
 */
export function toFeedbackLoadErrorMessage(err: unknown): string {
  if (err instanceof ApiError && (err.status >= 500 || err.status === 400)) {
    const detail =
      `${err.message} ${typeof err.body === 'string' ? err.body : JSON.stringify(err.body ?? '')}`.toLowerCase();
    if (detail.includes('building') && detail.includes('index')) {
      return 'Feedback indexes are still building in Firebase. This usually finishes within a few minutes — tap Try again shortly.';
    }
    if (
      detail.includes('index') ||
      detail.includes('failed_precondition') ||
      detail.includes('failed-precondition') ||
      detail.includes('precondition')
    ) {
      return 'Feedback needs Firestore indexes. If you just deployed them, wait until they finish building in the Firebase console, then try again.';
    }
  }
  return toUserErrorMessage(err, "Couldn't load feedback");
}
