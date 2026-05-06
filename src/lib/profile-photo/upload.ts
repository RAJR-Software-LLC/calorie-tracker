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

  constructor(code: ProfilePhotoErrorCode, message?: string, httpStatus?: number) {
    super(message ?? code);
    this.name = 'ProfilePhotoError';
    this.code = code;
    this.httpStatus = httpStatus;
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
): Promise<Response> {
  const firstAttempt = await fetch(uploadUrl, {
    method: 'PUT',
    headers: { 'Content-Type': contentType },
    body,
  });
  if (firstAttempt.ok) {
    return firstAttempt;
  }

  // Some signed URLs are generated without content-type as a signed header.
  // Retry once without the explicit header to avoid signature mismatch 4xx responses.
  if (firstAttempt.status === 400 || firstAttempt.status === 403) {
    const retryAttempt = await fetch(uploadUrl, {
      method: 'PUT',
      body,
    });
    if (retryAttempt.ok) {
      return retryAttempt;
    }
    return retryAttempt;
  }

  return firstAttempt;
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

  const putRes = await putToSignedUploadUrl(session.uploadUrl, session.contentType, blob);

  if (!putRes.ok) {
    throw new ProfilePhotoError('gcs-upload-failed', 'GCS upload failed', putRes.status);
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
