import * as Crypto from 'expo-crypto';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';

import { postFeedbackAttachmentComplete, postFeedbackAttachmentUploadUrl } from '@/lib/api';
import { ApiError } from '@/lib/api/errors';
import { toUserErrorMessage } from '@/lib/app-errors';
import type { FeedbackAttachmentContentType } from '@/types';

export const FEEDBACK_ATTACHMENT_MAX_BYTES = 5 * 1024 * 1024;
export const FEEDBACK_ATTACHMENT_MAX_COUNT = 3;

export type FeedbackAttachmentErrorCode =
  | 'permission-denied'
  | 'too-large'
  | 'max-attachments'
  | 'gcs-upload-failed'
  | 'no-image-uri'
  | 'unexpected';

export class FeedbackAttachmentError extends Error {
  readonly code: FeedbackAttachmentErrorCode;

  readonly httpStatus?: number;

  readonly debugMeta?: Record<string, unknown>;

  constructor(
    code: FeedbackAttachmentErrorCode,
    message?: string,
    httpStatus?: number,
    debugMeta?: Record<string, unknown>
  ) {
    super(message ?? code);
    this.name = 'FeedbackAttachmentError';
    this.code = code;
    this.httpStatus = httpStatus;
    this.debugMeta = debugMeta;
  }
}

export type LocalFeedbackImage = {
  /** Stable client id for progress UI */
  localId: string;
  uri: string;
  contentType: FeedbackAttachmentContentType;
};

export type FeedbackAttachmentUploadResult =
  | { localId: string; ok: true; storagePath: string }
  | { localId: string; ok: false; error: FeedbackAttachmentError };

function pathnameHash(pathname: string): string {
  let hash = 0;
  for (let i = 0; i < pathname.length; i += 1) {
    hash = (hash * 31 + pathname.charCodeAt(i)) >>> 0;
  }
  return hash.toString(16);
}

function uploadUrlFingerprint(uploadUrl: string): Record<string, unknown> {
  try {
    const u = new URL(uploadUrl);
    return {
      uploadUrlOrigin: u.origin,
      uploadPathLength: u.pathname.length,
      uploadPathHash: pathnameHash(u.pathname),
    };
  } catch {
    return { uploadUrlOrigin: 'invalid-url', uploadPathLength: 0, uploadPathHash: '0' };
  }
}

type PutAttemptSummary = {
  attempt: string;
  bodyType: 'blob' | 'arrayBuffer';
  headers: string[];
  ok: boolean;
  status?: number;
  networkError?: string;
};

/** Signed PUT targets from our API — reject anything outside Google Cloud Storage. */
export function parseAllowedSignedUploadUrl(uploadUrl: string): URL {
  let parsed: URL;
  try {
    parsed = new URL(uploadUrl);
  } catch {
    throw new FeedbackAttachmentError('unexpected', 'Invalid upload URL. Please try again.');
  }
  if (parsed.protocol !== 'https:') {
    throw new FeedbackAttachmentError('unexpected', 'Invalid upload URL. Please try again.');
  }
  const host = parsed.hostname.toLowerCase();
  const allowed =
    host === 'storage.googleapis.com' ||
    host.endsWith('.storage.googleapis.com') ||
    host === 'storage.cloud.google.com';
  if (!allowed) {
    throw new FeedbackAttachmentError('unexpected', 'Invalid upload URL. Please try again.');
  }
  return parsed;
}

