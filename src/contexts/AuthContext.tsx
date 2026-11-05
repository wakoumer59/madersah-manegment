// Global auth state: the Firebase Auth user plus the app's UserRecord
// (role, institution, status). All role checks for UI live here; the real
// enforcement is always in Firebase Security Rules.
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import type { User } from 'firebase/auth';
import { getFirebaseConfigError } from '@/firebase/config';
import { signIn as signInUser, signOutUser, watchAuth } from '@/services/authService';
import { getMyUser } from '@/services/userService';
import type { UserRecord, UserRole } from '@/types';

interface AuthContextValue {
  authUser: User | null;
  userRecord: UserRecord | null;
  /** true while the initial auth state + user record are loading */
  loading: boolean;
  /** set when Firebase env config is missing — app shows setup instructions */
  configError: string | null;
  /** set when the auth account exists but no user record can be loaded */
  accountError: string | null;
  role: UserRole | null;
  isOwner: boolean;
  isAdmin: boolean;
  isTeacher: boolean;
  isStaff: boolean;
  isStudent: boolean;
  isPending: boolean;
  refreshUserRecord: () => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

async function loadRecordWithRetry(
  uid: string,
  isCancelled: () => boolean,
): Promise<UserRecord | null> {
  for (let attempt = 0; attempt < 3; attempt++) {
    const record = await getMyUser(uid);
    if (record || isCancelled()) return record;
    // Small delay: during sign-up the user record is written immediately after
    // the auth account is created, so one retry race is expected.
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  return null;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [configError] = useState(() => getFirebaseConfigError());
  const [authUser, setAuthUser] = useState<User | null>(null);
  const [userRecord, setUserRecord] = useState<UserRecord | null>(null);
  const [accountError, setAccountError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const authStateVersion = useRef(0);

  useEffect(() => {
    if (configError) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    const unsubscribe = watchAuth(async (user) => {
      if (cancelled) return;
      const version = ++authStateVersion.current;
      setLoading(true);
      setAuthUser(user);
      setAccountError(null);
      if (!user) {
        setUserRecord(null);
        setLoading(false);
        return;
      }
      setUserRecord(null);
      try {
        const record = await loadRecordWithRetry(user.uid, () => cancelled);
        if (cancelled || version !== authStateVersion.current) return;
        if (record) {
          setUserRecord(record);
        } else {
          setUserRecord(null);
          setAccountError(
            'Your account record could not be loaded. It may not be fully set up yet. ' +
              'Please contact your administrator or try again later.',
          );
        }
      } catch {
        if (cancelled || version !== authStateVersion.current) return;
        setUserRecord(null);
        setAccountError(
          'Could not load your account. Check your connection and try again.',
        );
      } finally {
        if (!cancelled && version === authStateVersion.current) setLoading(false);
      }
    });
    return () => {
      cancelled = true;
      authStateVersion.current += 1;
      unsubscribe();
    };
  }, [configError]);

  const signIn = useCallback(async (email: string, password: string) => {
    setLoading(true);
    setAccountError(null);
    try {
      const user = await signInUser(email, password);
      const version = ++authStateVersion.current;
      setAuthUser(user);
      setUserRecord(null);
      try {
        const record = await loadRecordWithRetry(
          user.uid,
          () => version !== authStateVersion.current,
        );
        if (version !== authStateVersion.current) return;
        setUserRecord(record);
        if (!record) {
          setAccountError(
            'Your account record could not be loaded. It may not be fully set up yet. ' +
              'Please contact your administrator or try again later.',
          );
        }
      } catch {
        if (version !== authStateVersion.current) return;
        setUserRecord(null);
        setAccountError('Could not load your account. Check your connection and try again.');
      } finally {
        if (version === authStateVersion.current) setLoading(false);
      }
    } catch (error) {
      setLoading(false);
      throw error;
    }
  }, []);

  const refreshUserRecord = useCallback(async () => {
    if (!authUser) return;
    const record = await getMyUser(authUser.uid);
    setUserRecord(record);
  }, [authUser]);

  const signOut = useCallback(async () => {
    await signOutUser();
  }, []);

  const value = useMemo<AuthContextValue>(() => {
    const role = userRecord?.role ?? null;
    return {
      authUser,
      userRecord,
      loading,
      configError,
      accountError,
      role,
      isOwner: role === 'platformOwner',
      isAdmin: role === 'institutionAdmin',
      isTeacher: role === 'teacher',
      isStaff: role === 'institutionAdmin' || role === 'teacher',
      isStudent: role === 'student',
      isPending: role === 'pending',
      signIn,
      refreshUserRecord,
      signOut,
    };
  }, [authUser, userRecord, loading, configError, accountError, signIn, refreshUserRecord, signOut]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}
