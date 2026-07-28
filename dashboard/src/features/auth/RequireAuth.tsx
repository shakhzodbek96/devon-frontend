import { Navigate, useLocation } from 'react-router-dom';
import type { ReactElement } from 'react';
import { useAuthStore } from '@/stores/useAuthStore';

const CHANGE_PASSWORD_PATH = '/change-password';

interface Props {
  children: ReactElement;
}

export function RequireAuth({ children }: Props) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const isExpired = useAuthStore((s) => s.isExpired);
  const logout = useAuthStore((s) => s.logout);
  const mustChangePassword = useAuthStore((s) => s.user?.mustChangePassword ?? false);
  const location = useLocation();

  if (!isAuthenticated || isExpired()) {
    if (isExpired()) logout();
    const from = encodeURIComponent(location.pathname + location.search);
    return <Navigate to={`/login?from=${from}`} replace />;
  }

  // Forced first-login password change (PLAN_AUTH_ROLES.md §2.3) — blocks
  // every other authenticated route until the user changes their password.
  if (mustChangePassword && location.pathname !== CHANGE_PASSWORD_PATH) {
    return <Navigate to={CHANGE_PASSWORD_PATH} replace />;
  }

  return children;
}
