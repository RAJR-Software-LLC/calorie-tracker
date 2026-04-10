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

export interface UserProfileFields {
  heightCm: number | null;
  weightKg: number | null;
  age: number | null;
  sex: Sex | null;
  activityLevel: ActivityLevel | null;
}

export interface NotificationsSettings {
  enabled: boolean;
  reminderTimes: string[];
}

/** `users/{uid}` document (Firestore + API) */
export interface UserDocument {
  displayName: string;
  email: string | null;
  createdAt: ApiTimestamp | unknown;
  profile: UserProfileFields;
  maintenanceCalories: number | null;
  goalCalories: number | null;
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
  goalCalories?: number | null;
  goalType?: GoalType | null;
  familyId?: string | null;
  notifications?: Partial<NotificationsSettings>;
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
