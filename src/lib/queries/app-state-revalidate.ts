import { useEffect, useRef } from 'react';
import { AppState, type AppStateStatus } from 'react-native';
import { useQueryClient, type QueryClient } from '@tanstack/react-query';

/** Resume refetch only after a meaningful background (plan: N = 5 minutes). */
export const APP_RESUME_REVALIDATE_MS = 5 * 60_000;

function handleAppStateChange(
  next: AppStateStatus,
  backgroundedAt: { current: number | null },
  queryClient: QueryClient
): void {
  if (next === 'background' || next === 'inactive') {
    if (backgroundedAt.current == null) {
      backgroundedAt.current = Date.now();
    }
    return;
  }
  if (next !== 'active') return;

  const started = backgroundedAt.current;
  backgroundedAt.current = null;
  if (started == null) return;
  if (Date.now() - started < APP_RESUME_REVALIDATE_MS) return;

  void queryClient.refetchQueries({
    type: 'active',
    stale: true,
  });
}

/**
 * When the app returns to foreground after being backgrounded for at least
 * `APP_RESUME_REVALIDATE_MS`, refetch queries that are already stale.
 * Fresh queries are left alone (respects staleTime).
 */
export function useAppStateRevalidate(enabled = true): void {
  const queryClient = useQueryClient();
  const backgroundedAt = useRef<number | null>(null);

  useEffect(() => {
    if (!enabled) return;

    const onChange = (next: AppStateStatus) => {
      handleAppStateChange(next, backgroundedAt, queryClient);
    };

    const sub = AppState.addEventListener('change', onChange);
    return () => sub.remove();
  }, [enabled, queryClient]);
}
