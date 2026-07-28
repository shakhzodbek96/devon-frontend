import type { Role } from '@/types/domain';
import type { ApiSessionUser } from './auth';
import { apiFetch } from './client';

export function listUsers(search?: string): Promise<ApiSessionUser[]> {
  const qs = search?.trim() ? `?search=${encodeURIComponent(search.trim())}` : '';
  return apiFetch<ApiSessionUser[]>(`/users${qs}`);
}

export interface CreateUserInput {
  email: string;
  fullName: string;
  roles: Role[];
  /** Omit to have the server generate a secure temporary password. */
  password?: string;
}

export interface CreateUserResponse {
  user: ApiSessionUser;
  /** Present only when `password` was omitted — shown once, never again. */
  tempPassword?: string;
}

export function createUser(input: CreateUserInput): Promise<CreateUserResponse> {
  return apiFetch<CreateUserResponse>('/users', { method: 'POST', body: input });
}

export interface UpdateUserInput {
  fullName?: string;
  roles?: Role[];
  status?: 'ACTIVE' | 'SUSPENDED';
}

export function updateUser(uuid: string, input: UpdateUserInput): Promise<ApiSessionUser> {
  return apiFetch<ApiSessionUser>(`/users/${uuid}`, { method: 'PATCH', body: input });
}

export function resetUserPassword(uuid: string): Promise<{ tempPassword: string }> {
  return apiFetch<{ tempPassword: string }>(`/users/${uuid}/reset-password`, { method: 'POST' });
}
