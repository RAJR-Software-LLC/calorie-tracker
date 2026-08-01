import { ApiError } from '@/lib/api/errors';

import { toFeedbackLoadErrorMessage } from './errors';

describe('toFeedbackLoadErrorMessage', () => {
  it('hints when indexes are still building', () => {
    const msg = toFeedbackLoadErrorMessage(
      new ApiError(
        400,
        'Firestore index is currently building and cannot be used yet. Retry shortly.'
      )
    );
    expect(msg).toContain('still building');
  });

  it('hints about indexes when API reports FAILED_PRECONDITION', () => {
    const msg = toFeedbackLoadErrorMessage(
      new ApiError(500, '9 FAILED_PRECONDITION: The query requires an index.')
    );
    expect(msg).toContain('indexes');
  });

  it('falls back to generic user message otherwise', () => {
    expect(toFeedbackLoadErrorMessage(new ApiError(500, 'boom'))).toBe(
      'Something went wrong on our server. Please try again later.'
    );
  });
});
