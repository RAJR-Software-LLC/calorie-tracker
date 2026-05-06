import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import { deletePushToken, postPushToken } from '@/lib/api';
import { ApiError } from '@/lib/api/errors';
import { captureMonitoringError } from '@/lib/monitoring';

import { ensurePushPermission } from './permissions';

export interface StoredPushTokenDoc {
  id: string;
  expoToken: string;
  appVersion: string | null;
}

function keyDoc(uid: string): string {
  return `pushTokenDoc:${uid}`;
}

function keyPendingDelete(uid: string): string {
  return `pushTokenPendingDelete:${uid}`;
}

function getAppVersion(): string | null {
  return Constants.expoConfig?.version ?? null;
}

function getProjectId(): string | undefined {
  const extra = Constants.expoConfig?.extra as { eas?: { projectId?: string } } | undefined;
  return extra?.eas?.projectId;
}

/**
 * Remove server-side push registration and local doc; best-effort if offline (pending retry).
 */
export async function unregisterPushToken(uid: string): Promise<void> {
  const raw = await AsyncStorage.getItem(keyDoc(uid));
  if (!raw) {
    await AsyncStorage.removeItem(keyPendingDelete(uid));
    return;
  }

  let doc: StoredPushTokenDoc;
  try {
    doc = JSON.parse(raw) as StoredPushTokenDoc;
  } catch {
    await AsyncStorage.removeItem(keyDoc(uid));
    return;
  }

  try {
    await deletePushToken(doc.id);
    await AsyncStorage.removeItem(keyDoc(uid));
    await AsyncStorage.removeItem(keyPendingDelete(uid));
  } catch (e) {
    if (e instanceof ApiError && (e.status === 404 || e.status === 410)) {
      await AsyncStorage.removeItem(keyDoc(uid));
      await AsyncStorage.removeItem(keyPendingDelete(uid));
      return;
    }
    await AsyncStorage.setItem(keyPendingDelete(uid), '1');
    captureMonitoringError(e, 'notifications/unregister_push_token', { uid });
    throw e;
  }
}

export async function markPendingPushSync(uid: string): Promise<void> {
  await AsyncStorage.setItem(`pushTokenPendingSync:${uid}`, new Date().toISOString());
}

/**
 * POST `/me/push-tokens` when enabled; skips simulators and missing EAS project id.
 */
export async function registerPushToken(uid: string): Promise<void> {
  if (Platform.OS === 'web') return;

  if (!Device.isDevice) {
    return;
  }

  const projectId = getProjectId();
  if (!projectId) {
    captureMonitoringError(
      new Error('Missing EAS projectId in app config'),
      'notifications/push_token_no_project_id',
      { uid }
    );
    return;
  }

  try {
    const granted = await ensurePushPermission();
    if (!granted) {
      return;
    }

    const tokenResponse = await Notifications.getExpoPushTokenAsync({ projectId });
    const expoToken = tokenResponse.data;
    const appVersion = getAppVersion();

    const existingRaw = await AsyncStorage.getItem(keyDoc(uid));
    let existing: StoredPushTokenDoc | null = null;
    if (existingRaw) {
      try {
        existing = JSON.parse(existingRaw) as StoredPushTokenDoc;
      } catch {
        existing = null;
      }
    }

    if (
      existing &&
      existing.expoToken === expoToken &&
      existing.appVersion === appVersion &&
      existing.id
    ) {
      await AsyncStorage.removeItem(`pushTokenPendingSync:${uid}`);
      return;
    }

    if (existing?.id) {
      try {
        await deletePushToken(existing.id);
      } catch (e) {
        if (!(e instanceof ApiError && (e.status === 404 || e.status === 410))) {
          captureMonitoringError(e, 'notifications/push_token_rotate_delete', { uid });
        }
      }
    }

    const platform = Platform.OS === 'ios' ? 'ios' : 'android';
    const res = await postPushToken({
      token: expoToken,
      platform,
      appVersion: appVersion ?? undefined,
    });

    const next: StoredPushTokenDoc = {
      id: res.id,
      expoToken,
      appVersion,
    };
    await AsyncStorage.setItem(keyDoc(uid), JSON.stringify(next));
    await AsyncStorage.removeItem(`pushTokenPendingSync:${uid}`);
  } catch (e) {
    await markPendingPushSync(uid);
    captureMonitoringError(e, 'notifications/register_push_token', { uid });
  }
}

/**
 * Flush pending token DELETE (after failed sign-out) then register when applicable.
 */
export async function flushPendingPushSync(uid: string): Promise<void> {
  const pendingDelete = await AsyncStorage.getItem(keyPendingDelete(uid));
  if (pendingDelete === '1') {
    const raw = await AsyncStorage.getItem(keyDoc(uid));
    if (raw) {
      try {
        const doc = JSON.parse(raw) as StoredPushTokenDoc;
        await deletePushToken(doc.id);
        await AsyncStorage.removeItem(keyDoc(uid));
        await AsyncStorage.removeItem(keyPendingDelete(uid));
      } catch (e) {
        if (e instanceof ApiError && (e.status === 404 || e.status === 410)) {
          await AsyncStorage.removeItem(keyDoc(uid));
          await AsyncStorage.removeItem(keyPendingDelete(uid));
        } else {
          captureMonitoringError(e, 'notifications/flush_pending_push_delete', { uid });
        }
      }
    } else {
      await AsyncStorage.removeItem(keyPendingDelete(uid));
    }
  }

  const pendingRegister = await AsyncStorage.getItem(`pushTokenPendingSync:${uid}`);
  if (pendingRegister) {
    await registerPushToken(uid);
  }
}
