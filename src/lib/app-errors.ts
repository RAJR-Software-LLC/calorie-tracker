import { ApiError } from '@/lib/api/errors';
import { captureMonitoringError } from '@/lib/monitoring';

const LOG_PREFIX = '[calorie-tracker]';

const FIREBASE_AUTH_USER_MESSAGES: Record<string, string> = {
  'auth/configuration-not-found':
    "Sign-in isn't set up for this Firebase project yet, or this device can't reach Firebase Auth. Check Firebase Console and try again.",
  'auth/email-already-in-use': 'That email is already registered. Try signing in.',
  'auth/invalid-email': 'Please enter a valid email address.',
  'auth/invalid-credential': 'Incorrect email or password.',
  'auth/weak-password': 'Password is too weak. Use a stronger password.',
  'auth/operation-not-allowed': 'Email/password sign-in is not enabled for this Firebase project.',
  'auth/network-request-failed': 'Network error. Check your connection and try again.',
  'auth/too-many-requests': 'Too many attempts. Try again later.',
  'auth/user-disabled': 'This account has been disabled.',
  'auth/user-not-found': 'No account found for this email.',
  'auth/wrong-password': 'Incorrect password.',
  'auth/internal-error': 'Something went wrong on the server. Try again later.',
};

/** Logged in development to help debug configuration issues (not shown in UI). */
const FIREBASE_AUTH_DEV_HINTS: Record<string, string> = {
  'auth/configuration-not-found':
    'Firebase Console → Build → Authentication: open the page (Get started), then Sign-in method → Email/Password → Enable. If that is already on: Google Cloud → APIs → ensure Identity Toolkit API is enabled; Credentials → your Browser key → API restrictions must include Identity Toolkit (or None while debugging). Config: all EXPO_PUBLIC_FIREBASE_* values must be one Web app from Project settings; EXPO_PUBLIC_FIREBASE_APP_ID must contain ":web:". Empty EXPO_PUBLIC_* in the shell overrides .env — run `env | grep EXPO_PUBLIC_FIREBASE`.',
};

function firebaseAuthCode(err: unknown): string | undefined {
  if (typeof err !== 'object' || err === null || !('code' in err)) return undefined;
  const code = (err as { code?: unknown }).code;
  return typeof code === 'string' && code.startsWith('auth/') ? code : undefined;
}

function humanizeAuthCode(code: string): string {
  const slug = code.replace(/^auth\//, '').replace(/-/g, ' ');
  return slug.replace(/\b\w/g, (c) => c.toUpperCase());
}

function apiErrorUserMessage(err: ApiError): string {
  switch (err.status) {
    case 401:
      return 'Please sign in again.';
    case 403:
      return "You don't have permission to do that.";
    case 404:
      return "We couldn't find that resource.";
    case 409:
      return 'That action conflicts with existing data. Try again.';
    case 422:
      return "We couldn't process that request.";
    case 429:
      return 'Too many requests. Please wait a moment.';
    default:
      if (err.status >= 500) {
        return 'Something went wrong on our server. Please try again later.';
      }
      if (err.status === 400) {
        const m = err.message.trim();
        if (m.length > 0 && m.length <= 120) return m;
        return 'Invalid request. Please check your input.';
      }
      return err.message.trim() || 'Something went wrong. Please try again.';
  }
}

/**
 * Structured log for debugging. Prefer calling this once per failure from a `catch` block.
 */
export function logAppError(context: string, err: unknown, meta?: Record<string, unknown>): void {
  const payload: Record<string, unknown> = { context, ...meta };

  if (err instanceof Error) {
    payload.errorName = err.name;
    payload.errorMessage = err.message;
  }
  if (err instanceof ApiError) {
    payload.httpStatus = err.status;
    payload.apiBody = err.body;
    if (err.requestUrl) {
      payload.requestUrl = err.requestUrl;
    }
  }

  const code = firebaseAuthCode(err);
  if (code) {
    payload.firebaseAuthCode = code;
    if (__DEV__ && FIREBASE_AUTH_DEV_HINTS[code]) {
      payload.devHint = FIREBASE_AUTH_DEV_HINTS[code];
    }
  }

  captureMonitoringError(err, context, {
    errorName: payload.errorName as string | undefined,
    httpStatus: payload.httpStatus as number | undefined,
    firebaseAuthCode: payload.firebaseAuthCode as string | undefined,
  });

  console.error(`${LOG_PREFIX}`, payload);
  if (__DEV__ && err instanceof Error && err.stack) {
    console.error(err.stack);
  }
}

/**
 * Short, user-safe copy for banners and toasts.
 */
export function toUserErrorMessage(err: unknown, fallback: string): string {
  if (err instanceof ApiError) {
    return apiErrorUserMessage(err);
  }

  const code = firebaseAuthCode(err);
  if (code) {
    return FIREBASE_AUTH_USER_MESSAGES[code] ?? humanizeAuthCode(code);
  }

  if (err instanceof Error) {
    const m = err.message.replace(/^Firebase:\s*/i, '').trim();
    if (m && !m.includes('EXPO_PUBLIC_') && m.length <= 160) {
      return m;
    }
    return fallback;
  }

  return fallback;
}
