import { withRetryAfter429 } from './retry-after-429';

/**
 * One retry on 429 for water endpoints (bounded backoff + jitter; production-safe).
 * @deprecated Prefer {@link withRetryAfter429} for new call sites.
 */
export async function withWater429Retry<T>(fn: () => Promise<T>): Promise<T> {
  return withRetryAfter429(fn);
}
