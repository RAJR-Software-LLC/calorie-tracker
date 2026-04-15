import { useEffect, useState } from 'react';
import { Text } from 'react-native';
import { useRouter } from 'expo-router';

import { useAuth } from '@/components/auth/auth-provider';
import { ExternalLink } from '@/components/ExternalLink';
import { AppScreen } from '@/components/layout/app-screen';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { logAppError } from '@/lib/app-errors';
import { getMe } from '@/lib/api';
import { getLegalLinks } from '@/lib/env';
import { signOutUser } from '@/lib/firebase-auth';
import type { GetMeResponse } from '@/types';

export default function SettingsScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const [profile, setProfile] = useState<GetMeResponse>(null);
  const legalLinks = getLegalLinks();

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

  async function handleSignOut() {
    await signOutUser();
    router.replace('/(auth)/login');
  }

  return (
    <AppScreen>
      <Text className="text-lg font-semibold text-foreground dark:text-darkForeground">Settings</Text>
      <Text className="text-sm text-muted-foreground dark:text-darkMutedForeground">
        Account and preferences
      </Text>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Profile</CardTitle>
          <CardDescription>Signed in as {user?.email ?? '—'}</CardDescription>
        </CardHeader>
        <CardContent className="gap-2">
          {profile?.goalCalories != null ? (
            <Text className="text-sm text-foreground dark:text-darkForeground">
              Daily goal: {profile.goalCalories} kcal
            </Text>
          ) : (
            <Text className="text-sm text-muted-foreground dark:text-darkMutedForeground">
              Set a goal in the backend or future profile editor.
            </Text>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Legal and compliance</CardTitle>
          <CardDescription>Store policy and privacy disclosures</CardDescription>
        </CardHeader>
        <CardContent className="gap-3">
          <Button variant="outline" className="w-full" onPress={() => router.push('/legal')}>
            View legal disclosures
          </Button>
          {legalLinks.privacyPolicyUrl ? (
            <ExternalLink href={legalLinks.privacyPolicyUrl} className="text-sm text-primary underline">
              Privacy Policy
            </ExternalLink>
          ) : null}
          {legalLinks.termsOfUseUrl ? (
            <ExternalLink href={legalLinks.termsOfUseUrl} className="text-sm text-primary underline">
              Terms of Use
            </ExternalLink>
          ) : null}
          {legalLinks.accountDeletionUrl ? (
            <ExternalLink href={legalLinks.accountDeletionUrl} className="text-sm text-primary underline">
              Account deletion instructions
            </ExternalLink>
          ) : null}
        </CardContent>
      </Card>

      <Button variant="destructive" className="w-full" onPress={handleSignOut}>
        Sign out
      </Button>
    </AppScreen>
  );
}
