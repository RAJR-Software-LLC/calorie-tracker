import type { User } from 'firebase/auth';

import { getMe, patchMe } from '@/lib/api';
import { queryClient } from '@/lib/queries/query-client';
import { queryKeys } from '@/lib/queries/keys';
import { updateMeCache } from '@/lib/queries/use-me';

/**
 * Ensure backend user profile exists after Firebase sign-in (replaces v0 Firestore user doc).
 */
export async function bootstrapUserProfile(user: User): Promise<void> {
  try {
    const me = await getMe();
    const name = user.displayName?.trim() || user.email?.split('@')[0] || 'Friend';
    if (!me) {
      const created = await patchMe({ displayName: name, email: user.email });
      if (created) {
        updateMeCache(queryClient, user.uid, created);
      } else {
        await queryClient.invalidateQueries({ queryKey: queryKeys.me(user.uid) });
      }
      return;
    }
    updateMeCache(queryClient, user.uid, me);
    if (!me.displayName?.trim() && name) {
      const updated = await patchMe({ displayName: name });
      if (updated) {
        updateMeCache(queryClient, user.uid, updated);
      } else {
        await queryClient.invalidateQueries({ queryKey: queryKeys.me(user.uid) });
      }
    }
  } catch {
    // Dev without API — ignore
  }
}
