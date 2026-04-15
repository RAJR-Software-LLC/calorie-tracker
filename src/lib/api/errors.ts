export class ApiError extends Error {
  readonly status: number;
  readonly body: unknown;
  /** Full URL that was requested (helps debug wrong host, 404, etc.). */
  readonly requestUrl?: string;

  constructor(status: number, message: string, body?: unknown, requestUrl?: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.body = body;
    this.requestUrl = requestUrl;
  }
}
