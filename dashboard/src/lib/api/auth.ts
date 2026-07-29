import type { Role } from '@/types/domain';
import { apiFetch } from './client';

/**
 * Server-shaped user — matches `UserResource` on the backend (`AUTH_API.md`).
 * `employeeUuid` / `passwordChangedAt` (PLAN_PHASE_C.md §4) are additive —
 * consumed by the Employees module's `findUserByEmail` facade
 * (`src/lib/api/employees.ts`), signature-compatible with the mock's
 * `User` fields of the same name.
 */
export interface ApiSessionUser {
  uuid: string;
  email: string;
  fullName: string;
  roles: Role[];
  mustChangePassword: boolean;
  status: 'ACTIVE' | 'SUSPENDED';
  createdAt: string;
  employeeUuid?: string;
  passwordChangedAt?: string;
}

export interface LoginResponse {
  token: string;
  user: ApiSessionUser;
}

export function login(email: string, password: string): Promise<LoginResponse> {
  return apiFetch<LoginResponse>('/auth/login', {
    method: 'POST',
    body: { email, password },
    auth: false,
  });
}

export function me(): Promise<ApiSessionUser> {
  return apiFetch<ApiSessionUser>('/auth/me');
}

export function logout(): Promise<void> {
  return apiFetch<void>('/auth/logout', { method: 'POST' });
}

export function changePassword(currentPassword: string, newPassword: string): Promise<void> {
  return apiFetch<void>('/auth/change-password', {
    method: 'POST',
    body: { current_password: currentPassword, new_password: newPassword },
  });
}
