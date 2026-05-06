import { useAuth } from '@/components/auth/auth-provider';
import { ExternalLink } from '@/components/ExternalLink';
import { AppScreen } from '@/components/layout/app-screen';
import { NotificationsSettings } from '@/components/settings/notifications-settings';
import { Avatar } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { SegmentedControl } from '@/components/ui/segmented-control';
import { getMe, patchMe } from '@/lib/api';
import { ApiError } from '@/lib/api/errors';
import { logAppError } from '@/lib/app-errors';
import { formatCalorieGoal } from '@/lib/calorie-goal';
import { getLegalLinks } from '@/lib/env';
import { signOutUser } from '@/lib/firebase-auth';
import { withNotificationDefaults } from '@/lib/notifications/defaults';
import {
  ProfilePhotoError,
  removeProfilePhoto,
  toUserProfilePhotoMessage,
  uploadProfilePhoto,
} from '@/lib/profile-photo/upload';
import { showToast } from '@/lib/toast';
import { useThemePalette } from '@/lib/use-theme-palette';
import { cn } from '@/src/lib/cn';
import {
  buildAnthropometricPatch,
  cmToFeetInches,
  feetInchesToCm,
  formatDisplayHeightFromCm,
  formatDisplayWeightFromKg,
  kgToLb,
  lbToKg,
} from '@/src/lib/utils/profile-measurements';
import type { ActivityLevel, GetMeResponse, GoalType, HeightUnit, Sex, WeightUnit } from '@/types';
import { useFocusEffect } from '@react-navigation/native';
import { useRouter } from 'expo-router';
import { Bell, Camera, ChevronRight, LogOut, Mail, Shield } from 'lucide-react-native';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Modal, Pressable, Text, View } from 'react-native';

type SettingsRowProps = {
  icon?: React.ReactNode;
  label: string;
  value?: string;
  onPress?: () => void;
  showChevron?: boolean;
  destructive?: boolean;
};

function SettingsRow({ icon, label, value, onPress, showChevron, destructive }: SettingsRowProps) {
  const p = useThemePalette();
  const content = (
    <View className="flex-row items-center gap-3 py-3">
      {icon ? (
        <View
          className={`h-9 w-9 items-center justify-center rounded-xl ${destructive ? 'bg-destructive/10 dark:bg-darkDestructive/20' : 'bg-primary/10 dark:bg-darkPrimary/20'}`}
        >
          {icon}
        </View>
      ) : null}
      <View className="flex-1">
        <Text
          className={`text-base font-medium ${destructive ? 'text-destructive dark:text-darkDestructiveForeground' : 'text-foreground dark:text-darkForeground'}`}
        >
          {label}
        </Text>
        {value ? (
          <Text className="text-sm text-muted-foreground dark:text-darkMutedForeground">
            {value}
          </Text>
        ) : null}
      </View>
      {showChevron ? <ChevronRight size={20} color={p.mutedForeground} /> : null}
    </View>
  );

  if (onPress) {
    return (
      <Pressable onPress={onPress} className="active:opacity-70">
        {content}
      </Pressable>
    );
  }
  return content;
}

function SettingsDivider({ className }: { className?: string }) {
  return <View className={cn('h-px bg-border/50 dark:bg-darkBorder/50', className)} />;
}

type ProfileFieldInputProps = {
  label: string;
  value: string;
  placeholder: string;
  accessibilityLabel: string;
  keyboardType?: 'default' | 'numeric' | 'decimal-pad';
  onChangeText: (next: string) => void;
  disabled: boolean;
  onBlur?: () => void;
  errorText?: string | null;
};

function ProfileFieldInput({
  label,
  value,
  placeholder,
  accessibilityLabel,
  keyboardType,
  onChangeText,
  onBlur,
  disabled,
  errorText,
}: ProfileFieldInputProps) {
  const p = useThemePalette();
  return (
    <View className="py-3">
      <Text className="mb-1 text-base font-medium text-foreground dark:text-darkForeground">
        {label}
      </Text>
      <Input
        value={value}
        onChangeText={onChangeText}
        onBlur={onBlur}
        editable={!disabled}
        keyboardType={keyboardType}
        placeholder={placeholder}
        placeholderTextColor={p.mutedForeground}
        accessibilityLabel={accessibilityLabel}
        className="border-border px-3 dark:border-darkBorder"
      />
      {errorText ? <Text className="mt-1 text-sm text-destructive">{errorText}</Text> : null}
    </View>
  );
}

