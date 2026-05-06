import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

const ANDROID_DEFAULT_CHANNEL = 'default';

/**
 * Request notification permission and ensure Android default channel exists.
 * Returns whether alerts can be shown (granted).
 */
export async function ensurePushPermission(): Promise<boolean> {
  if (Platform.OS === 'web') return false;

  const existing = await Notifications.getPermissionsAsync();
  let status = existing.status;

  if (status !== 'granted') {
    const req = await Notifications.requestPermissionsAsync({
      ios: {
        allowAlert: true,
        allowBadge: true,
        allowSound: true,
      },
    });
    status = req.status;
  }

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync(ANDROID_DEFAULT_CHANNEL, {
      name: 'Default',
      importance: Notifications.AndroidImportance.DEFAULT,
    });
  }

  return status === 'granted';
}
