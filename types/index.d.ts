/**
 * Shared domain and API types for Calorie Tracker (backend + frontend).
 *
 * Firestore stores `Timestamp` values; this REST API serializes them to ISO 8601 strings in JSON.
 */

/** ISO 8601 date-time string (API JSON) */
export type ApiTimestamp = string

/** Calendar date YYYY-MM-DD */
export type DateString = string

export type ActivityLevel = 'sedentary' | 'light' | 'moderate' | 'active' | 'very_active'

export type Sex = 'male' | 'female'

export type GoalType = 'lose' | 'gain' | 'maintain'

export interface CalorieGoalSingle {
  mode: 'single'
  target: number
}

export interface CalorieGoalRange {
  mode: 'range'
  min: number
  max: number
}

export type CalorieGoal = CalorieGoalSingle | CalorieGoalRange

export interface UserProfileFields {
  heightCm: number | null
  weightKg: number | null
  heightUnit: HeightUnit
  weightUnit: WeightUnit
  age: number | null
  sex: Sex | null
  activityLevel: ActivityLevel | null
}

export type HeightUnit = 'cm' | 'ft_in'

export type WeightUnit = 'kg' | 'lb'

export type HeightInput =
  | {
      unit: 'cm'
      value: number
    }
  | {
      unit: 'ft_in'
      feet: number
      inches: number
    }

export interface WeightInput {
  unit: WeightUnit
  value: number
}

export interface NotificationCategoryPreferences {
  mealReminders: boolean
  goalStatus: boolean
  streaks: boolean
  familyEvents: boolean
  accountAdmin: boolean
}

export interface QuietHours {
  start: string
  end: string
}

export interface NotificationsSettings {
  enabled: boolean
  reminderTimes: string[]
  categories: NotificationCategoryPreferences
  quietHours: QuietHours | null
  /** IANA timezone for server-scheduled pushes */
  timezone: string
  /** Local HH:MM when daily goal-status ping is evaluated */
  goalStatusTime: string
}

export type WaterUnit = 'ml' | 'l' | 'oz_us' | 'oz_imperial' | 'cup_us'

export interface HabitsSettings {
  calorieTrackingEnabled: true
  exerciseTrackingEnabled: boolean
  waterTrackingEnabled: boolean
  waterDefaultUnit: WaterUnit
  waterGoalAmount?: number | null
  waterGoalUnit?: WaterUnit | null
}

export type PushPlatform = 'ios' | 'android'

/** `users/{uid}/pushTokens/{tokenId}` */
export interface PushTokenDocument {
  token: string
  platform: PushPlatform
  appVersion?: string
  deviceId?: string
  createdAt: ApiTimestamp | unknown
  lastSeenAt: ApiTimestamp | unknown
  failureCount: number
}

/** API: POST /api/v1/me/push-tokens */
export interface PostPushTokenBody {
  token: string
  platform: PushPlatform
  appVersion?: string
  deviceId?: string
}

/** Stored on `users/{uid}` in Firestore (no `downloadUrl`). */
export interface UserProfilePhoto {
  storagePath: string
  contentType: string
  updatedAt: ApiTimestamp | unknown
}

/** `GET /api/v1/me` may include a short-lived signed read URL. */
export interface UserProfilePhotoWithDownload extends UserProfilePhoto {
  downloadUrl: string
}

/** `users/{uid}` document (Firestore + API) */
export interface UserDocument {
  displayName: string
  email: string | null
  createdAt: ApiTimestamp | unknown
  profile: UserProfileFields
  /** Present in Firestore; API may attach `downloadUrl` when serializing. */
  profilePhoto?: UserProfilePhoto | UserProfilePhotoWithDownload | null
  maintenanceCalories: number | null
  calorieGoal: CalorieGoal | null
  goalType: GoalType | null
  familyId: string | null
  notifications: NotificationsSettings
  habits?: HabitsSettings
}

export interface CalorieEntryDocument {
  date: DateString
  itemName: string
  quantity: number
  estimatedCalories: number
  createdAt: ApiTimestamp | unknown
  updatedAt: ApiTimestamp | unknown
}

export interface CalorieEntryWithId extends CalorieEntryDocument {
  id: string
}

export interface SavedItemDocument {
  itemName: string
  itemNameNormalized?: string
  defaultQuantity: number
  defaultCalories: number | 'unknown'
  useCount: number
  lastUsed: ApiTimestamp | unknown
  createdAt: ApiTimestamp | unknown
  updatedAt: ApiTimestamp | unknown
  deletedAt: ApiTimestamp | null | unknown
  deletedBy: string | null
}

export interface SavedItemWithId extends SavedItemDocument {
  id: string
}

export type ExerciseSource = 'manual' | 'healthkit' | 'health_connect' | 'google_fit' | 'imported'

export type ExerciseIntensity = 'low' | 'moderate' | 'high'

export type ExercisePresetCategory = 'cardio' | 'strength' | 'flexibility' | 'sports' | 'other'

/** Curated catalog entry; served from GET /api/v1/me/exercise/presets */
export interface ExercisePreset {
  id: string
  displayName: string
  category: ExercisePresetCategory
  defaultIntensity: ExerciseIntensity
  /** MET (Compendium); informational for clients — API does not compute calories from MET */
  metValue: number
  iconKey: string
  searchKeywords: string[]
  healthKitActivityTypes: string[]
  healthConnectExerciseTypes: string[]
  googleFitActivityTypes: string[]
}

