import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';

import { ApiError } from '@/lib/api/errors';
import type { NotificationsSettings, UserDocument } from '@/types';

import {
  pickProfilePhotoFromLibrary,
  ProfilePhotoError,
  removeProfilePhoto,
  toUserProfilePhotoMessage,
  uploadProfilePhoto,
} from './upload';

jest.mock('@/lib/api', () => ({
  postProfilePhotoUploadUrl: jest.fn(),
  postProfilePhotoComplete: jest.fn(),
  deleteProfilePhoto: jest.fn(),
  getMe: jest.fn(),
}));

jest.mock('expo-image-picker', () => ({
  requestMediaLibraryPermissionsAsync: jest.fn(),
  launchImageLibraryAsync: jest.fn(),
}));

jest.mock('expo-image-manipulator', () => ({
  manipulateAsync: jest.fn(),
  SaveFormat: { JPEG: 'jpeg', PNG: 'png', WEBP: 'webp' },
}));

function makeNotifications(): NotificationsSettings {
  return {
    enabled: false,
    reminderTimes: ['08:30'],
    categories: {
      mealReminders: true,
      goalStatus: true,
      streaks: true,
      familyEvents: true,
      accountAdmin: true,
    },
    quietHours: null,
    timezone: 'UTC',
    goalStatusTime: '19:00',
  };
}

function makeUser(overrides: Partial<UserDocument> = {}): UserDocument {
  return {
    displayName: 'Tester',
    email: 'test@example.com',
    createdAt: '2026-01-01T00:00:00.000Z',
    profile: {
      heightCm: null,
      weightKg: null,
      age: null,
      sex: null,
      activityLevel: null,
    },
    maintenanceCalories: null,
    calorieGoal: null,
    goalType: null,
    familyId: null,
    notifications: makeNotifications(),
    ...overrides,
  };
}

describe('pickProfilePhotoFromLibrary', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('throws ProfilePhotoError when permission denied', async () => {
    (ImagePicker.requestMediaLibraryPermissionsAsync as jest.Mock).mockResolvedValue({
      status: 'denied',
    });

    await expect(pickProfilePhotoFromLibrary()).rejects.toMatchObject({
      code: 'permission-denied',
    });
    expect(ImagePicker.launchImageLibraryAsync).not.toHaveBeenCalled();
  });

  it('returns null when user cancels picker', async () => {
    (ImagePicker.requestMediaLibraryPermissionsAsync as jest.Mock).mockResolvedValue({
      status: 'granted',
    });
    (ImagePicker.launchImageLibraryAsync as jest.Mock).mockResolvedValue({
      canceled: true,
      assets: null,
    });

    await expect(pickProfilePhotoFromLibrary()).resolves.toBeNull();
  });
});

