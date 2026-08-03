import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';

import { ApiError } from '@/lib/api/errors';
import {
  FeedbackAttachmentError,
  isFeedbackMediaLibraryPermissionDenied,
  isLikelyOfflineError,
  parseAllowedSignedUploadUrl,
  pickFeedbackImageFromLibrary,
  toUserFeedbackAttachmentMessage,
  uploadFeedbackAttachment,
  uploadFeedbackAttachments,
} from './attachments';

jest.mock('@/lib/api', () => ({
  postFeedbackAttachmentUploadUrl: jest.fn(),
  postFeedbackAttachmentComplete: jest.fn(),
}));

jest.mock('expo-image-picker', () => ({
  getMediaLibraryPermissionsAsync: jest.fn(),
  requestMediaLibraryPermissionsAsync: jest.fn(),
  launchImageLibraryAsync: jest.fn(),
}));

jest.mock('expo-image-manipulator', () => ({
  manipulateAsync: jest.fn(),
  SaveFormat: { JPEG: 'jpeg', PNG: 'png', WEBP: 'webp' },
}));

const api = jest.requireMock('@/lib/api') as {
  postFeedbackAttachmentUploadUrl: jest.Mock;
  postFeedbackAttachmentComplete: jest.Mock;
};

describe('isFeedbackMediaLibraryPermissionDenied', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('is true only for denied status', async () => {
    (ImagePicker.getMediaLibraryPermissionsAsync as jest.Mock).mockResolvedValue({
      status: 'denied',
    });
    await expect(isFeedbackMediaLibraryPermissionDenied()).resolves.toBe(true);

    (ImagePicker.getMediaLibraryPermissionsAsync as jest.Mock).mockResolvedValue({
      status: 'undetermined',
    });
    await expect(isFeedbackMediaLibraryPermissionDenied()).resolves.toBe(false);

    (ImagePicker.getMediaLibraryPermissionsAsync as jest.Mock).mockResolvedValue({
      status: 'granted',
    });
    await expect(isFeedbackMediaLibraryPermissionDenied()).resolves.toBe(false);
  });
});

describe('pickFeedbackImageFromLibrary', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('throws when permission denied', async () => {
    (ImagePicker.requestMediaLibraryPermissionsAsync as jest.Mock).mockResolvedValue({
      status: 'denied',
    });
    await expect(pickFeedbackImageFromLibrary()).rejects.toMatchObject({
      code: 'permission-denied',
    });
  });

  it('returns null when cancelled', async () => {
    (ImagePicker.requestMediaLibraryPermissionsAsync as jest.Mock).mockResolvedValue({
      status: 'granted',
    });
    (ImagePicker.launchImageLibraryAsync as jest.Mock).mockResolvedValue({
      canceled: true,
      assets: null,
    });
    await expect(pickFeedbackImageFromLibrary()).resolves.toBeNull();
  });

  it('returns local image when picked', async () => {
    (ImagePicker.requestMediaLibraryPermissionsAsync as jest.Mock).mockResolvedValue({
      status: 'granted',
    });
    (ImagePicker.launchImageLibraryAsync as jest.Mock).mockResolvedValue({
      canceled: false,
      assets: [{ uri: 'file:///shot.png' }],
    });
    const picked = await pickFeedbackImageFromLibrary();
    expect(picked?.uri).toBe('file:///shot.png');
    expect(picked?.contentType).toBe('image/jpeg');
  });
});

describe('uploadFeedbackAttachment', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (ImageManipulator.manipulateAsync as jest.Mock).mockResolvedValue({
      uri: 'file:///prepared.jpg',
    });
    global.fetch = jest.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url.startsWith('file://')) {
        return {
          ok: true,
          blob: async () => ({
            size: 1024,
            arrayBuffer: async () => new ArrayBuffer(8),
          }),
        } as unknown as Response;
      }
      if (init?.method === 'PUT') {
        return { ok: true, status: 200, headers: { get: () => null } } as unknown as Response;
      }
      return { ok: false, status: 500 } as unknown as Response;
    }) as typeof fetch;
  });

  it('runs upload-url → PUT → complete with server storagePath', async () => {
    api.postFeedbackAttachmentUploadUrl.mockResolvedValue({
      uploadUrl: 'https://storage.googleapis.com/bucket/object?X-Goog-Signature=abc',
      storagePath: 'feedback-attachments/u1/fb-1/abc.jpg',
      contentType: 'image/jpeg',
      expiresAt: '2099-01-01T00:00:00.000Z',
    });
    api.postFeedbackAttachmentComplete.mockResolvedValue(undefined);

    const result = await uploadFeedbackAttachment('fb-1', {
      localId: 'local-1',
      uri: 'file:///shot.png',
      contentType: 'image/jpeg',
    });

    expect(result.storagePath).toBe('feedback-attachments/u1/fb-1/abc.jpg');
    expect(api.postFeedbackAttachmentUploadUrl).toHaveBeenCalledWith('fb-1', {
      contentType: 'image/jpeg',
    });
    expect(api.postFeedbackAttachmentComplete).toHaveBeenCalledWith('fb-1', {
      storagePath: 'feedback-attachments/u1/fb-1/abc.jpg',
    });
  });

  it('rejects oversized blobs', async () => {
    global.fetch = jest.fn(async () => ({
      ok: true,
      blob: async () => ({ size: 6 * 1024 * 1024 }),
    })) as unknown as typeof fetch;

    await expect(
      uploadFeedbackAttachment('fb-1', {
        localId: 'local-1',
        uri: 'file:///big.png',
        contentType: 'image/jpeg',
      })
    ).rejects.toMatchObject({ code: 'too-large' });
  });
});