/** `users/{uid}/exercise/{id}` — optional fields added for native sync and presets */
export interface ExerciseDocument {
  date: DateString
  name: string
  caloriesBurned: number
  createdAt: ApiTimestamp | unknown
  updatedAt?: ApiTimestamp | unknown
  presetId?: string | null
  durationMinutes?: number | null
  startTime?: ApiTimestamp | unknown | null
  endTime?: ApiTimestamp | unknown | null
  distanceMeters?: number | null
  averageHeartRate?: number | null
  steps?: number | null
  intensity?: ExerciseIntensity | null
  source?: ExerciseSource
  externalSource?: string | null
  externalId?: string | null
  notes?: string | null
}

export interface ExerciseWithId extends ExerciseDocument {
  id: string
}

/** Allowed values for `externalSource` when syncing from device (dedup key with `externalId`) */
export type ExerciseExternalSource = 'apple_healthkit' | 'health_connect' | 'google_fit'

export interface PostExerciseBody {
  date: DateString
  name: string
  caloriesBurned: number
  presetId?: string | null
  durationMinutes?: number | null
  startTime?: string | null
  endTime?: string | null
  distanceMeters?: number | null
  averageHeartRate?: number | null
  steps?: number | null
  intensity?: ExerciseIntensity | null
  source?: ExerciseSource
  externalSource?: ExerciseExternalSource | null
  externalId?: string | null
  notes?: string | null
}

export interface PatchExerciseBody {
  name?: string
  caloriesBurned?: number
  notes?: string | null
  presetId?: string | null
  intensity?: ExerciseIntensity | null
}

export interface PostExerciseBulkBody {
  exercises: PostExerciseBody[]
}

export type BulkExerciseItemStatus = 'created' | 'updated' | 'skipped'

export interface BulkExerciseItemResult {
  id: string
  status: BulkExerciseItemStatus
}

export interface BulkExerciseResult {
  created: number
  updated: number
  skipped: number
  items: BulkExerciseItemResult[]
}

export interface GetExercisePresetsResponse {
  version: number
  presets: ExercisePreset[]
}

/** `users/{uid}/waterDaily/{date}` */
export interface WaterDailyDocument {
  date: DateString
  totalAmount: number
  unit: WaterUnit
  goalAmount?: number | null
  goalUnit?: WaterUnit | null
  createdAt: ApiTimestamp | unknown
  updatedAt: ApiTimestamp | unknown
}

export interface WaterDailyWithId extends WaterDailyDocument {
  id: string
}

export interface FamilyDocument {
  name: string
  createdBy: string
  members: string[]
  inviteCode: string
  createdAt: ApiTimestamp | unknown
}

export interface FamilyWithId extends FamilyDocument {
  id: string
}

export interface FamilySharedItemDocument {
  itemName: string
  defaultQuantity: number
  /** Numeric for items created via POST; legacy rows may still be `'unknown'`. */
  defaultCalories: number | 'unknown'
  sharedBy: string
  sharedByName: string
  sourceType?: 'family'
  createdAt?: ApiTimestamp | unknown
  updatedAt?: ApiTimestamp | unknown
}

export interface FamilySharedItemWithId extends FamilySharedItemDocument {
  id: string
}

/** API: GET /api/v1/me */
export type GetMeResponse = UserDocument

/** API: PATCH /api/v1/me — partial user fields; nested `notifications` merges */
export interface PatchMeBody {
  displayName?: string
  email?: string | null
  profile?: {
    age?: number | null
    sex?: Sex | null
    activityLevel?: ActivityLevel | null
    height?: HeightInput | null
    weight?: WeightInput | null
    heightUnit?: HeightUnit
    weightUnit?: WeightUnit
  }
  maintenanceCalories?: number | null
  calorieGoal?: CalorieGoal | null
  goalType?: GoalType | null
  familyId?: string | null
  notifications?: Partial<NotificationsSettings>
  habits?: {
    exerciseTrackingEnabled?: boolean
    waterTrackingEnabled?: boolean
    waterDefaultUnit?: WaterUnit
    waterGoalAmount?: number | null
    waterGoalUnit?: WaterUnit | null
  }
}

export interface PostEntryBody {
  date: DateString
  itemName: string
  quantity: number
  estimatedCalories: number
}

export interface PostSavedItemBody {
  itemName: string
  defaultQuantity: number
  defaultCalories: number | 'unknown'
}

export interface PatchSavedItemBody {
  itemName?: string
  defaultQuantity?: number
  defaultCalories?: number | 'unknown'
}

export interface PostFamilyBody {
  name: string
}

export interface PostJoinFamilyBody {
  inviteCode: string
}

export interface PostFamilySharedItemBody {
  itemName: string
  defaultQuantity: number
  defaultCalories: number
  sharedByName: string
}

export interface GetWaterDailyQuery {
  date: DateString
}

export interface GetWaterDailyResponse {
  date: DateString
  totalAmount: number
  unit: WaterUnit
  goalAmount?: number | null
  goalUnit?: WaterUnit | null
}

export interface PutWaterDailyBody {
  date?: DateString
  totalAmount: number
  unit?: WaterUnit
  goalAmount?: number | null
  goalUnit?: WaterUnit | null
}

export interface PatchWaterDailyBody {
  date?: DateString
  deltaAmount: number
  unit?: WaterUnit
}

export interface CreateFamilyResponse {
  id: string
  inviteCode: string
}

export interface JoinFamilyResponse {
  id: string
  name: string
}
