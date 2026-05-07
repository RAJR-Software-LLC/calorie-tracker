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

export type HeightUnit = 'cm' | 'ft_in';
export type WeightUnit = 'kg' | 'lb';

/** Volume units for daily water totals (`GET/PATCH/PUT /api/v1/me/water`, `habits`). */
export type WaterUnit = 'ml' | 'l' | 'oz_us' | 'oz_imperial' | 'cup_us';

/** Account-level optional habits; `calorieTrackingEnabled` is always on server-side. */
export interface UserHabits {
  calorieTrackingEnabled: boolean;
  exerciseTrackingEnabled: boolean;
  waterTrackingEnabled: boolean;
  waterDefaultUnit: WaterUnit;
  waterGoalAmount: number | null;
  waterGoalUnit: WaterUnit | null;
}

/** Fields clients may send in `PATCH /api/v1/me` under `habits` (no calorie toggle off). */
export type PatchUserHabitsBody = Partial<
  Pick<
    UserHabits,
    | 'exerciseTrackingEnabled'
    | 'waterTrackingEnabled'
    | 'waterDefaultUnit'
    | 'waterGoalAmount'
    | 'waterGoalUnit'
  >
>;

/** `users/{uid}/waterDaily/{date}` — REST JSON uses ISO strings for timestamps. */
export interface WaterDailyDocument {
  date: DateString;
  totalAmount: number;
  unit: WaterUnit;
  goalAmount: number | null;
  goalUnit: WaterUnit | null;
  createdAt?: ApiTimestamp | unknown;
  updatedAt?: ApiTimestamp | unknown;
}

/** `GET /api/v1/me/water` always returns `id` equal to `date`. */
export interface WaterDailyWithId extends WaterDailyDocument {
  id: string;
}

/** Query for `GET /api/v1/me/water` — `date` is required (strict YYYY-MM-DD). */
export interface GetWaterDailyQuery {
  date: DateString;
}

/** `PUT /api/v1/me/water` — idempotent daily total; strict schema (no unknown keys). */
export interface PutMeWaterBody {
  date: DateString;
  totalAmount: number;
  unit: WaterUnit;
  goalAmount: number | null;
  goalUnit: WaterUnit | null;
}

/** `PATCH /api/v1/me/water` — delta in the same unit the server expects for the bucket (see API docs). */
export interface PatchMeWaterBody {
  deltaAmount: number;
}

export type CalorieGoal =
  | { mode: 'single'; target: number }
  | { mode: 'range'; min: number; max: number };

export interface UserProfileFields {
  heightCm: number | null;
  weightKg: number | null;
  heightUnit: HeightUnit;
  weightUnit: WeightUnit;
  age: number | null;
  sex: Sex | null;
  activityLevel: ActivityLevel | null;
}

export type HeightPatchValue =
  | { unit: 'cm'; value: number }
  | { unit: 'ft_in'; feet: number; inches: number };

export type WeightPatchValue = { unit: 'kg'; value: number } | { unit: 'lb'; value: number };

export interface PatchProfileBody extends Partial<Omit<UserProfileFields, 'heightCm' | 'weightKg'>> {
  height?: HeightPatchValue | null;
  weight?: WeightPatchValue | null;
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
  /** Optional until all accounts migrated; merge with client defaults when absent. */
  habits?: UserHabits;
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
  memberProfiles?: FamilyMemberProfile[];
  createdAt: ApiTimestamp | unknown;
}

export interface FamilyWithId extends FamilyDocument {
  id: string;
}

export interface FamilyMemberProfilePhoto {
  downloadUrl: string;
}

export interface FamilyMemberProfile {
  uid: string;
  displayName: string | null;
  profilePhoto: FamilyMemberProfilePhoto | null;
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
  profile?: PatchProfileBody;
  maintenanceCalories?: number | null;
  calorieGoal?: CalorieGoal | null;
  goalType?: GoalType | null;
  familyId?: string | null;
  notifications?: PatchNotificationsBody;
  habits?: PatchUserHabitsBody;
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
