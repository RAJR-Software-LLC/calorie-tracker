import AsyncStorage from '@react-native-async-storage/async-storage';

import { deletePushToken, postPushToken } from '@/lib/api/v1';
import { registerPushToken, unregisterPushToken } from '@/lib/notifications/push-token';

jest.mock('@/lib/api/v1', () => ({
  postPushToken: jest.fn(),
  deletePushToken: jest.fn(),
}));

jest.mock('expo-device', () => ({
  isDevice: true,
}));

jest.mock('expo-notifications', () => ({
  getPermissionsAsync: jest.fn(async () => ({ status: 'granted' })),
  requestPermissionsAsync: jest.fn(async () => ({ status: 'granted' })),
  setNotificationChannelAsync: jest.fn(async () => {}),
  AndroidImportance: { DEFAULT: 3 },
  getExpoPushTokenAsync: jest.fn(async () => ({ data: 'ExponentPushToken[x]' })),
}));

jest.mock('expo-constants', () => ({
  __esModule: true,
  default: {
    expoConfig: {
      version: '1.0.0',
      extra: { eas: { projectId: 'test-project-id' } },
    },
  },
}));

jest.mock('@/lib/notifications/permissions', () => ({
  ensurePushPermission: jest.fn(async () => true),
}));

describe('push-token registration', () => {
  beforeEach(async () => {
    jest.clearAllMocks();
    await AsyncStorage.removeItem('pushTokenDoc:uid-a');
    await AsyncStorage.removeItem('pushTokenPendingDelete:uid-a');
    await AsyncStorage.removeItem('pushTokenPendingSync:uid-a');
  });

  it('POSTs token and persists doc id', async () => {
    (postPushToken as jest.Mock).mockResolvedValue({ id: 'doc-1' });

    await registerPushToken('uid-a');

    expect(postPushToken).toHaveBeenCalledWith({
      token: 'ExponentPushToken[x]',
      platform: expect.any(String),
      appVersion: '1.0.0',
    });

    const stored = await AsyncStorage.getItem('pushTokenDoc:uid-a');
    expect(stored).toBeTruthy();
    expect(JSON.parse(stored as string).id).toBe('doc-1');
  });

  it('skips POST when token and version unchanged', async () => {
    (postPushToken as jest.Mock).mockResolvedValue({ id: 'doc-1' });

    await registerPushToken('uid-a');
    await registerPushToken('uid-a');

    expect(postPushToken).toHaveBeenCalledTimes(1);
  });

  it('unregister deletes remote token and clears storage', async () => {
    (postPushToken as jest.Mock).mockResolvedValue({ id: 'doc-1' });
    await registerPushToken('uid-a');

    await unregisterPushToken('uid-a');

    expect(deletePushToken).toHaveBeenCalledWith('doc-1');
    expect(await AsyncStorage.getItem('pushTokenDoc:uid-a')).toBeNull();
  });
});
