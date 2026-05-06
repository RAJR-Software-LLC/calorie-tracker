import { useFocusEffect } from '@react-navigation/native';
import { useRouter } from 'expo-router';
import {
  Bell,
  ChevronRight,
  ExternalLink as ExternalLinkIcon,
  FileText,
  LogOut,
  Mail,
  Shield,
  Target,
  User,
} from 'lucide-react-native';
import { useCallback, useEffect, useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { useAuth } from '@/components/auth/auth-provider';
import { ExternalLink } from '@/components/ExternalLink';
import { AppScreen } from '@/components/layout/app-screen';
import { NotificationsSettings } from '@/components/settings/notifications-settings';
import { Card, CardContent } from '@/components/ui/card';
import { getMe } from '@/lib/api';
import { logAppError } from '@/lib/app-errors';
import { formatCalorieGoal } from '@/lib/calorie-goal';
import { getLegalLinks } from '@/lib/env';
import { signOutUser } from '@/lib/firebase-auth';
import { withNotificationDefaults } from '@/lib/notifications/defaults';
import { useThemePalette } from '@/lib/use-theme-palette';
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

function SettingsDivider() {
  return <View className="h-px bg-border/50 dark:bg-darkBorder/50" />;
}

export default function SettingsScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const p = useThemePalette();
  const [profile, setProfile] = useState<GetMeResponse>(null);
  const [showNotifications, setShowNotifications] = useState(false);
  const legalLinks = getLegalLinks();
  const goalDisplay = formatCalorieGoal(profile?.calorieGoal ?? null);

  useEffect(() => {
    if (!user) {
      setProfile(null);
    }
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

  return (
    <AppScreen>
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
            <View className="h-12 w-12 items-center justify-center rounded-full bg-primary/15 dark:bg-darkPrimary/25">
              <User size={24} color={p.primary} />
            </View>
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
        </CardContent>
      </Card>

      {showNotifications ? (
        <NotificationsSettings
          initial={profile?.notifications ? withNotificationDefaults(profile.notifications) : null}
          onSaved={(me) => setProfile(me)}
        />
      ) : null}

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
    </AppScreen>
  );
}