async function attemptSignedPut(
  uploadUrl: string,
  body: Blob | ArrayBuffer,
  headers: Record<string, string>,
  attempt: string,
  bodyType: 'blob' | 'arrayBuffer'
): Promise<{ response?: Response; summary: PutAttemptSummary }> {
  const allowed = parseAllowedSignedUploadUrl(uploadUrl);
  // Reconstruct from allowlisted host parts so the PUT target is not a raw untrusted string.
  const safeUploadUrl = `https://${allowed.hostname}${allowed.pathname}${allowed.search}`;
  try {
    const response = await fetch(safeUploadUrl, { method: 'PUT', headers, body });
    return {
      response,
      summary: {
        attempt,
        bodyType,
        headers: Object.keys(headers),
        ok: response.ok,
        status: response.status,
      },
    };
  } catch (err) {
    return {
      response: undefined,
      summary: {
        attempt,
        bodyType,
        headers: Object.keys(headers),
        ok: false,
        networkError: err instanceof Error ? err.message : 'unknown-network-error',
      },
    };
  }
}

async function putToSignedUploadUrl(
  uploadUrl: string,
  contentType: string,
  body: Blob
): Promise<{ response?: Response; attempts: PutAttemptSummary[] }> {
  const attempts: PutAttemptSummary[] = [];
  const first = await attemptSignedPut(
    uploadUrl,
    body,
    { 'Content-Type': contentType },
    'blob-content-type',
    'blob'
  );
  attempts.push(first.summary);
  if (first.response?.ok) {
    return { response: first.response, attempts };
  }

  const arrayBufferFn = (body as Blob & { arrayBuffer?: () => Promise<ArrayBuffer> }).arrayBuffer;
  if (typeof arrayBufferFn !== 'function') {
    return { response: first.response, attempts };
  }

  const bodyBytes = await arrayBufferFn.call(body);
  const second = await attemptSignedPut(
    uploadUrl,
    bodyBytes,
    { 'Content-Type': contentType },
    'arraybuffer-content-type',
    'arrayBuffer'
  );
  attempts.push(second.summary);
  return { response: second.response, attempts };
}

function assertFreshUploadUrl(expiresAtIso: string): void {
  const t = Date.parse(expiresAtIso);
  if (!Number.isFinite(t) || Date.now() >= t) {
    throw new FeedbackAttachmentError('unexpected', 'Upload link expired. Please try again.');
  }
}

async function blobFromLocalUri(uri: string): Promise<Blob> {
  const res = await fetch(uri);
  if (!res.ok) {
    throw new FeedbackAttachmentError('no-image-uri', `Failed to read image: ${res.status}`);
  }
  return res.blob();
}

export function toUserFeedbackAttachmentMessage(err: unknown): string {
  if (err instanceof FeedbackAttachmentError) {
    switch (err.code) {
      case 'permission-denied':
        return 'Photo library access is required to attach screenshots.';
      case 'too-large':
        return 'That image is too large (max 5 MB). Try a smaller screenshot.';
      case 'max-attachments':
        return 'You can attach up to 3 screenshots per report.';
      case 'gcs-upload-failed':
        return "Couldn't upload that screenshot. Please try again.";
      case 'no-image-uri':
        return "Couldn't read the selected image. Please try again.";
      default:
        return "Couldn't upload screenshot. Please try again.";
    }
  }
  if (err instanceof ApiError) {
    if (err.status === 409) return 'You can attach up to 3 screenshots per report.';
    if (err.status === 400) return "Couldn't upload that screenshot. Please try a different image.";
  }
  return toUserErrorMessage(err, "Couldn't upload screenshot");
}

export const FEEDBACK_PHOTO_PERMISSION_MESSAGE =
  'Photo library access is required to attach screenshots. Enable it in Settings, then try again.';

/** True only when the OS has explicitly denied media-library access. */
export async function isFeedbackMediaLibraryPermissionDenied(): Promise<boolean> {
  const perm = await ImagePicker.getMediaLibraryPermissionsAsync();
  return perm.status === 'denied';
}

/**
 * Pick one image from the library (no crop). Caller enforces max count.
 */
