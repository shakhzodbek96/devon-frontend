import { Navigate } from 'react-router-dom';
import type { ReactElement } from 'react';
import { useAuthStore } from '@/stores/useAuthStore';
import type { Role } from '@/types/domain';

interface Props {
  allowedRoles: Role[];
  children: ReactElement;
}

/**
 * Role guard for admin-only surfaces (e.g. `/users` — PLAN_AUTH_ROLES.md
 * §2.4). Assumes `RequireAuth` already ran (session exists); redirects
 * home when the session user holds none of `allowedRoles`.
 */
export function RequireRole({ allowedRoles, children }: Props) {
  const roles = useAuthStore((s) => s.user?.roles) ?? [];
  const allowed = roles.some((r) => allowedRoles.includes(r));

  if (!allowed) {
    return <Navigate to="/" replace />;
  }

  return children;
}