describe('uploadProfilePhoto', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    jest.clearAllMocks();
    const { postProfilePhotoUploadUrl, postProfilePhotoComplete } = jest.requireMock(
      '@/lib/api'
    ) as {
      postProfilePhotoUploadUrl: jest.Mock;
      postProfilePhotoComplete: jest.Mock;
    };
    postProfilePhotoUploadUrl.mockReset();
    postProfilePhotoComplete.mockReset();
    (ImageManipulator.manipulateAsync as jest.Mock).mockImplementation(async (uri: string) => ({
      uri,
    }));
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('returns null when picker is cancelled', async () => {
    (ImagePicker.requestMediaLibraryPermissionsAsync as jest.Mock).mockResolvedValue({
      status: 'granted',
    });
    (ImagePicker.launchImageLibraryAsync as jest.Mock).mockResolvedValue({
      canceled: true,
      assets: null,
    });

    await expect(uploadProfilePhoto()).resolves.toBeNull();
  });

  it('uploads blob then completes and returns user', async () => {
    (ImagePicker.requestMediaLibraryPermissionsAsync as jest.Mock).mockResolvedValue({
      status: 'granted',
    });
    (ImagePicker.launchImageLibraryAsync as jest.Mock).mockResolvedValue({
      canceled: false,
      assets: [{ uri: 'file://picked.jpg' }],
    });

    const me = makeUser({
      profilePhoto: {
        storagePath: 'profile-photos/u1/x.jpg',
        contentType: 'image/jpeg',
        updatedAt: '2026-01-02T00:00:00.000Z',
        downloadUrl: 'https://signed-read.example/img',
      },
    });

    const { postProfilePhotoUploadUrl, postProfilePhotoComplete } = jest.requireMock(
      '@/lib/api'
    ) as {
      postProfilePhotoUploadUrl: jest.Mock;
      postProfilePhotoComplete: jest.Mock;
    };

    const future = new Date(Date.now() + 60_000).toISOString();
    postProfilePhotoUploadUrl.mockResolvedValue({
      uploadUrl: 'https://signed-put.example/put',
      storagePath: 'profile-photos/u1/x.jpg',
      contentType: 'image/jpeg',
      expiresAt: future,
    });
    postProfilePhotoComplete.mockResolvedValue(me);

    const smallBlob = new Blob([new Uint8Array(500)]);
    global.fetch = jest
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        blob: async () => smallBlob,
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
      }) as unknown as typeof fetch;

    const result = await uploadProfilePhoto();

    expect(result).toEqual(me);
    expect(postProfilePhotoUploadUrl).toHaveBeenCalledWith({ contentType: 'image/jpeg' });
    expect(postProfilePhotoComplete).toHaveBeenCalledWith({
      storagePath: 'profile-photos/u1/x.jpg',
    });
    const fetchMock = global.fetch as jest.Mock;
    expect(fetchMock).toHaveBeenCalledTimes(2);
    const putCall = fetchMock.mock.calls[1];
    expect(putCall[0]).toBe('https://signed-put.example/put');
    expect(putCall[1].method).toBe('PUT');
    expect(putCall[1].headers['Content-Type']).toBe('image/jpeg');
    expect(putCall[1].body).toBe(smallBlob);
  });

  it('throws too-large when blob exceeds max', async () => {
    (ImagePicker.requestMediaLibraryPermissionsAsync as jest.Mock).mockResolvedValue({
      status: 'granted',
    });
    (ImagePicker.launchImageLibraryAsync as jest.Mock).mockResolvedValue({
      canceled: false,
      assets: [{ uri: 'file://big.jpg' }],
    });

    const { postProfilePhotoUploadUrl } = jest.requireMock('@/lib/api') as {
      postProfilePhotoUploadUrl: jest.Mock;
    };
    postProfilePhotoUploadUrl.mockResolvedValue({
      uploadUrl: 'https://signed-put.example/put',
      storagePath: 'profile-photos/u1/x.jpg',
      contentType: 'image/jpeg',
      expiresAt: new Date(Date.now() + 60_000).toISOString(),
    });

    const huge = new Blob([new Uint8Array(6 * 1024 * 1024)]);
    global.fetch = jest.fn().mockResolvedValueOnce({
      ok: true,
      blob: async () => huge,
    }) as unknown as typeof fetch;

    await expect(uploadProfilePhoto()).rejects.toMatchObject({ code: 'too-large' });
  });

  it('throws gcs-upload-failed when PUT is not ok', async () => {
    (ImagePicker.requestMediaLibraryPermissionsAsync as jest.Mock).mockResolvedValue({
      status: 'granted',
    });
    (ImagePicker.launchImageLibraryAsync as jest.Mock).mockResolvedValue({
      canceled: false,
      assets: [{ uri: 'file://picked.jpg' }],
    });

    const { postProfilePhotoUploadUrl } = jest.requireMock('@/lib/api') as {
      postProfilePhotoUploadUrl: jest.Mock;
    };
    postProfilePhotoUploadUrl.mockResolvedValue({
      uploadUrl: 'https://signed-put.example/put',
      storagePath: 'profile-photos/u1/x.jpg',
      contentType: 'image/jpeg',
      expiresAt: new Date(Date.now() + 60_000).toISOString(),
    });

    const smallBlob = new Blob([new Uint8Array(100)]);
    global.fetch = jest
      .fn()
      .mockResolvedValueOnce({ ok: true, blob: async () => smallBlob })
      .mockResolvedValueOnce({ ok: false, status: 403 })
      .mockResolvedValueOnce({ ok: false, status: 403 }) as unknown as typeof fetch;

    await expect(uploadProfilePhoto()).rejects.toMatchObject({
      code: 'gcs-upload-failed',
      httpStatus: 403,
    });
  });

  it('retries PUT without content-type header on signed-url 403', async () => {
    (ImagePicker.requestMediaLibraryPermissionsAsync as jest.Mock).mockResolvedValue({
      status: 'granted',
    });
    (ImagePicker.launchImageLibraryAsync as jest.Mock).mockResolvedValue({
      canceled: false,
      assets: [{ uri: 'file://picked.jpg' }],
    });

    const me = makeUser({
      profilePhoto: {
        storagePath: 'profile-photos/u1/x.jpg',
        contentType: 'image/jpeg',
        updatedAt: '2026-01-02T00:00:00.000Z',
        downloadUrl: 'https://signed-read.example/img',
      },
    });
    const { postProfilePhotoUploadUrl, postProfilePhotoComplete } = jest.requireMock(
      '@/lib/api'
    ) as {
      postProfilePhotoUploadUrl: jest.Mock;
      postProfilePhotoComplete: jest.Mock;
    };
    postProfilePhotoUploadUrl.mockResolvedValue({
      uploadUrl: 'https://signed-put.example/put',
      storagePath: 'profile-photos/u1/x.jpg',
      contentType: 'image/jpeg',
      expiresAt: new Date(Date.now() + 60_000).toISOString(),
    });
    postProfilePhotoComplete.mockResolvedValue(me);

    const smallBlob = new Blob([new Uint8Array(100)]);
    global.fetch = jest
      .fn()
      .mockResolvedValueOnce({ ok: true, blob: async () => smallBlob })
      .mockResolvedValueOnce({ ok: false, status: 403 })
      .mockResolvedValueOnce({ ok: true, status: 200 }) as unknown as typeof fetch;

    const result = await uploadProfilePhoto();
    expect(result).toEqual(me);

    const fetchMock = global.fetch as jest.Mock;
    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(fetchMock.mock.calls[1][1]).toMatchObject({
      method: 'PUT',
      headers: { 'Content-Type': 'image/jpeg' },
    });
    expect(fetchMock.mock.calls[2][1]).toMatchObject({
      method: 'PUT',
    });
    expect(fetchMock.mock.calls[2][1].headers).toBeUndefined();
  });
});

