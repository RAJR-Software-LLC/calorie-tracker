import { ApiError } from '@/lib/api/errors';

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

/**
 * One retry on 429, honoring Retry-After seconds when present
 * (bounded backoff + jitter; production-safe).
 */
export async function withRetryAfter429<T>(fn: () => Promise<T>): Promise<T> {
  try {
    return await fn();
  } catch (err) {
    if (err instanceof ApiError && err.status === 429) {
      const fromHeader =
        err.retryAfterSeconds != null && Number.isFinite(err.retryAfterSeconds)
          ? err.retryAfterSeconds * 1000
          : null;
      const jitterMs = 600 + Math.floor(Math.random() * 400);
      const delayMs = Math.min(fromHeader ?? jitterMs, 10_000);
      await sleep(delayMs);
      return await fn();
    }
    throw err;
  }
}
