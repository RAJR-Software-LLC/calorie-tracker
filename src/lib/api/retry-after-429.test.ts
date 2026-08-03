import { ApiError } from '@/lib/api/errors';

import { withRetryAfter429 } from './retry-after-429';

describe('withRetryAfter429', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('returns on success without retry', async () => {
    const fn = jest.fn().mockResolvedValue('ok');
    await expect(withRetryAfter429(fn)).resolves.toBe('ok');
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('retries once on 429', async () => {
    const fn = jest
      .fn()
      .mockRejectedValueOnce(new ApiError(429, 'rate limited', {}, undefined, 0))
      .mockResolvedValueOnce('ok');
    const promise = withRetryAfter429(fn);
    await jest.runAllTimersAsync();
    await expect(promise).resolves.toBe('ok');
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it('does not retry non-429 errors', async () => {
    const fn = jest.fn().mockRejectedValue(new ApiError(400, 'bad'));
    await expect(withRetryAfter429(fn)).rejects.toBeInstanceOf(ApiError);
    expect(fn).toHaveBeenCalledTimes(1);
  });
});