describe('removeProfilePhoto', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('calls delete then getMe', async () => {
    const { deleteProfilePhoto, getMe } = jest.requireMock('@/lib/api') as {
      deleteProfilePhoto: jest.Mock;
      getMe: jest.Mock;
    };
    const me = makeUser();
    getMe.mockResolvedValue(me);

    const result = await removeProfilePhoto();

    expect(deleteProfilePhoto).toHaveBeenCalledTimes(1);
    expect(getMe).toHaveBeenCalledTimes(1);
    expect(result).toEqual(me);
  });
});

describe('toUserProfilePhotoMessage', () => {
  it('maps ProfilePhotoError codes', () => {
    expect(toUserProfilePhotoMessage(new ProfilePhotoError('permission-denied'))).toContain(
      'library'
    );
    expect(toUserProfilePhotoMessage(new ProfilePhotoError('too-large'))).toContain('large');
    expect(toUserProfilePhotoMessage(new ProfilePhotoError('gcs-upload-failed'))).toContain(
      'upload'
    );
  });

  it('uses generic message for ApiError 400', () => {
    const err = new ApiError(400, 'Detailed server validation', {}, 'https://api/x');
    expect(toUserProfilePhotoMessage(err)).toBe("Couldn't save photo. Please try again.");
  });
});
