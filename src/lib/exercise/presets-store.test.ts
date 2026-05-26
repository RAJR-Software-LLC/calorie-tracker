/* eslint-disable import/first -- jest.mock must run before importing modules under test */
jest.mock('@/lib/api', () => ({
  getExercisePresets: jest.fn(),
}));

import AsyncStorage from '@react-native-async-storage/async-storage';

import { getExercisePresets } from '@/lib/api';
import {
  clearExercisePresetsCache,
  getCachedExercisePresets,
  loadExercisePresets,
} from './presets-store';

describe('exercise presets cache', () => {
  beforeEach(async () => {
    jest.resetAllMocks();
    await AsyncStorage.clear();
  });

  it('writes cache when none exists and serves network result', async () => {
    (getExercisePresets as jest.Mock).mockResolvedValue({
      version: 1,
      presets: [],
    });

    const first = await loadExercisePresets();
    expect(first.version).toBe(1);
    expect((getExercisePresets as jest.Mock).mock.calls).toHaveLength(1);
  });

  it('falls back to cached data when network fails', async () => {
    jest.spyOn(AsyncStorage, 'getItem').mockResolvedValueOnce(
      JSON.stringify({
        version: 1,
        fetchedAt: '2026-05-08T00:00:00.000Z',
        presets: [{ id: 'cycling' }],
      })
    );
    (getExercisePresets as jest.Mock).mockRejectedValue(new Error('offline'));
    const fallback = await loadExercisePresets();
    expect(fallback.presets[0]?.id).toBe('cycling');
  });

  it('supports cache clear', async () => {
    (getExercisePresets as jest.Mock).mockResolvedValue({
      version: 1,
      presets: [],
    });
    await loadExercisePresets();
    await clearExercisePresetsCache();
    expect(await getCachedExercisePresets()).toBeNull();
  });
});
