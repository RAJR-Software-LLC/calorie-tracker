/** YYYY-MM-DD in local calendar (matches v0 `formatDate`). */
export function formatDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Calendar date `YYYY-MM-DD` for an instant in an IANA timezone (e.g. `America/New_York`).
 * Built from `formatToParts` so Hermes/Android always sends strict ASCII `YYYY-MM-DD` (some
 * `Intl` `format()` outputs are not safe for strict Zod / regex validators).
 */
export function formatDateInTimeZone(date: Date, timeZone: string): string {
  const tz = timeZone?.trim() || 'UTC';
  try {
    const dtf = new Intl.DateTimeFormat('en-US', {
      timeZone: tz,
      year: 'numeric',
      month: 'numeric',
      day: 'numeric',
    });
    const parts = dtf.formatToParts(date);
    const y = parts.find((p) => p.type === 'year')?.value;
    const mo = parts.find((p) => p.type === 'month')?.value;
    const d = parts.find((p) => p.type === 'day')?.value;
    if (y === undefined || mo === undefined || d === undefined) {
      return formatDate(date);
    }
    const mi = String(Number.parseInt(mo, 10)).padStart(2, '0');
    const di = String(Number.parseInt(d, 10)).padStart(2, '0');
    return `${y}-${mi}-${di}`;
  } catch {
    return formatDate(date);
  }
}
