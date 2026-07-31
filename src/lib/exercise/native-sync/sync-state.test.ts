import AsyncStorage from '@react-native-async-storage/async-storage';

import {
  getStableDeviceId,
  nativeSourceToExternalSource,
  readLocalCursor,
  resolveSyncCursor,
  writeLocalCursor,
} from './sync-state';

describe('exercise sync-state helpers', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  it('maps native sources to externalSource values', () => {
    expect(nativeSourceToExternalSource('healthkit')).toBe('apple_healthkit');
    expect(nativeSourceToExternalSource('health_connect')).toBe('health_connect');
  });

  it('persists a stable device id', async () => {
    const first = await getStableDeviceId();
    const second = await getStableDeviceId();
    expect(first).toBe(second);
    expect(first.length).toBeGreaterThan(0);
  });

  it('prefers server cursor over local and hydrates local cache', async () => {
    await writeLocalCursor('healthkit', { value: 'local-cursor' });
    const resolved = await resolveSyncCursor({
      source: 'healthkit',
      serverState: {
        platforms: {
          apple_healthkit: { cursor: 'server-cursor' },
        },
      },
    });
    expect(resolved).toEqual({ value: 'server-cursor' });
    expect(await readLocalCursor('healthkit')).toEqual({ value: 'server-cursor' });
  });

  it('falls back to local cursor when server has none', async () => {
    await writeLocalCursor('health_connect', { value: 'local-only' });
    const resolved = await resolveSyncCursor({
      source: 'health_connect',
      serverState: { platforms: {} },
    });
    expect(resolved).toEqual({ value: 'local-only' });
  });
});
