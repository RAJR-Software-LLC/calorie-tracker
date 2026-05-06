import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';

import {
  deleteProfilePhoto,
  getMe,
  postProfilePhotoComplete,
  postProfilePhotoUploadUrl,
} from '@/lib/api';
import { ApiError } from '@/lib/api/errors';
import { toUserErrorMessage } from '@/lib/app-errors';
import type { GetMeResponse, UserDocument } from '@/types';

export const PROFILE_PHOTO_MAX_BYTES = 5 * 1024 * 1024;

export type ProfilePhotoErrorCode =
  | 'permission-denied'
  | 'too-large'
  | 'gcs-upload-failed'
  | 'no-image-uri'
  | 'unexpected';

export class ProfilePhotoError extends Error {
  readonly code: ProfilePhotoErrorCode;

  readonly httpStatus?: number;

  readonly debugMeta?: Record<string, unknown>;

  constructor(
    code: ProfilePhotoErrorCode,
    message?: string,
    httpStatus?: number,
    debugMeta?: Record<string, unknown>
  ) {
    super(message ?? code);
    this.name = 'ProfilePhotoError';
    this.code = code;
    this.httpStatus = httpStatus;
    this.debugMeta = debugMeta;
  }
}

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
  gcsRequestId?: string | null;
  gcsGeneration?: string | null;
  networkError?: string;
};

type SignedPutResult = {
  response?: Response;
  attempts: PutAttemptSummary[];
};

async function summarizeAttempt(
  attempt: string,
  bodyType: 'blob' | 'arrayBuffer',
  headers: string[],
  response: Response
): Promise<PutAttemptSummary> {
  const headerGet =
    typeof response.headers?.get === 'function'
      ? (name: string) => response.headers.get(name)
      : () => null;
  return {
    attempt,
    bodyType,
    headers,
    ok: response.ok,
    status: response.status,
    gcsRequestId: headerGet('x-goog-request-id'),
    gcsGeneration: headerGet('x-goog-generation'),
  };
}

async function attemptSignedPut(
  uploadUrl: string,
  body: Blob | ArrayBuffer,
  headers: Record<string, string>,
  attempt: string,
  bodyType: 'blob' | 'arrayBuffer'
): Promise<{ response?: Response; summary: PutAttemptSummary }> {
  try {
    const response = await fetch(uploadUrl, { method: 'PUT', headers, body });
    return {
      response,
      summary: await summarizeAttempt(attempt, bodyType, Object.keys(headers), response),
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

/**
 * User-facing copy for profile photo flows (avoids echoing raw API text on 400).
 */
export function toUserProfilePhotoMessage(err: unknown): string {
  if (err instanceof ProfilePhotoError) {
    switch (err.code) {
      case 'permission-denied':
        return 'Photo library access is required to choose a profile photo.';
      case 'too-large':
        return 'That photo is too large. Try a smaller image.';
      case 'gcs-upload-failed':
        return "Couldn't upload the photo. Please try again.";
      case 'no-image-uri':
        return "Couldn't read the selected photo. Please try again.";
      default:
        return "Couldn't save photo. Please try again.";
    }
  }
  if (err instanceof ApiError && err.status === 400) {
    return "Couldn't save photo. Please try again.";
  }
  return toUserErrorMessage(err, "Couldn't save photo");
}

export async function pickProfilePhotoFromLibrary(): Promise<string | null> {
  const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (perm.status !== 'granted') {
    throw new ProfilePhotoError('permission-denied');
  }

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsEditing: true,
    aspect: [1, 1],
    quality: 1,
    exif: false,
  });

  if (result.canceled || !result.assets?.length) {
    return null;
  }

  const uri = result.assets[0]?.uri;
  return uri ?? null;
}

export async function prepareJpegForUpload(uri: string): Promise<string> {
  const out = await manipulateAsync(uri, [{ resize: { width: 1024 } }], {
    compress: 0.85,
    format: SaveFormat.JPEG,
  });
  return out.uri;
}

async function blobFromLocalUri(uri: string): Promise<Blob> {
  const res = await fetch(uri);
  if (!res.ok) {
    throw new ProfilePhotoError('no-image-uri', `Failed to read image: ${res.status}`);
  }
  return res.blob();
}

async function putToSignedUploadUrl(
  uploadUrl: string,
  contentType: string,
  body: Blob
): Promise<SignedPutResult> {
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
    throw new ProfilePhotoError('unexpected', 'Upload link expired. Please try again.');
  }
}

/**
 * Full flow: pick from library, compress to JPEG, PUT to signed URL, complete on API.
 * @returns updated user document, or `null` if the user cancelled the picker.
 */
export async function uploadProfilePhoto(): Promise<UserDocument | null> {
  const picked = await pickProfilePhotoFromLibrary();
  if (picked == null) {
    return null;
  }

  const jpegUri = await prepareJpegForUpload(picked);
  const blob = await blobFromLocalUri(jpegUri);

  if (blob.size > PROFILE_PHOTO_MAX_BYTES) {
    throw new ProfilePhotoError('too-large');
  }

  const session = await postProfilePhotoUploadUrl({ contentType: 'image/jpeg' });
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
    throw new ProfilePhotoError(
      'gcs-upload-failed',
      `GCS upload failed (${attemptSummary || 'no-attempts'})`,
      putRes?.status,
      debugMeta
    );
  }

  const updated = await postProfilePhotoComplete({ storagePath: session.storagePath });
  if (updated == null) {
    throw new ProfilePhotoError('unexpected', 'Profile not found after upload');
  }
  return updated;
}

export async function removeProfilePhoto(): Promise<GetMeResponse> {
  await deleteProfilePhoto();
  return getMe();
}
