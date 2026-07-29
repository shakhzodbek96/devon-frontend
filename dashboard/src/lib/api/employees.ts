// Real backend for the Employees module (PLAN_PHASE_C.md §2). Signature-
// compatible with the mock's `listEmployees` / `getEmployee` /
// `createEmployeeFull` / `updateEmployee` / `terminateEmployee` /
// `findUserByEmail` (`src/lib/mock-backend/index.ts`) so
// `src/lib/data/employees.ts` can re-export either implementation
// unchanged.
//
// Error translation: business-rule violations come back from the API as a
// 422 `{ code, message }` body (`bootstrap/app.php` on the backend). We
// reuse the mock's own `EmployeeValidationError` / `MockNetworkError`
// classes (framework-agnostic — no localStorage dependency) so every
// consumer's `err instanceof EmployeeValidationError` check works
// identically against either backend.

import {
  EmployeeValidationError,
  MockNetworkError,
  type EmployeeValidationCode,
} from '@/lib/mock-backend/errors';
import type { Employee, EmploymentOrderExtract } from '@/types/domain';
import { apiFetch, ApiError } from './client';
import type { ApiSessionUser } from './auth';

const KNOWN_CODES: readonly EmployeeValidationCode[] = [
  'pinfl-taken',
  'email-taken',
  'order-extract-missing',
  'position-instruction-missing',
  'termination-extract-missing',
];

function isEmployeeValidationCode(code: string | undefined): code is EmployeeValidationCode {
  return !!code && (KNOWN_CODES as readonly string[]).includes(code);
}

/** Rethrows `err` translated to the mock's error vocabulary; always throws. */
function rethrow(err: unknown): never {
  if (err instanceof ApiError) {
    if (isEmployeeValidationCode(err.code)) throw new EmployeeValidationError(err.code);
    if (err.status === 0) throw new MockNetworkError();
  }
  throw err;
}

export interface EmployeeFilters {
  search?: string;
  unitUuid?: string;
  status?: Employee['status'];
  positionId?: string;
}

export async function listEmployees(filters?: EmployeeFilters): Promise<Employee[]> {
  const params = new URLSearchParams();
  if (filters?.search) params.set('search', filters.search);
  if (filters?.unitUuid) params.set('unitUuid', filters.unitUuid);
  if (filters?.status) params.set('status', filters.status);
  if (filters?.positionId) params.set('positionId', filters.positionId);
  const qs = params.toString();

  try {
    return await apiFetch<Employee[]>(`/employees${qs ? `?${qs}` : ''}`);
  } catch (err) {
    rethrow(err);
  }
}

export async function getEmployee(uuid: string): Promise<Employee | null> {
  try {
    return await apiFetch<Employee>(`/employees/${uuid}`);
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) return null;
    rethrow(err);
  }
}

export interface CreateEmployeeFullInput {
  employee: Omit<
    Employee,
    | 'uuid'
    | 'userUuid'
    | 'fullNameGenerated'
    | 'createdAt'
    | 'updatedAt'
    | 'status'
    | 'employmentOrderExtract'
    | 'positionInstruction'
  >;
  orderExtract: Omit<EmploymentOrderExtract, 'uploadedAt'>;
  positionInstruction: Omit<EmploymentOrderExtract, 'uploadedAt'>;
  password: string;
  role: ApiSessionUser['roles'][number];
}

export async function createEmployeeFull(
  input: CreateEmployeeFullInput,
  _actorUuid: string,
): Promise<{ employee: Employee; user: ApiSessionUser; assignment: unknown }> {
  try {
    return await apiFetch<{ employee: Employee; user: ApiSessionUser; assignment: unknown }>(
      '/employees',
      { method: 'POST', body: input },
    );
  } catch (err) {
    rethrow(err);
  }
}

export type UpdateEmployeeInput = Partial<
  Omit<
    Employee,
    | 'uuid'
    | 'userUuid'
    | 'createdAt'
    | 'fullNameGenerated'
    | 'employmentOrderExtract'
    | 'positionInstruction'
    | 'terminationOrderExtract'
  >
>;

export async function updateEmployee(
  uuid: string,
  patch: UpdateEmployeeInput,
  _actorUuid: string,
): Promise<Employee> {
  try {
    return await apiFetch<Employee>(`/employees/${uuid}`, { method: 'PATCH', body: patch });
  } catch (err) {
    rethrow(err);
  }
}

export async function terminateEmployee(
  uuid: string,
  _actorUuid: string,
  orderExtract: Omit<EmploymentOrderExtract, 'uploadedAt'>,
): Promise<void> {
  try {
    await apiFetch<Employee>(`/employees/${uuid}/terminate`, {
      method: 'POST',
      body: { orderExtract },
    });
  } catch (err) {
    rethrow(err);
  }
}

/**
 * Resolves a user by corporate email — used for the wizard's live
 * corporate-email dedup check and the profile-edit sheet's own-email guard.
 * Backed by `GET /users?search=` (Auth & Roles module, already real),
 * filtered to an exact case-insensitive match — there is no dedicated
 * lookup-by-email endpoint.
 */
export async function findUserByEmail(email: string): Promise<ApiSessionUser | null> {
  try {
    const results = await apiFetch<ApiSessionUser[]>(`/users?search=${encodeURIComponent(email)}`);
    const lc = email.trim().toLowerCase();

    return results.find((u) => u.email.toLowerCase() === lc) ?? null;
  } catch (err) {
    rethrow(err);
  }
}

export async function validatePinfl(pinfl: string): Promise<boolean> {
  try {
    const { taken } = await apiFetch<{ taken: boolean }>(`/validate/pinfl/${pinfl}`);

    return taken;
  } catch (err) {
    rethrow(err);
  }
}
