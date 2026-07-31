import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { AppState, type AppStateStatus } from 'react-native';
import { onAuthStateChanged, type User } from 'firebase/auth';

import { clearEtagCache } from '@/lib/api/etag-cache';
import { getFirebaseAuth } from '@/lib/firebase';
import { runNotificationStartup } from '@/lib/notifications/on-authenticated';
import { queryClient } from '@/lib/queries/query-client';

type AuthContextType = {
  user: User | null;
  loading: boolean;
};

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const auth = getFirebaseAuth();
    if (!auth) {
      setUser(null);
      setLoading(false);
      return;
    }
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser((prev) => {
        if (prev && !u) {
          queryClient.clear();
          clearEtagCache();
        }
        return u;
      });
      setLoading(false);
      if (u) {
        void runNotificationStartup(u.uid);
      }
    });
    return unsub;
  }, []);

  useEffect(() => {
    const onChange = (next: AppStateStatus) => {
      if (next !== 'active') return;
      const auth = getFirebaseAuth();
      const u = auth?.currentUser;
      if (u) {
        void runNotificationStartup(u.uid);
      }
    };
    const sub = AppState.addEventListener('change', onChange);
    return () => sub.remove();
  }, []);

  const value = useMemo(() => ({ user, loading }), [user, loading]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextType {
  return useContext(AuthContext);
}
