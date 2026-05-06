import * as Notifications from 'expo-notifications';
import type { User } from 'firebase/auth';
import { useEffect, useRef } from 'react';
import type { Router } from 'expo-router';
import { Platform } from 'react-native';

import { routeFromDeepLink } from './deep-link';

let pendingDeepLink: string | null = null;
let handledColdStartResponse = false;

export function installNotificationHandler(): void {
  if (Platform.OS === 'web') return;
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
    }),
  });
}

function extractDeepLink(data: Record<string, unknown> | undefined): string | undefined {
  if (!data || typeof data !== 'object') return undefined;
  const v = data.deepLink;
  return typeof v === 'string' ? v : undefined;
}

function handleTapData(
  data: Record<string, unknown> | undefined,
  user: User | null,
  router: Router
): void {
  const deepLink = extractDeepLink(data);
  if (!user) {
    pendingDeepLink = deepLink ?? null;
    return;
  }
  routeFromDeepLink(deepLink, router);
}

/**
 * Foreground/background taps + cold start last response; defers routing until auth restores.
 */
export function useNotificationTapRouter(user: User | null, router: Router): void {
  const userRef = useRef(user);
  userRef.current = user;

  useEffect(() => {
    if (Platform.OS === 'web') return;
    const sub = Notifications.addNotificationResponseReceivedListener((response) => {
      handleTapData(
        response.notification.request.content.data as Record<string, unknown> | undefined,
        userRef.current,
        router
      );
    });
    return () => sub.remove();
  }, [router]);

  useEffect(() => {
    if (Platform.OS === 'web') return;
    if (!user) return;
    if (pendingDeepLink !== null) {
      routeFromDeepLink(pendingDeepLink, router);
      pendingDeepLink = null;
    }
  }, [user, router]);

  useEffect(() => {
    if (Platform.OS === 'web') return;
    if (handledColdStartResponse) return;
    let cancelled = false;
    void Notifications.getLastNotificationResponseAsync().then((response) => {
      if (cancelled || !response?.notification) return;
      handledColdStartResponse = true;
      handleTapData(
        response.notification.request.content.data as Record<string, unknown> | undefined,
        userRef.current,
        router
      );
    });
    return () => {
      cancelled = true;
    };
  }, [router]);
}
