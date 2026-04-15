import { useEffect } from 'react';
import { Text, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { Button } from '@/components/ui/button';
import { logAppError, toUserErrorMessage } from '@/lib/app-errors';
import { completeGoogleSignIn } from '@/lib/firebase-auth';

import { isGoogleAuthConfigured, useGoogleIdTokenAuthRequest } from './use-google-auth';

export type GoogleSignInButtonProps = {
  loading: boolean;
  setLoading: (v: boolean) => void;
  setError: (message: string) => void;
};

/**
 * Renders nothing when the platform-specific Google OAuth client ID is missing
 * (avoids expo-auth-session throwing on iOS without `iosClientId`).
 */
export function GoogleSignInButton({ loading, setLoading, setError }: GoogleSignInButtonProps) {
  if (!isGoogleAuthConfigured()) {
    return null;
  }
  return <GoogleSignInButtonInner loading={loading} setLoading={setLoading} setError={setError} />;
}

function GoogleSignInButtonInner({ loading, setLoading, setError }: GoogleSignInButtonProps) {
  const { response, promptAsync, ready } = useGoogleIdTokenAuthRequest();

  useEffect(() => {
    if (response?.type === 'success') {
      const idToken =
        typeof response.params === 'object' && response.params && 'id_token' in response.params
          ? String((response.params as { id_token?: string }).id_token)
          : undefined;
      if (!idToken) return;
      setLoading(true);
      setError('');
      completeGoogleSignIn(idToken)
        .catch((e: unknown) => {
          logAppError('auth/google-complete', e);
          setError(toUserErrorMessage(e, 'Google sign-in failed. Please try again.'));
        })
        .finally(() => setLoading(false));
    } else if (response?.type === 'error') {
      const oauthErr = response.error;
      logAppError('auth/google-oauth', oauthErr ?? new Error('unknown OAuth error'), {
        oauthCode: oauthErr?.code,
      });
      setError(
        toUserErrorMessage(
          oauthErr ?? new Error('Google sign-in failed'),
          'Google sign-in failed. Please try again.'
        )
      );
    }
  }, [response, setError, setLoading]);

  return (
    <Button
      variant="outline"
      className="w-full"
      disabled={loading || !ready}
      onPress={() => promptAsync()}
    >
      <View className="flex-row items-center justify-center gap-2">
        <GoogleMark size={18} />
        <Text className="font-semibold text-foreground dark:text-darkForeground">Google</Text>
      </View>
    </Button>
  );
}

function GoogleMark({ size }: { size: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
        fill="#4285F4"
      />
      <Path
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
        fill="#34A853"
      />
      <Path
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
        fill="#FBBC05"
      />
      <Path
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
        fill="#EA4335"
      />
    </Svg>
  );
}