export async function pickFeedbackImageFromLibrary(): Promise<LocalFeedbackImage | null> {
  const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (perm.status !== 'granted') {
    throw new FeedbackAttachmentError('permission-denied');
  }

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsEditing: false,
    quality: 1,
    exif: false,
    allowsMultipleSelection: false,
  });

  if (result.canceled || !result.assets?.length) {
    return null;
  }

  const asset = result.assets[0];
  const uri = asset?.uri;
  if (!uri) return null;

  return {
    localId: Crypto.randomUUID(),
    uri,
    contentType: 'image/jpeg',
  };
}

/** Re-encode to JPEG (strips EXIF) and downscale for upload. */
export async function prepareFeedbackImageForUpload(uri: string): Promise<string> {
  const out = await manipulateAsync(uri, [{ resize: { width: 1600 } }], {
    compress: 0.85,
    format: SaveFormat.JPEG,
  });
  return out.uri;
}

/**
 * Upload one local image: upload-url → PUT → complete.
 * Uses server-owned `storagePath` only.
 */
export async function uploadFeedbackAttachment(
  feedbackId: string,
  image: LocalFeedbackImage
): Promise<{ storagePath: string }> {
  const jpegUri = await prepareFeedbackImageForUpload(image.uri);
  const blob = await blobFromLocalUri(jpegUri);

  if (blob.size > FEEDBACK_ATTACHMENT_MAX_BYTES) {
    throw new FeedbackAttachmentError('too-large');
  }

  const contentType: FeedbackAttachmentContentType = 'image/jpeg';
  const session = await postFeedbackAttachmentUploadUrl(feedbackId, { contentType });
  assertFreshUploadUrl(session.expiresAt);

  const put = await putToSignedUploadUrl(session.uploadUrl, session.contentType, blob);
  const putRes = put.response;

  if (!putRes?.ok) {
    const debugMeta = {
      stage: 'signed-put',
      contentType: session.contentType,
      blobSize: blob.size,
      ...uploadUrlFingerprint(session.uploadUrl),
      uploadAttempts: put.attempts,
    };
    const attemptSummary = put.attempts
      .map((a) => `${a.attempt}:${a.status ?? a.networkError ?? 'no-response'}`)
      .join(', ');
    throw new FeedbackAttachmentError(
      'gcs-upload-failed',
      `GCS upload failed (${attemptSummary || 'no-attempts'})`,
      putRes?.status,
      debugMeta
    );
  }

  await postFeedbackAttachmentComplete(feedbackId, { storagePath: session.storagePath });
  return { storagePath: session.storagePath };
}

/**
 * Upload multiple images; continues after failures so the ticket remains usable.
 */
export async function uploadFeedbackAttachments(
  feedbackId: string,
  images: LocalFeedbackImage[],
  onProgress?: (localId: string, phase: 'uploading' | 'done' | 'error') => void
): Promise<FeedbackAttachmentUploadResult[]> {
  if (images.length > FEEDBACK_ATTACHMENT_MAX_COUNT) {
    throw new FeedbackAttachmentError('max-attachments');
  }

  const results: FeedbackAttachmentUploadResult[] = [];
  for (const image of images) {
    onProgress?.(image.localId, 'uploading');
    try {
      const { storagePath } = await uploadFeedbackAttachment(feedbackId, image);
      results.push({ localId: image.localId, ok: true, storagePath });
      onProgress?.(image.localId, 'done');
    } catch (err) {
      const error =
        err instanceof FeedbackAttachmentError
          ? err
          : new FeedbackAttachmentError(
              'unexpected',
              err instanceof Error ? err.message : 'unexpected'
            );
      results.push({ localId: image.localId, ok: false, error });
      onProgress?.(image.localId, 'error');
    }
  }
  return results;
}

/** True when the error looks like a network / offline failure. */
export function isLikelyOfflineError(err: unknown): boolean {
  if (err instanceof TypeError) return true;
  if (err instanceof Error) {
    const m = err.message.toLowerCase();
    return (
      m.includes('network request failed') ||
      m.includes('failed to fetch') ||
      m.includes('network error') ||
      m.includes('offline')
    );
  }
  return false;
}