describe('uploadFeedbackAttachments', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (ImageManipulator.manipulateAsync as jest.Mock).mockResolvedValue({
      uri: 'file:///prepared.jpg',
    });
  });

  it('continues after a failure and reports per-image results', async () => {
    let call = 0;
    api.postFeedbackAttachmentUploadUrl.mockImplementation(async () => {
      call += 1;
      if (call === 1) {
        throw new ApiError(400, 'bad image');
      }
      return {
        uploadUrl: 'https://storage.googleapis.com/bucket/object?X-Goog-Signature=abc',
        storagePath: `feedback-attachments/u1/fb-1/${call}.jpg`,
        contentType: 'image/jpeg',
        expiresAt: '2099-01-01T00:00:00.000Z',
      };
    });
    api.postFeedbackAttachmentComplete.mockResolvedValue(undefined);
    global.fetch = jest.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url.startsWith('file://')) {
        return {
          ok: true,
          blob: async () => ({
            size: 100,
            arrayBuffer: async () => new ArrayBuffer(8),
          }),
        } as unknown as Response;
      }
      if (init?.method === 'PUT') {
        return { ok: true, status: 200, headers: { get: () => null } } as unknown as Response;
      }
      return { ok: false } as unknown as Response;
    }) as typeof fetch;

    const results = await uploadFeedbackAttachments('fb-1', [
      { localId: 'a', uri: 'file:///a.png', contentType: 'image/jpeg' },
      { localId: 'b', uri: 'file:///b.png', contentType: 'image/jpeg' },
    ]);

    expect(results[0]?.ok).toBe(false);
    expect(results[1]?.ok).toBe(true);
  });

  it('throws max-attachments when more than 3 images', async () => {
    await expect(
      uploadFeedbackAttachments('fb-1', [
        { localId: '1', uri: 'file:///1', contentType: 'image/jpeg' },
        { localId: '2', uri: 'file:///2', contentType: 'image/jpeg' },
        { localId: '3', uri: 'file:///3', contentType: 'image/jpeg' },
        { localId: '4', uri: 'file:///4', contentType: 'image/jpeg' },
      ])
    ).rejects.toMatchObject({ code: 'max-attachments' });
  });
});

describe('helpers', () => {
  it('maps attachment errors to user copy', () => {
    expect(
      toUserFeedbackAttachmentMessage(new FeedbackAttachmentError('permission-denied'))
    ).toContain('Photo library');
    expect(toUserFeedbackAttachmentMessage(new ApiError(409, 'limit'))).toContain('3 screenshots');
  });

  it('detects offline-like errors', () => {
    expect(isLikelyOfflineError(new TypeError('Network request failed'))).toBe(true);
    expect(isLikelyOfflineError(new Error('offline'))).toBe(true);
    expect(isLikelyOfflineError(new Error('validation'))).toBe(false);
  });

  it('allows only https path-style storage.googleapis.com upload URLs', () => {
    const url = 'https://storage.googleapis.com/bucket/object?X-Goog-Signature=abc';
    expect(parseAllowedSignedUploadUrl(url)).toBe(url);
    expect(() => parseAllowedSignedUploadUrl('https://evil.example/put')).toThrow(
      FeedbackAttachmentError
    );
    expect(() =>
      parseAllowedSignedUploadUrl('https://bucket.storage.googleapis.com/object')
    ).toThrow(FeedbackAttachmentError);
    expect(() => parseAllowedSignedUploadUrl('http://storage.googleapis.com/bucket/x')).toThrow(
      FeedbackAttachmentError
    );
  });
});
