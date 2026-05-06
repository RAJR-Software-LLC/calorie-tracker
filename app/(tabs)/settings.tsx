import { useFocusEffect } from '@react-navigation/native';
import { useRouter } from 'expo-router';
import {
  Bell,
  Camera,
  ChevronRight,
  Mail,
  Shield,
} from 'lucide-react-native';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Modal, Pressable, Text, TextInput, View } from 'react-native';

import { useAuth } from '@/components/auth/auth-provider';
import { ExternalLink } from '@/components/ExternalLink';
import { AppScreen } from '@/components/layout/app-screen';
import { NotificationsSettings } from '@/components/settings/notifications-settings';
import { Avatar } from '@/components/ui/avatar';
import { Card, CardContent } from '@/components/ui/card';
import { getMe, patchMe } from '@/lib/api';
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
import type { ActivityLevel, GetMeResponse, GoalType, Sex, UserProfileFields } from '@/types';

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
  onBlur: () => void;
  disabled: boolean;
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
}: ProfileFieldInputProps) {
  const p = useThemePalette();
  return (
    <View className="py-3">
      <Text className="mb-1 text-base font-medium text-foreground dark:text-darkForeground">{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        onBlur={onBlur}
        editable={!disabled}
        keyboardType={keyboardType}
        placeholder={placeholder}
        placeholderTextColor={p.mutedForeground}
        accessibilityLabel={accessibilityLabel}
        className="rounded-xl border border-border px-3 py-2 text-base text-foreground dark:border-darkBorder dark:text-darkForeground"
      />
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
  const [heightCmInput, setHeightCmInput] = useState('');
  const [weightKgInput, setWeightKgInput] = useState('');
  const [ageInput, setAgeInput] = useState('');
  const [profileSaving, setProfileSaving] = useState(false);
  const legalLinks = getLegalLinks();
  const goalDisplay = formatCalorieGoal(profile?.calorieGoal ?? null);
  const goalTypeDisplay = formatGoalType(profile?.goalType);
  const sex = profile?.profile.sex ?? null;
  const activityLevel = profile?.profile.activityLevel ?? null;

  const syncProfileInputs = useCallback((me: GetMeResponse) => {
    setHeightCmInput(me?.profile.heightCm != null ? String(me.profile.heightCm) : '');
    setWeightKgInput(me?.profile.weightKg != null ? String(me.profile.weightKg) : '');
    setAgeInput(me?.profile.age != null ? String(me.profile.age) : '');
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

  const patchProfileField = useCallback(
    async <K extends keyof UserProfileFields>(field: K, value: UserProfileFields[K]) => {
      if (!user) return;
      setProfileSaving(true);
      try {
        const me = await patchMe({ profile: { [field]: value } });
        setProfile(me);
        syncProfileInputs(me);
      } catch (err) {
        logAppError('settings/patchProfileField', err, { field });
        showToast('Could not save profile updates', 'error');
        syncProfileInputs(profile);
      } finally {
        setProfileSaving(false);
      }
    },
    [profile, syncProfileInputs, user]
  );

  const parseAndPatchNumber = useCallback(
    async (field: 'heightCm' | 'weightKg' | 'age', raw: string, max: number, integer = false) => {
      const trimmed = raw.trim();
      if (!trimmed) {
        await patchProfileField(field, null);
        return;
      }
      const parsed = Number(trimmed);
      const invalid =
        !Number.isFinite(parsed) ||
        parsed < 0 ||
        parsed > max ||
        (integer && !Number.isInteger(parsed));
      if (invalid) {
        showToast(`Enter a valid ${field === 'age' ? 'age' : field === 'heightCm' ? 'height' : 'weight'}`, 'error');
        syncProfileInputs(profile);
        return;
      }
      await patchProfileField(field, parsed);
    },
    [patchProfileField, profile, syncProfileInputs]
  );

  const handlePickSex = useCallback(
    (next: Sex) => {
      if (sex === next || profileSaving) return;
      void patchProfileField('sex', next);
    },
    [patchProfileField, profileSaving, sex]
  );

  const handlePickActivityLevel = useCallback(
    (next: ActivityLevel) => {
      if (activityLevel === next || profileSaving) return;
      void patchProfileField('activityLevel', next);
    },
    [activityLevel, patchProfileField, profileSaving]
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
          <SettingsRow label="Weight Goal" value={goalTypeDisplay} onPress={() => router.push('/(tabs)/calculator')} showChevron />
          <SettingsDivider />
          <ProfileFieldInput
            label="Height (cm)"
            accessibilityLabel="Height (cm)"
            value={heightCmInput}
            placeholder="e.g. 170"
            keyboardType="decimal-pad"
            disabled={!user || profileSaving}
            onChangeText={setHeightCmInput}
            onBlur={() => {
              void parseAndPatchNumber('heightCm', heightCmInput, 300);
            }}
          />
          <SettingsDivider />
          <ProfileFieldInput
            label="Weight (kg)"
            accessibilityLabel="Weight (kg)"
            value={weightKgInput}
            placeholder="e.g. 70.5"
            keyboardType="decimal-pad"
            disabled={!user || profileSaving}
            onChangeText={setWeightKgInput}
            onBlur={() => {
              void parseAndPatchNumber('weightKg', weightKgInput, 700);
            }}
          />
          <SettingsDivider />
          <ProfileFieldInput
            label="Age"
            accessibilityLabel="Age"
            value={ageInput}
            placeholder="e.g. 32"
            keyboardType="numeric"
            disabled={!user || profileSaving}
            onChangeText={setAgeInput}
            onBlur={() => {
              void parseAndPatchNumber('age', ageInput, 130, true);
            }}
          />
          <SettingsDivider />
          <View className="py-3">
            <Text className="mb-2 text-base font-medium text-foreground dark:text-darkForeground">Sex</Text>
            <View className="flex-row gap-2">
              {(['male', 'female'] as const).map((option) => {
                const selected = sex === option;
                return (
                  <Pressable
                    key={option}
                    onPress={() => handlePickSex(option)}
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
              {(['sedentary', 'light', 'moderate', 'active', 'very_active'] as const).map((option) => {
                const selected = activityLevel === option;
                return (
                  <Pressable
                    key={option}
                    onPress={() => handlePickActivityLevel(option)}
                    disabled={!user || profileSaving}
                    className={`rounded-full border px-3 py-2 ${selected ? 'border-primary bg-primary/10 dark:border-darkPrimary dark:bg-darkPrimary/20' : 'border-border dark:border-darkBorder'} disabled:opacity-50`}
                  >
                    <Text className="text-sm font-medium capitalize text-foreground dark:text-darkForeground">
                      {option.replace('_', ' ')}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
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
          <SettingsDivider />
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
