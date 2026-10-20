import type { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { useAuth } from '@/contexts/AuthContext';
import { SetupNoticePage } from '@/pages/SetupNoticePage';
import type { UserRole } from '@/types';

/** The home route for each role. '/' redirects here. */
export function homePathForRole(role: UserRole | null): string {
  switch (role) {
    case 'platformOwner':
      return '/owner';
    case 'institutionAdmin':
    case 'teacher':
      return '/admin';
    case 'student':
      return '/student';
    case 'pending':
      return '/pending';
    default:
      return '/login';
  }
}

/** Blocks rendering until auth state is known; redirects guests to /login. */
export function RequireAuth({ children }: { children: ReactNode }) {
  const { authUser, userRecord, loading, configError, accountError } = useAuth();

  if (configError) {
    return <SetupNoticePage title="Configuration required" message={configError} />;
  }
  if (loading) return <LoadingSpinner fullPage />;
  if (!authUser) return <Navigate to="/login" replace />;
  if (!userRecord && accountError) {
    return <SetupNoticePage title="Account problem" message={accountError} />;
  }
  return <>{children}</>;
}

interface RequireRoleProps {
  roles: UserRole[];
  children: ReactNode;
}

/** Renders children only for allowed roles; otherwise sends the user home. */
export function RequireRole({ roles, children }: RequireRoleProps) {
  const { userRecord } = useAuth();
  if (userRecord && !roles.includes(userRecord.role)) {
    return <Navigate to={homePathForRole(userRecord.role)} replace />;
  }
  return <RequireAuth>{children}</RequireAuth>;
}
