import { useEffect, useRef } from 'react';
import { AppState, type AppStateStatus } from 'react-native';
import { useQueryClient, type QueryClient } from '@tanstack/react-query';

/** Resume refetch only after a meaningful background (plan: N = 5 minutes). */
export const APP_RESUME_REVALIDATE_MS = 5 * 60_000;

type ResumeState = {
  backgroundedAt: number | null;
  queryClient: QueryClient;
};

function handleAppStateChange(stateRef: { current: ResumeState }, next: AppStateStatus): void {
  const state = stateRef.current;
  if (next === 'background' || next === 'inactive') {
    if (state.backgroundedAt == null) {
      state.backgroundedAt = Date.now();
    }
    return;
  }
  if (next !== 'active') return;

  const started = state.backgroundedAt;
  state.backgroundedAt = null;
  if (started == null) return;
  if (Date.now() - started < APP_RESUME_REVALIDATE_MS) return;

  void state.queryClient.refetchQueries({
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
  const stateRef = useRef<ResumeState>({
    backgroundedAt: null,
    queryClient,
  });
  stateRef.current.queryClient = queryClient;

  useEffect(() => {
    if (!enabled) return;

    const onChange = handleAppStateChange.bind(null, stateRef);
    const sub = AppState.addEventListener('change', onChange);
    return () => sub.remove();
  }, [enabled]);
}
