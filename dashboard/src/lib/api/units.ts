// Real backend for the organizational structure tree (PLAN_PHASE_AB.md §2).
// Signature-compatible with the mock's `listUnits` / `getUnit` / `createUnit`
// / `updateUnit` / `archiveUnit` (`src/lib/mock-backend/index.ts`) so
// `src/lib/data/units.ts` can re-export either implementation unchanged.
//
// Error translation: business-rule violations come back from the API as a
// 422 `{ code, message }` body (`bootstrap/app.php` on the backend). We
// reuse the mock's own `UnitValidationError` / `MockNetworkError` classes
// (framework-agnostic — no localStorage dependency) so every consumer's
// `err instanceof UnitValidationError` check works identically against
// either backend.

import {
  MockNetworkError,
  UnitValidationError,
  type UnitValidationCode,
} from '@/lib/mock-backend/errors';
import type { Unit } from '@/types/domain';
import { apiFetch, ApiError } from './client';

const KNOWN_CODES: readonly UnitValidationCode[] = [
  'cycle',
  'duplicate-name',
  'max-depth',
  'invalid-parent',
];

function isUnitValidationCode(code: string | undefined): code is UnitValidationCode {
  return !!code && (KNOWN_CODES as readonly string[]).includes(code);
}

/** Rethrows `err` translated to the mock's error vocabulary; always throws. */
function rethrow(err: unknown): never {
  if (err instanceof ApiError) {
    if (isUnitValidationCode(err.code)) throw new UnitValidationError(err.code);
    if (err.status === 0) throw new MockNetworkError();
  }
  throw err;
}

export async function listUnits(): Promise<Unit[]> {
  try {
    return await apiFetch<Unit[]>('/units');
  } catch (err) {
    rethrow(err);
  }
}

export async function getUnit(uuid: string): Promise<Unit | null> {
  try {
    return await apiFetch<Unit>(`/units/${uuid}`);
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) return null;
    rethrow(err);
  }
}

export interface CreateUnitInput {
  nameUz: string;
  nameRu?: string;
  shortName?: string;
  code: string;
  type: Unit['type'];
  parentUuid: string | null;
  description?: string;
}

export async function createUnit(input: CreateUnitInput, _actorUuid: string): Promise<Unit> {
  try {
    return await apiFetch<Unit>('/units', { method: 'POST', body: input });
  } catch (err) {
    rethrow(err);
  }
}

export type UpdateUnitInput = Partial<
  Omit<Unit, 'uuid' | 'createdAt' | 'createdBy' | 'level' | 'path'>
>;

export async function updateUnit(
  uuid: string,
  patch: UpdateUnitInput,
  _actorUuid: string,
): Promise<Unit> {
  try {
    return await apiFetch<Unit>(`/units/${uuid}`, { method: 'PATCH', body: patch });
  } catch (err) {
    rethrow(err);
  }
}

export async function archiveUnit(uuid: string, _actorUuid: string): Promise<void> {
  try {
    await apiFetch<void>(`/units/${uuid}`, { method: 'DELETE' });
  } catch (err) {
    rethrow(err);
  }
}
