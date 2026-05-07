import { formatFirstValidationDetail } from './api-validation-details';

describe('formatFirstValidationDetail', () => {
  it('returns null when no details', () => {
    expect(formatFirstValidationDetail({ error: 'Bad' })).toBeNull();
    expect(formatFirstValidationDetail(null)).toBeNull();
  });

  it('collects first string from nested zod-like structure', () => {
    const msg = formatFirstValidationDetail({
      error: 'Validation failed',
      details: { fieldErrors: { date: ['Invalid date'] } },
    });
    expect(msg).toBe('Invalid date');
  });
});
