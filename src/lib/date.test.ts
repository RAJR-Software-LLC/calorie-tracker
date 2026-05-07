import { formatDate, formatDateInTimeZone } from './date';

describe('formatDateInTimeZone', () => {
  it('returns YYYY-MM-DD for a fixed instant in UTC', () => {
    const d = new Date('2026-05-06T12:00:00.000Z');
    expect(formatDateInTimeZone(d, 'UTC')).toBe('2026-05-06');
  });

  it('pads single-digit month and day (Louisville)', () => {
    const d = new Date('2026-03-05T12:00:00.000Z');
    expect(formatDateInTimeZone(d, 'America/Kentucky/Louisville')).toBe('2026-03-05');
  });

  it('can differ by calendar day across timezones for the same instant', () => {
    const d = new Date('2026-05-05T20:00:00.000Z');
    expect(formatDateInTimeZone(d, 'America/New_York')).toBe('2026-05-05');
    expect(formatDateInTimeZone(d, 'Asia/Tokyo')).toBe('2026-05-06');
  });

  it('falls back to local formatDate on invalid timezone', () => {
    const d = new Date('2026-07-01T12:00:00.000Z');
    const local = formatDate(d);
    expect(formatDateInTimeZone(d, 'Not/A_Real_Zone')).toBe(local);
  });
});
