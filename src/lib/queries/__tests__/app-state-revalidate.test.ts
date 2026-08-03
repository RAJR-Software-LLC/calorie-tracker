import { APP_RESUME_REVALIDATE_MS } from '@/lib/queries/app-state-revalidate';

describe('app resume revalidate policy', () => {
  it('uses a 5 minute background threshold', () => {
    expect(APP_RESUME_REVALIDATE_MS).toBe(5 * 60_000);
  });
});
