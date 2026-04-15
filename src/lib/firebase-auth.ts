import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithCredential,
  signOut as firebaseSignOut,
  updateProfile,
  GoogleAuthProvider,
  OAuthProvider,
  type User,
} from 'firebase/auth';
import * as AppleAuthentication from 'expo-apple-authentication';
import * as Crypto from 'expo-crypto';

import { bootstrapUserProfile } from '@/lib/auth-bootstrap';

import { getFirebaseAuth } from './firebase';

function requireAuth() {
  const auth = getFirebaseAuth();
  if (!auth) {
    throw new Error('Firebase is not configured. Set EXPO_PUBLIC_FIREBASE_* in .env.');
  }
  return auth;
}

export async function signInWithEmail(email: string, password: string): Promise<User> {
  const auth = requireAuth();
  const cred = await signInWithEmailAndPassword(auth, email, password);
  await bootstrapUserProfile(cred.user);
  return cred.user;
}

export async function signUpWithEmail(
  email: string,
  password: string,
  displayName: string
): Promise<User> {
  const auth = requireAuth();
  const cred = await createUserWithEmailAndPassword(auth, email, password);
  await updateProfile(cred.user, { displayName });
  await bootstrapUserProfile(cred.user);
  return cred.user;
}

export async function signOutUser(): Promise<void> {
  const auth = getFirebaseAuth();
  if (!auth) return;
  await firebaseSignOut(auth);
}

export async function completeGoogleSignIn(idToken: string): Promise<User> {
  const auth = requireAuth();
  const credential = GoogleAuthProvider.credential(idToken);
  const cred = await signInWithCredential(auth, credential);
  await bootstrapUserProfile(cred.user);
  return cred.user;
}

export async function signInWithApple(): Promise<User> {
  const auth = requireAuth();
  const isAvailable = await AppleAuthentication.isAvailableAsync();
  if (!isAvailable) {
    throw new Error('Apple Sign-In is not available on this device.');
  }

  const nonce =
    Math.random().toString(36).substring(2, 10) + Math.random().toString(36).substring(2, 10);
  const hashedNonce = await Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    nonce,
    { encoding: Crypto.CryptoEncoding.HEX }
  );

  const apple = await AppleAuthentication.signInAsync({
    requestedScopes: [
      AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
      AppleAuthentication.AppleAuthenticationScope.EMAIL,
    ],
    nonce: hashedNonce,
  });

  if (!apple.identityToken) {
    throw new Error('Apple did not return an identity token.');
  }

  const provider = new OAuthProvider('apple.com');
  const credential = provider.credential({
    idToken: apple.identityToken,
    rawNonce: nonce,
  });

  const cred = await signInWithCredential(auth, credential);
  if (apple.fullName?.givenName || apple.fullName?.familyName) {
    const name = [apple.fullName?.givenName, apple.fullName?.familyName].filter(Boolean).join(' ');
    if (name.trim()) {
      await updateProfile(cred.user, { displayName: name.trim() });
    }
  }
  await bootstrapUserProfile(cred.user);
  return cred.user;
}