function formatGoalType(goalType: GoalType | null | undefined): string {
  if (goalType === 'lose') return 'Lose weight';
  if (goalType === 'gain') return 'Gain weight';
  if (goalType === 'maintain') return 'Maintain weight';
  return 'Not set';
}

export default function SettingsScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const p = useThemePalette();
  const [profile, setProfile] = useState<GetMeResponse>(null);
  const [showNotifications, setShowNotifications] = useState(false);
  const [photoSheetOpen, setPhotoSheetOpen] = useState(false);
  const [photoUploading, setPhotoUploading] = useState(false);
  const [heightUnit, setHeightUnit] = useState<HeightUnit>('cm');
  const [weightUnit, setWeightUnit] = useState<WeightUnit>('kg');
  const [heightCmInput, setHeightCmInput] = useState('');
  const [heightFeetInput, setHeightFeetInput] = useState('');
  const [heightInchesInput, setHeightInchesInput] = useState('');
  const [weightInput, setWeightInput] = useState('');
  const [ageInput, setAgeInput] = useState('');
  const [sexInput, setSexInput] = useState<Sex | null>(null);
  const [activityLevelInput, setActivityLevelInput] = useState<ActivityLevel | null>(null);
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileFieldErrors, setProfileFieldErrors] = useState<
    Partial<Record<'height' | 'weight' | 'age', string>>
  >({});
  const [anthropometricBaseline, setAnthropometricBaseline] = useState({
    heightUnit: 'cm' as HeightUnit,
    weightUnit: 'kg' as WeightUnit,
    heightCm: '',
    heightFeet: '',
    heightInches: '',
    weight: '',
    age: '',
    sex: null as Sex | null,
    activityLevel: null as ActivityLevel | null,
  });
  const legalLinks = getLegalLinks();
  const goalDisplay = formatCalorieGoal(profile?.calorieGoal ?? null);
  const goalTypeDisplay = formatGoalType(profile?.goalType);
  const syncProfileInputs = useCallback((me: GetMeResponse) => {
    if (!me?.profile) {
      setHeightUnit('cm');
      setWeightUnit('kg');
      setHeightCmInput('');
      setHeightFeetInput('');
      setHeightInchesInput('');
      setWeightInput('');
      setAgeInput('');
      setSexInput(null);
      setActivityLevelInput(null);
      setProfileFieldErrors({});
      setAnthropometricBaseline({
        heightUnit: 'cm',
        weightUnit: 'kg',
        heightCm: '',
        heightFeet: '',
        heightInches: '',
        weight: '',
        age: '',
        sex: null,
        activityLevel: null,
      });
      return;
    }

    const prof = me.profile;
    const nextHeightUnit = prof.heightUnit ?? 'cm';
    const nextWeightUnit = prof.weightUnit ?? 'kg';
    const displayHeight = formatDisplayHeightFromCm(prof.heightCm ?? null, nextHeightUnit);
    const displayWeight = formatDisplayWeightFromKg(prof.weightKg ?? null, nextWeightUnit);

    setHeightUnit(nextHeightUnit);
    setWeightUnit(nextWeightUnit);
    setHeightCmInput(displayHeight.cm);
    setHeightFeetInput(displayHeight.feet);
    setHeightInchesInput(displayHeight.inches);
    setWeightInput(displayWeight);
    setAgeInput(prof.age != null ? String(prof.age) : '');
    setSexInput(prof.sex ?? null);
    setActivityLevelInput(prof.activityLevel ?? null);
    setProfileFieldErrors({});
    setAnthropometricBaseline({
      heightUnit: nextHeightUnit,
      weightUnit: nextWeightUnit,
      heightCm: displayHeight.cm,
      heightFeet: displayHeight.feet,
      heightInches: displayHeight.inches,
      weight: displayWeight,
      age: prof.age != null ? String(prof.age) : '',
      sex: prof.sex ?? null,
      activityLevel: prof.activityLevel ?? null,
    });
  }, []);

  useEffect(() => {
    if (!user) {
      setProfile(null);
      return;
    }
    void getMe()
      .then((me) => {
        setProfile(me);
        syncProfileInputs(me);
      })
      .catch((err) => {
        logAppError('settings/getMe', err);
        setProfile(null);
        syncProfileInputs(null);
      });
  }, [syncProfileInputs, user]);

  useFocusEffect(
    useCallback(() => {
      if (!user) return;
      let cancelled = false;
      void (async () => {
        try {
          const me = await getMe();
          if (!cancelled) {
            setProfile(me);
            syncProfileInputs(me);
          }
        } catch (err) {
          logAppError('settings/loadProfile', err);
        }
      })();
      return () => {
        cancelled = true;
      };
    }, [syncProfileInputs, user])
  );

  const handleSignOut = () => {
    void signOutUser();
  };

  const refreshProfileFromServer = useCallback(() => {
    if (!user) return;
    void getMe()
      .then((me) => {
        setProfile(me);
        syncProfileInputs(me);
      })
      .catch((err) => logAppError('settings/refreshProfilePhoto', err));
  }, [syncProfileInputs, user]);

  const mapValidationErrors = useCallback((err: unknown) => {
    if (!(err instanceof ApiError) || err.status !== 400) return null;
    const next: Partial<Record<'height' | 'weight' | 'age', string>> = {};
    const bodyText = JSON.stringify(err.body ?? '').toLowerCase();
    if (bodyText.includes('height')) next.height = 'Please correct the height values.';
    if (bodyText.includes('weight')) next.weight = 'Please correct the weight value.';
    if (!next.height && err.message.toLowerCase().includes('height')) {
      next.height = 'Please correct the height values.';
    }
    if (!next.weight && err.message.toLowerCase().includes('weight')) {
      next.weight = 'Please correct the weight value.';
    }
    if (bodyText.includes('age') || err.message.toLowerCase().includes('age')) {
      next.age = 'Please enter a valid age.';
    }
    if (!next.height && !next.weight) {
      next.height = 'Please review your measurement inputs.';
    }
    return next;
  }, []);

  const hasAnthropometricChanges =
    anthropometricBaseline.heightUnit !== heightUnit ||
    anthropometricBaseline.weightUnit !== weightUnit ||
    anthropometricBaseline.heightCm !== heightCmInput ||
    anthropometricBaseline.heightFeet !== heightFeetInput ||
    anthropometricBaseline.heightInches !== heightInchesInput ||
    anthropometricBaseline.weight !== weightInput ||
    anthropometricBaseline.age !== ageInput ||
    anthropometricBaseline.sex !== sexInput ||
    anthropometricBaseline.activityLevel !== activityLevelInput;

  const currentAnthropometricValidation = buildAnthropometricPatch({
    initialProfile: profile?.profile,
    current: {
      heightUnit,
      weightUnit,
      heightCm: heightCmInput,
      heightFeet: heightFeetInput,
      heightInches: heightInchesInput,
      weight: weightInput,
    },
  });

  const ageValidationError = (() => {
    const trimmed = ageInput.trim();
    if (!trimmed) return null;
    const parsed = Number(trimmed);
    if (!Number.isFinite(parsed) || !Number.isInteger(parsed) || parsed < 0 || parsed > 130) {
      return 'Enter a valid age.';
    }
    return null;
  })();

  const canSaveProfile =
    !profileSaving &&
    !ageValidationError &&
    Object.keys(currentAnthropometricValidation.errors).length === 0 &&
    hasAnthropometricChanges;

  const handleSaveProfile = useCallback(async () => {
    if (!user || !profile?.profile) return;
    const { profilePatch, errors } = currentAnthropometricValidation;
    setProfileFieldErrors({
      ...errors,
      age: ageValidationError ?? undefined,
    });
    if (Object.keys(errors).length > 0) return;
    if (ageValidationError) return;

    const changedPatch = { ...profilePatch };
    if (anthropometricBaseline.heightUnit === heightUnit) {
      delete changedPatch.heightUnit;
    }
    if (anthropometricBaseline.weightUnit === weightUnit) {
      delete changedPatch.weightUnit;
    }

    const heightChanged =
      anthropometricBaseline.heightCm !== heightCmInput ||
      anthropometricBaseline.heightFeet !== heightFeetInput ||
      anthropometricBaseline.heightInches !== heightInchesInput ||
      anthropometricBaseline.heightUnit !== heightUnit;
    const weightChanged =
      anthropometricBaseline.weight !== weightInput ||
      anthropometricBaseline.weightUnit !== weightUnit;
    const ageChanged = anthropometricBaseline.age !== ageInput;
    const sexChanged = anthropometricBaseline.sex !== sexInput;
    const activityChanged = anthropometricBaseline.activityLevel !== activityLevelInput;

    if (!heightChanged) delete changedPatch.height;
    if (!weightChanged) delete changedPatch.weight;
    if (ageChanged) {
      changedPatch.age = ageInput.trim() ? Number(ageInput.trim()) : null;
    }
    if (sexChanged) {
      changedPatch.sex = sexInput;
    }
    if (activityChanged) {
      changedPatch.activityLevel = activityLevelInput;
    }
    if (Object.keys(changedPatch).length === 0) return;

    setProfileSaving(true);
    try {
      let me: GetMeResponse = await patchMe({ profile: changedPatch });
      if (!me?.profile) {
        me = await getMe();
      }
      setProfile(me);
      syncProfileInputs(me);
      showToast('Profile updated', 'success');
    } catch (err) {
      logAppError('settings/patchProfile', err);
      setProfileFieldErrors(mapValidationErrors(err) ?? {});
      showToast('Could not save profile updates', 'error');
    } finally {
      setProfileSaving(false);
    }
  }, [
    anthropometricBaseline.heightCm,
    anthropometricBaseline.heightFeet,
    anthropometricBaseline.heightInches,
    anthropometricBaseline.heightUnit,
    anthropometricBaseline.weight,
    anthropometricBaseline.weightUnit,
    anthropometricBaseline.age,
    anthropometricBaseline.sex,
    anthropometricBaseline.activityLevel,
    heightCmInput,
    heightFeetInput,
    heightInchesInput,
    heightUnit,
    mapValidationErrors,
    ageInput,
    ageValidationError,
    profile?.profile,
    sexInput,
    activityLevelInput,
    syncProfileInputs,
    user,
    weightInput,
    weightUnit,
    currentAnthropometricValidation,
  ]);

  const handleChangeHeightUnit = useCallback(
    (next: HeightUnit) => {
      if (next === heightUnit) return;
      if (next === 'ft_in') {
        const parsedCm = Number(heightCmInput.trim());
        if (Number.isFinite(parsedCm) && parsedCm > 0) {
          const converted = cmToFeetInches(parsedCm);
          setHeightFeetInput(String(converted.feet));
          setHeightInchesInput(String(converted.inches));
          setHeightCmInput('');
        }
      } else {
        const feet = Number(heightFeetInput.trim());
        const inches = Number(heightInchesInput.trim());
        if (
          Number.isInteger(feet) &&
          Number.isInteger(inches) &&
          feet >= 0 &&
          inches >= 0 &&
          inches <= 11 &&
          (feet > 0 || inches > 0)
        ) {
          setHeightCmInput(String(Math.round(feetInchesToCm(feet, inches) * 10) / 10));
        }
        setHeightFeetInput('');
        setHeightInchesInput('');
      }
      setHeightUnit(next);
      setProfileFieldErrors((prev) => ({ ...prev, height: undefined }));
    },
    [heightCmInput, heightFeetInput, heightInchesInput, heightUnit]
  );

  const handleChangeWeightUnit = useCallback(
    (next: WeightUnit) => {
      if (next === weightUnit) return;
      const parsed = Number(weightInput.trim());
      if (Number.isFinite(parsed) && parsed > 0) {
        const converted = next === 'kg' ? lbToKg(parsed) : kgToLb(parsed);
        setWeightInput(String(Math.round(converted * 10) / 10));
      }
      setWeightUnit(next);
      setProfileFieldErrors((prev) => ({ ...prev, weight: undefined }));
    },
    [weightInput, weightUnit]
  );

  const handleChooseProfilePhoto = useCallback(() => {
    if (!user) return;
    setPhotoUploading(true);
    void (async () => {
      try {
        const me = await uploadProfilePhoto();
        if (me != null) {
          setProfile(me);
          showToast('Profile photo updated', 'success');
        }
        setPhotoSheetOpen(false);
      } catch (err) {
        const uploadMeta =
          err instanceof ProfilePhotoError
            ? {
                profilePhotoCode: err.code,
                profilePhotoHttpStatus: err.httpStatus,
                profilePhotoDebugMeta: err.debugMeta,
              }
            : undefined;
        logAppError('settings/profile-photo-upload', err, uploadMeta);
        showToast(toUserProfilePhotoMessage(err), 'error');
      } finally {
        setPhotoUploading(false);
      }
    })();
  }, [user]);

  const handleRemoveProfilePhoto = useCallback(() => {
    if (!user) return;
    setPhotoUploading(true);
    void (async () => {
      try {
        const me = await removeProfilePhoto();
        setProfile(me);
        showToast('Profile photo removed', 'success');
        setPhotoSheetOpen(false);
      } catch (err) {
        logAppError('settings/profile-photo-remove', err);
        showToast(toUserProfilePhotoMessage(err), 'error');
      } finally {
        setPhotoUploading(false);
      }
    })();
  }, [user]);

  return (
    <AppScreen forceLeafHeader>
      <View className="mb-2">
        <Text className="text-2xl font-bold text-foreground dark:text-darkForeground">
          Settings
        </Text>
        <Text className="text-sm text-muted-foreground dark:text-darkMutedForeground">
          Manage your account and preferences
        </Text>
      </View>

      {/* Profile Section */}
      <Card>
        <CardContent className="p-4">
          <View className="mb-3 flex-row items-center gap-3">
            <Pressable
              onPress={() => user && setPhotoSheetOpen(true)}
              disabled={!user || photoUploading}
              className="active:opacity-80 disabled:opacity-50"
              accessibilityLabel="Change profile photo"
            >
              <View className="relative h-12 w-12">
                <Avatar
                  photo={profile?.profilePhoto}
                  name={user?.displayName}
                  email={user?.email}
                  size={48}
                  onRefreshNeeded={refreshProfileFromServer}
                />
                {photoUploading ? (
                  <View className="absolute inset-0 items-center justify-center rounded-full bg-background/70 dark:bg-darkBackground/70">
                    <ActivityIndicator color={p.primary} />
                  </View>
                ) : null}
                <View className="absolute -bottom-0.5 -right-0.5 h-5 w-5 items-center justify-center rounded-full border-2 border-background bg-primary dark:border-darkBackground dark:bg-darkPrimary">
                  <Camera size={10} color={p.primaryForeground} />
                </View>
              </View>
            </Pressable>
            <View className="flex-1">
              <Text className="text-lg font-semibold text-foreground dark:text-darkForeground">
                Profile
              </Text>
              <View className="flex-row items-center gap-1">
                <Mail size={12} color={p.mutedForeground} />
                <Text className="text-sm text-muted-foreground dark:text-darkMutedForeground">
                  {user?.email ?? 'Not signed in'}
                </Text>
              </View>
            </View>
          </View>
          <SettingsDivider />
          <SettingsRow
            label="Daily Goal"
            value={goalDisplay != null ? `${goalDisplay} kcal` : 'Not set'}
            onPress={() => router.push('/(tabs)/calculator')}
            showChevron
          />
          <SettingsDivider />
          <SettingsRow label="Weight Goal" value={`${goalTypeDisplay} (coming soon)`} />
          <SettingsDivider />
          <View className="py-3">
            <View className="mb-2 flex-row items-center justify-between">
              <Text className="text-base font-medium text-foreground dark:text-darkForeground">
                Height
              </Text>
              <SegmentedControl
                value={heightUnit}
                onChange={(next) => handleChangeHeightUnit(next as HeightUnit)}
                options={[
                  { value: 'cm', label: 'cm' },
                  { value: 'ft_in', label: 'ft/in' },
                ]}
                className="w-32"
              />
            </View>
            {heightUnit === 'cm' ? (
              <ProfileFieldInput
                label="Height (cm)"
                accessibilityLabel="Height (cm)"
                value={heightCmInput}
                placeholder="e.g. 170"
                keyboardType="decimal-pad"
                disabled={!user || profileSaving}
                onChangeText={setHeightCmInput}
                errorText={profileFieldErrors.height ?? null}
              />
            ) : (
              <View className="flex-row gap-3">
                <View className="flex-1">
                  <ProfileFieldInput
                    label="Feet"
                    accessibilityLabel="Height feet"
                    value={heightFeetInput}
                    placeholder="e.g. 5"
                    keyboardType="numeric"
                    disabled={!user || profileSaving}
                    onChangeText={setHeightFeetInput}
                  />
                </View>
                <View className="flex-1">
                  <ProfileFieldInput
                    label="Inches"
                    accessibilityLabel="Height inches"
                    value={heightInchesInput}
                    placeholder="e.g. 8"
                    keyboardType="numeric"
                    disabled={!user || profileSaving}
                    onChangeText={setHeightInchesInput}
                    errorText={profileFieldErrors.height ?? null}
                  />
                </View>
              </View>
            )}
          </View>
          <SettingsDivider />
          <View className="py-3">
            <View className="mb-2 flex-row items-center justify-between">
              <Text className="text-base font-medium text-foreground dark:text-darkForeground">
                Weight
              </Text>
              <SegmentedControl
                value={weightUnit}
                onChange={(next) => handleChangeWeightUnit(next as WeightUnit)}
                options={[
                  { value: 'kg', label: 'kg' },
                  { value: 'lb', label: 'lb' },
                ]}
                className="w-28"
              />
            </View>
            <ProfileFieldInput
              label={`Weight (${weightUnit})`}
              accessibilityLabel={`Weight (${weightUnit})`}
              value={weightInput}
              placeholder={weightUnit === 'kg' ? 'e.g. 70.5' : 'e.g. 155.4'}
              keyboardType="decimal-pad"
              disabled={!user || profileSaving}
              onChangeText={setWeightInput}
              errorText={profileFieldErrors.weight ?? null}
            />
          </View>
          <SettingsDivider />
          <ProfileFieldInput
            label="Age"
            accessibilityLabel="Age"
            value={ageInput}
            placeholder="e.g. 32"
            keyboardType="numeric"
            disabled={!user || profileSaving}
            onChangeText={setAgeInput}
            errorText={profileFieldErrors.age ?? ageValidationError}
          />
          <SettingsDivider />
          <View className="py-3">
            <Text className="mb-2 text-base font-medium text-foreground dark:text-darkForeground">
              Sex
            </Text>
            <View className="flex-row gap-2">
              {(['male', 'female'] as const).map((option) => {
                const selected = sexInput === option;
                return (
                  <Pressable
                    key={option}
                    onPress={() => setSexInput(option)}
                    disabled={!user || profileSaving}
                    className={`rounded-full border px-3 py-2 ${selected ? 'border-primary bg-primary/10 dark:border-darkPrimary dark:bg-darkPrimary/20' : 'border-border dark:border-darkBorder'} disabled:opacity-50`}
                  >
                    <Text className="text-sm font-medium capitalize text-foreground dark:text-darkForeground">
                      {option}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
          <SettingsDivider />
          <View className="py-3">
            <Text className="mb-2 text-base font-medium text-foreground dark:text-darkForeground">
              Activity level
            </Text>
            <View className="flex-row flex-wrap gap-2">
              {(['sedentary', 'light', 'moderate', 'active', 'very_active'] as const).map(
                (option) => {
                  const selected = activityLevelInput === option;
                  return (
                    <Pressable
                      key={option}
                      onPress={() => setActivityLevelInput(option)}
                      disabled={!user || profileSaving}
                      className={`rounded-full border px-3 py-2 ${selected ? 'border-primary bg-primary/10 dark:border-darkPrimary dark:bg-darkPrimary/20' : 'border-border dark:border-darkBorder'} disabled:opacity-50`}
                    >
                      <Text className="text-sm font-medium capitalize text-foreground dark:text-darkForeground">
                        {option.replace('_', ' ')}
                      </Text>
                    </Pressable>
                  );
                }
              )}
            </View>
          </View>
          <Button
            className="mt-2"
            onPress={() => void handleSaveProfile()}
            disabled={!user || !canSaveProfile}
          >
            {profileSaving ? 'Saving...' : 'Save profile'}
          </Button>
        </CardContent>
      </Card>

      {/* Notifications Section */}
      <Card>
        <CardContent className="p-4">
          <Pressable
            onPress={() => setShowNotifications(!showNotifications)}
            className="active:opacity-70"
          >
            <View className="flex-row items-center gap-3">
              <View className="h-12 w-12 items-center justify-center rounded-full bg-accent/20 dark:bg-darkAccent/25">
                <Bell size={24} color={p.accent} />
              </View>
              <View className="flex-1">
                <Text className="text-lg font-semibold text-foreground dark:text-darkForeground">
                  Notifications
                </Text>
                <Text className="text-sm text-muted-foreground dark:text-darkMutedForeground">
                  Reminders and alert preferences
                </Text>
              </View>
              <ChevronRight
                size={20}
                color={p.mutedForeground}
                style={{ transform: [{ rotate: showNotifications ? '90deg' : '0deg' }] }}
              />
            </View>
          </Pressable>

          {showNotifications ? (
            <>
              <SettingsDivider className="mt-4" />
              <NotificationsSettings
                initial={
                  profile?.notifications ? withNotificationDefaults(profile.notifications) : null
                }
                onSaved={(me) => setProfile(me)}
                embedded
              />
            </>
          ) : null}
        </CardContent>
      </Card>

      {/* Legal Section */}
      <Card>
        <CardContent className="p-4">
          <View className="mb-3 flex-row items-center gap-3">
            <View className="h-12 w-12 items-center justify-center rounded-full bg-secondary dark:bg-darkSecondary">
              <Shield size={24} color={p.mutedForeground} />
            </View>
            <View className="flex-1">
              <Text className="text-lg font-semibold text-foreground dark:text-darkForeground">
                Legal
              </Text>
              <Text className="text-sm text-muted-foreground dark:text-darkMutedForeground">
                Privacy and compliance
              </Text>
            </View>
          </View>
          <SettingsDivider className="mb-4" />
          <SettingsRow
            label="Legal Disclosures"
            onPress={() => router.push('/legal')}
            showChevron
          />
          {legalLinks.privacyPolicyUrl ? (
            <>
              <SettingsDivider />
              <ExternalLink href={legalLinks.privacyPolicyUrl}>
                <SettingsRow label="Privacy Policy" />
              </ExternalLink>
            </>
          ) : null}
          {legalLinks.termsOfUseUrl ? (
            <>
              <SettingsDivider />
              <ExternalLink href={legalLinks.termsOfUseUrl}>
                <SettingsRow label="Terms of Use" />
              </ExternalLink>
            </>
          ) : null}
          {legalLinks.accountDeletionUrl ? (
            <>
              <SettingsDivider />
              <ExternalLink href={legalLinks.accountDeletionUrl}>
                <SettingsRow label="Account Deletion" />
              </ExternalLink>
            </>
          ) : null}
        </CardContent>
      </Card>

      {/* Sign Out */}
      <Card>
        <CardContent className="p-3">
          <SettingsRow
            icon={<LogOut size={20} color={p.destructive} />}
            label="Sign Out"
            onPress={handleSignOut}
            destructive
          />
        </CardContent>
      </Card>

      <Text className="text-center text-xs text-muted-foreground dark:text-darkMutedForeground">
        Calorie Tracker v1.0
      </Text>

      <Modal
        visible={photoSheetOpen}
        animationType="slide"
        transparent
        onRequestClose={() => {
          if (!photoUploading) setPhotoSheetOpen(false);
        }}
      >
        <Pressable
          className="flex-1 justify-end bg-black/40"
          onPress={() => {
            if (!photoUploading) setPhotoSheetOpen(false);
          }}
        >
          <Pressable
            className="rounded-t-3xl bg-background p-4 pb-8 dark:bg-darkBackground"
            onPress={(e) => e.stopPropagation()}
          >
            <Text className="mb-4 text-lg font-semibold text-foreground dark:text-darkForeground">
              Profile photo
            </Text>
            <Pressable
              onPress={handleChooseProfilePhoto}
              disabled={photoUploading}
              className="rounded-xl bg-primary/10 py-3 active:opacity-70 dark:bg-darkPrimary/20"
            >
              <Text className="text-center text-base font-semibold text-foreground dark:text-darkForeground">
                {photoUploading ? 'Working…' : 'Choose photo'}
              </Text>
            </Pressable>
            <Pressable
              onPress={handleRemoveProfilePhoto}
              disabled={photoUploading || !profile?.profilePhoto}
              className="mt-2 rounded-xl border border-border py-3 active:opacity-70 disabled:opacity-40 dark:border-darkBorder"
            >
              <Text className="text-center text-base font-semibold text-destructive dark:text-darkDestructiveForeground">
                Remove photo
              </Text>
            </Pressable>
            <Pressable
              onPress={() => setPhotoSheetOpen(false)}
              disabled={photoUploading}
              className="mt-3 py-3 active:opacity-70"
            >
              <Text className="text-center text-base font-medium text-muted-foreground dark:text-darkMutedForeground">
                Cancel
              </Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </AppScreen>
  );
}
