/**
 * Client type barrel: re-exports synced backend types plus mobile-only aliases.
 * `npm run sync-types` updates `index.d.ts` only; keep aliases here.
 */
import type {
  FamilyWithId,
  HabitsSettings,
  HeightInput,
  NotificationsSettings,
  PatchMeBody,
  PatchWaterDailyBody,
  PutWaterDailyBody,
  UserDocument,
  WeightInput,
} from './index';

export * from './index';

/** Merged habits shape used in dashboard UI (calorie toggle always treated as on). */
export type UserHabits = Omit<HabitsSettings, 'calorieTrackingEnabled'> & {
  calorieTrackingEnabled: boolean;
};

export type PatchUserHabitsBody = NonNullable<PatchMeBody['habits']>;

export type PatchNotificationsBody = Partial<NotificationsSettings> & {
  categories?: Partial<NotificationsSettings['categories']>;
};

export type HeightPatchValue = HeightInput;
export type WeightPatchValue = WeightInput;
export type PatchProfileBody = NonNullable<PatchMeBody['profile']>;

export type PutMeWaterBody = PutWaterDailyBody;
export type PatchMeWaterBody = PatchWaterDailyBody;

export type ProfilePhotoContentType = 'image/jpeg' | 'image/png' | 'image/webp';

export interface PostProfilePhotoUploadUrlBody {
  contentType: ProfilePhotoContentType;
}

export interface PostProfilePhotoUploadUrlResponse {
  uploadUrl: string;
  storagePath: string;
  contentType: ProfilePhotoContentType;
  expiresAt: string;
}

export interface PostProfilePhotoCompleteBody {
  storagePath: string;
}

export interface PostPushTokenResponse {
  id: string;
}

/** API may return null when profile is missing; synced backend type is non-null. */
export type GetMeResponse = UserDocument | null;

export interface FamilyMemberProfilePhoto {
  downloadUrl: string;
}

export interface FamilyMemberProfile {
  uid: string;
  displayName: string | null;
  profilePhoto: FamilyMemberProfilePhoto | null;
}

export interface FamilyWithMemberProfiles extends FamilyWithId {
  memberProfiles?: FamilyMemberProfile[];
}
