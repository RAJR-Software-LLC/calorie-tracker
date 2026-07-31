export class ApiError extends Error {
  readonly status: number;
  readonly body: unknown;
  /** Full URL that was requested (helps debug wrong host, 404, etc.). */
  readonly requestUrl?: string;
  /** Seconds from the `Retry-After` response header when present (rate limits). */
  readonly retryAfterSeconds?: number;

  constructor(
    status: number,
    message: string,
    body?: unknown,
    requestUrl?: string,
    retryAfterSeconds?: number
  ) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.body = body;
    this.requestUrl = requestUrl;
    this.retryAfterSeconds = retryAfterSeconds;
  }
}

/** Parse `Retry-After` as delay-seconds (HTTP-date forms are ignored). */
export function parseRetryAfterHeader(value: string | null): number | undefined {
  if (value == null || value.trim() === '') return undefined;
  const seconds = Number.parseInt(value.trim(), 10);
  if (!Number.isFinite(seconds) || seconds < 0) return undefined;
  return seconds;
}
