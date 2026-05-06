import { useFocusEffect } from '@react-navigation/native';
import { useRouter } from 'expo-router';
import {
  Bell,
  Camera,
  ChevronRight,
  ExternalLink as ExternalLinkIcon,
  FileText,
  LogOut,
  Mail,
  Shield,
  Target,
} from 'lucide-react-native';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Modal, Pressable, Text, View } from 'react-native';

import { useAuth } from '@/components/auth/auth-provider';
import { ExternalLink } from '@/components/ExternalLink';
import { AppScreen } from '@/components/layout/app-screen';
import { NotificationsSettings } from '@/components/settings/notifications-settings';
import { Avatar } from '@/components/ui/avatar';
import { Card, CardContent } from '@/components/ui/card';
import { getMe } from '@/lib/api';
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
import type { GetMeResponse } from '@/types';

type SettingsRowProps = {
  icon: React.ReactNode;
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
      <View
        className={`h-9 w-9 items-center justify-center rounded-xl ${destructive ? 'bg-destructive/10 dark:bg-darkDestructive/20' : 'bg-primary/10 dark:bg-darkPrimary/20'}`}
      >
        {icon}
      </View>
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

export default function SettingsScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const p = useThemePalette();
  const [profile, setProfile] = useState<GetMeResponse>(null);
  const [showNotifications, setShowNotifications] = useState(false);
  const [photoSheetOpen, setPhotoSheetOpen] = useState(false);
  const [photoUploading, setPhotoUploading] = useState(false);
  const legalLinks = getLegalLinks();
  const goalDisplay = formatCalorieGoal(profile?.calorieGoal ?? null);

  useEffect(() => {
    if (!user) {
      setProfile(null);
      return;
    }
    void getMe()
      .then(setProfile)
      .catch((err) => {
        logAppError('settings/getMe', err);
        setProfile(null);
      });
  }, [user]);

  useFocusEffect(
    useCallback(() => {
      if (!user) return;
      let cancelled = false;
      void (async () => {
        try {
          const me = await getMe();
          if (!cancelled) setProfile(me);
        } catch (err) {
          logAppError('settings/loadProfile', err);
        }
      })();
      return () => {
        cancelled = true;
      };
    }, [user])
  );

  const handleSignOut = () => {
    void signOutUser();
  };

  const refreshProfileFromServer = useCallback(() => {
    if (!user) return;
    void getMe()
      .then(setProfile)
      .catch((err) => logAppError('settings/refreshProfilePhoto', err));
  }, [user]);

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
            icon={<Target size={18} color={p.primary} />}
            label="Daily Goal"
            value={goalDisplay != null ? `${goalDisplay} kcal` : 'Not set'}
            onPress={() => router.push('/(tabs)/calculator')}
            showChevron
          />
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
            icon={<FileText size={18} color={p.primary} />}
            label="Legal Disclosures"
            onPress={() => router.push('/legal')}
            showChevron
          />
          {legalLinks.privacyPolicyUrl ? (
            <>
              <SettingsDivider />
              <ExternalLink href={legalLinks.privacyPolicyUrl}>
                <SettingsRow
                  icon={<ExternalLinkIcon size={18} color={p.primary} />}
                  label="Privacy Policy"
                />
              </ExternalLink>
            </>
          ) : null}
          {legalLinks.termsOfUseUrl ? (
            <>
              <SettingsDivider />
              <ExternalLink href={legalLinks.termsOfUseUrl}>
                <SettingsRow
                  icon={<ExternalLinkIcon size={18} color={p.primary} />}
                  label="Terms of Use"
                />
              </ExternalLink>
            </>
          ) : null}
          {legalLinks.accountDeletionUrl ? (
            <>
              <SettingsDivider />
              <ExternalLink href={legalLinks.accountDeletionUrl}>
                <SettingsRow
                  icon={<ExternalLinkIcon size={18} color={p.primary} />}
                  label="Account Deletion"
                />
              </ExternalLink>
            </>
          ) : null}
        </CardContent>
      </Card>

      {/* Sign Out */}
      <Card>
        <CardContent className="p-3">
          <SettingsRow
            icon={<LogOut size={18} color={p.destructive} />}
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
