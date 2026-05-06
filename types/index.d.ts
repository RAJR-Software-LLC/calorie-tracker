/**
 * Shared domain and API types for Calorie Tracker (backend + frontend).
 *
 * Firestore stores `Timestamp` values; this REST API serializes them to ISO 8601 strings in JSON.
 */

/** ISO 8601 date-time string (API JSON) */
export type ApiTimestamp = string;

/** Calendar date YYYY-MM-DD */
export type DateString = string;

export type ActivityLevel = 'sedentary' | 'light' | 'moderate' | 'active' | 'very_active';

export type Sex = 'male' | 'female';

export type GoalType = 'lose' | 'gain' | 'maintain';

export type CalorieGoal =
  | { mode: 'single'; target: number }
  | { mode: 'range'; min: number; max: number };

export interface UserProfileFields {
  heightCm: number | null;
  weightKg: number | null;
  age: number | null;
  sex: Sex | null;
  activityLevel: ActivityLevel | null;
}

export interface NotificationsCategories {
  mealReminders: boolean;
  goalStatus: boolean;
  streaks: boolean;
  familyEvents: boolean;
  accountAdmin: boolean;
}

export interface NotificationsQuietHours {
  start: string;
  end: string;
}

export interface NotificationsSettings {
  enabled: boolean;
  reminderTimes: string[];
  categories: NotificationsCategories;
  quietHours: NotificationsQuietHours | null;
  timezone: string;
  goalStatusTime: string;
}

/** Deep-partial merge for PATCH /me notifications */
export interface PatchNotificationsBody {
  enabled?: boolean;
  reminderTimes?: string[];
  categories?: Partial<NotificationsCategories>;
  quietHours?: NotificationsQuietHours | null;
  timezone?: string;
  goalStatusTime?: string;
}

export interface PostPushTokenBody {
  token: string;
  platform: 'ios' | 'android';
  appVersion?: string;
  deviceId?: string;
}

export interface PostPushTokenResponse {
  id: string;
}

export type ProfilePhotoContentType = 'image/jpeg' | 'image/png' | 'image/webp';

/** Stored on `users/{uid}` in Firestore (no `downloadUrl`). */
export interface UserProfilePhoto {
  storagePath: string;
  contentType: string;
  updatedAt: ApiTimestamp | unknown;
}

/** `GET /api/v1/me` may include a short-lived signed read URL. */
export interface UserProfilePhotoWithDownload extends UserProfilePhoto {
  downloadUrl: string;
}

export interface PostProfilePhotoUploadUrlBody {
  contentType: ProfilePhotoContentType;
}

export interface PostProfilePhotoUploadUrlResponse {
  uploadUrl: string;
  storagePath: string;
  contentType: ProfilePhotoContentType;
  expiresAt: ApiTimestamp;
}

export interface PostProfilePhotoCompleteBody {
  storagePath: string;
}

/** `users/{uid}` document (Firestore + API) */
export interface UserDocument {
  displayName: string;
  email: string | null;
  createdAt: ApiTimestamp | unknown;
  profile: UserProfileFields;
  /** Present in Firestore; API may attach `downloadUrl` when serializing. */
  profilePhoto?: UserProfilePhoto | UserProfilePhotoWithDownload | null;
  maintenanceCalories: number | null;
  calorieGoal: CalorieGoal | null;
  goalType: GoalType | null;
  familyId: string | null;
  notifications: NotificationsSettings;
}

export interface CalorieEntryDocument {
  date: DateString;
  itemName: string;
  quantity: number;
  estimatedCalories: number;
  createdAt: ApiTimestamp | unknown;
  updatedAt: ApiTimestamp | unknown;
}

export interface CalorieEntryWithId extends CalorieEntryDocument {
  id: string;
}

export interface SavedItemDocument {
  itemName: string;
  defaultQuantity: number;
  defaultCalories: number;
  useCount: number;
  lastUsed: ApiTimestamp | unknown;
}

export interface SavedItemWithId extends SavedItemDocument {
  id: string;
}

export interface ExerciseDocument {
  date: DateString;
  name: string;
  caloriesBurned: number;
  createdAt: ApiTimestamp | unknown;
}

export interface ExerciseWithId extends ExerciseDocument {
  id: string;
}

export interface FamilyDocument {
  name: string;
  createdBy: string;
  members: string[];
  inviteCode: string;
  createdAt: ApiTimestamp | unknown;
}

export interface FamilyWithId extends FamilyDocument {
  id: string;
}

export interface FamilySharedItemDocument {
  itemName: string;
  defaultQuantity: number;
  defaultCalories: number;
  sharedBy: string;
  sharedByName: string;
}

export interface FamilySharedItemWithId extends FamilySharedItemDocument {
  id: string;
}

/** API: GET /api/v1/me */
export type GetMeResponse = UserDocument | null;

/** API: PATCH /api/v1/me — partial user fields; nested `notifications` merges */
export interface PatchMeBody {
  displayName?: string;
  email?: string | null;
  profile?: Partial<UserProfileFields>;
  maintenanceCalories?: number | null;
  calorieGoal?: CalorieGoal | null;
  goalType?: GoalType | null;
  familyId?: string | null;
  notifications?: PatchNotificationsBody;
}

export interface PostEntryBody {
  date: DateString;
  itemName: string;
  quantity: number;
  estimatedCalories: number;
}

export interface PostSavedItemBody {
  itemName: string;
  defaultQuantity: number;
  defaultCalories: number;
}

export interface PostExerciseBody {
  date: DateString;
  name: string;
  caloriesBurned: number;
}

export interface PostFamilyBody {
  name: string;
}

export interface PostJoinFamilyBody {
  inviteCode: string;
}

export interface PostFamilySharedItemBody {
  itemName: string;
  defaultQuantity: number;
  defaultCalories: number;
  sharedByName: string;
}

export interface CreateFamilyResponse {
  id: string;
  inviteCode: string;
}

export interface JoinFamilyResponse {
  id: string;
  name: string;
}
