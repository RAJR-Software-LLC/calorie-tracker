import { ApiError } from '@/lib/api/errors';

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

/**
 * One retry on 429 for water endpoints (bounded backoff + jitter; production-safe).
 */
export async function withWater429Retry<T>(fn: () => Promise<T>): Promise<T> {
  try {
    return await fn();
  } catch (err) {
    if (err instanceof ApiError && err.status === 429) {
      const delayMs = 600 + Math.floor(Math.random() * 400);
      await sleep(Math.min(delayMs, 2500));
      return await fn();
    }
    throw err;
  }
}
