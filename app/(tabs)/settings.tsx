import { useEffect, useState } from 'react';
import { Text } from 'react-native';
import { useRouter } from 'expo-router';

import { useAuth } from '@/components/auth/auth-provider';
import { AppScreen } from '@/components/layout/app-screen';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { logAppError } from '@/lib/app-errors';
import { getMe } from '@/lib/api';
import { signOutUser } from '@/lib/firebase-auth';
import type { GetMeResponse } from '@/types';

export default function SettingsScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const [profile, setProfile] = useState<GetMeResponse>(null);

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

      <Button variant="destructive" className="w-full" onPress={handleSignOut}>
        Sign out
      </Button>
    </AppScreen>
  );
}
