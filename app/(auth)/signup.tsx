import { useState } from 'react';
import { Platform, Pressable, ScrollView, Text, View } from 'react-native';
import { Link } from 'expo-router';
import Svg, { Path } from 'react-native-svg';

import { GoogleSignInButton } from '@/components/auth/google-sign-in-button';
import { isGoogleAuthConfigured } from '@/components/auth/use-google-auth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { logAppError, toUserErrorMessage } from '@/lib/app-errors';
import { signInWithApple, signUpWithEmail } from '@/lib/firebase-auth';
import { useThemePalette } from '@/lib/use-theme-palette';
import { Leaf } from 'lucide-react-native';

export default function SignupScreen() {
  const p = useThemePalette();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit() {
    setError('');
    if (password.length < 6) {
      setError('Password should be at least 6 characters');
      return;
    }
    setLoading(true);
    try {
      await signUpWithEmail(email, password, name);
    } catch (err: unknown) {
      logAppError('auth/signup-email', err);
      setError(toUserErrorMessage(err, 'Could not create account'));
    } finally {
      setLoading(false);
    }
  }

  async function handleApple() {
    setError('');
    setLoading(true);
    try {
      await signInWithApple();
    } catch (err: unknown) {
      logAppError('auth/signup-apple', err);
      setError(toUserErrorMessage(err, 'Sign-in failed. Please try again.'));
    } finally {
      setLoading(false);
    }
  }

  return (
    <ScrollView
      className="flex-1 bg-background dark:bg-darkBackground"
      contentContainerClassName="min-h-full flex-1 items-center justify-center px-4 py-12"
      keyboardShouldPersistTaps="handled"
    >
      <Card className="w-full max-w-md">
        <CardHeader>
          <View className="mb-3 items-center">
            <View className="h-12 w-12 items-center justify-center rounded-xl bg-primary/10 dark:bg-darkPrimary/10">
              <Leaf size={24} color={p.primary} />
            </View>
          </View>
          <CardTitle className="text-center">Join NourishLog</CardTitle>
          <CardDescription className="text-center">Start your journey to mindful eating</CardDescription>
        </CardHeader>
        <CardContent className="gap-4">
          {error ? (
            <View className="rounded-lg bg-warning/10 px-4 py-3">
              <Text className="text-sm text-warning-foreground">{error}</Text>
            </View>
          ) : null}
          <View className="gap-2">
            <Label>Your name</Label>
            <Input placeholder="How should we greet you?" value={name} onChangeText={setName} />
          </View>
          <View className="gap-2">
            <Label>Email</Label>
            <Input
              autoCapitalize="none"
              keyboardType="email-address"
              autoComplete="email"
              placeholder="you@example.com"
              value={email}
              onChangeText={setEmail}
            />
          </View>
          <View className="gap-2">
            <Label>Password</Label>
            <Input
              secureTextEntry
              autoComplete="new-password"
              placeholder="At least 6 characters"
              value={password}
              onChangeText={setPassword}
            />
          </View>
          <Button disabled={loading} className="w-full" onPress={handleSubmit}>
            {loading ? 'Creating account...' : 'Create account'}
          </Button>

          {isGoogleAuthConfigured() || Platform.OS === 'ios' ? (
            <>
              <View className="my-4 flex-row items-center">
                <View className="h-px flex-1 bg-border dark:bg-darkBorder" />
                <Text className="mx-2 text-xs uppercase text-muted-foreground dark:text-darkMutedForeground">
                  or continue with
                </Text>
                <View className="h-px flex-1 bg-border dark:bg-darkBorder" />
              </View>

              <View className="gap-3">
                <GoogleSignInButton loading={loading} setLoading={setLoading} setError={setError} />
                {Platform.OS === 'ios' ? (
                  <Button variant="outline" className="w-full" disabled={loading} onPress={handleApple}>
                    <View className="flex-row items-center justify-center gap-2">
                      <AppleMark size={18} color={p.foreground} />
                      <Text className="font-semibold text-foreground dark:text-darkForeground">Apple</Text>
                    </View>
                  </Button>
                ) : null}
              </View>
            </>
          ) : null}
        </CardContent>
        <CardFooter>
          <View className="flex-row flex-wrap items-center justify-center">
            <Text className="text-center text-sm text-muted-foreground dark:text-darkMutedForeground">
              Already have an account?{' '}
            </Text>
            <Link href="/(auth)/login" asChild>
              <Pressable>
                <Text className="text-sm font-medium text-primary dark:text-darkPrimary">Sign in</Text>
              </Pressable>
            </Link>
          </View>
        </CardFooter>
      </Card>
    </ScrollView>
  );
}

function AppleMark({ size, color }: { size: number; color: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
      <Path d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.48-3.24 0-1.44.62-2.2.44-3.06-.4C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z" />
    </Svg>
  );
}
