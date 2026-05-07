/**
 * Extract a short user-facing line from API `400` bodies that include Zod-style `details`.
 */
export function formatFirstValidationDetail(body: unknown): string | null {
  if (typeof body !== 'object' || body === null || !('details' in body)) {
    return null;
  }
  const strings: string[] = [];
  collectStrings((body as { details: unknown }).details, strings);
  return strings[0] ?? null;
}

function collectStrings(value: unknown, out: string[]): void {
  if (typeof value === 'string') {
    const t = value.trim();
    if (t.length > 0) out.push(t);
    return;
  }
  if (Array.isArray(value)) {
    for (const item of value) {
      collectStrings(item, out);
    }
    return;
  }
  if (typeof value === 'object' && value !== null) {
    for (const v of Object.values(value)) {
      collectStrings(v, out);
    }
  }
}
