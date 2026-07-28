import type { Role } from '@/types/domain';
import { apiFetch } from './client';

export interface RoleOption {
  code: Role;
  nameUz: string;
}

export function listRoles(): Promise<RoleOption[]> {
  return apiFetch<RoleOption[]>('/roles');
}
