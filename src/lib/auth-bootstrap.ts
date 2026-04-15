import type { User } from 'firebase/auth';

import { getMe, patchMe } from '@/lib/api';

/**
 * Ensure backend user profile exists after Firebase sign-in (replaces v0 Firestore user doc).
 */
export async function bootstrapUserProfile(user: User): Promise<void> {
  try {
    const me = await getMe();
    const name = user.displayName?.trim() || user.email?.split('@')[0] || 'Friend';
    if (!me) {
      await patchMe({ displayName: name, email: user.email });
      return;
    }
    if (!me.displayName?.trim() && name) {
      await patchMe({ displayName: name });
    }
  } catch {
    // Dev without API — ignore
  }
}
