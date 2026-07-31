// Real backend for the position catalogue (PLAN_PHASE_AB.md §1.2). Beyond the
// seeded 15 entries, positions are now user-managed: create/update/delete hit
// the Laravel API (`positions.manage`-gated), while `listPositions` stays
// readable by every role.
//
// Business-rule violations come back as a 422 `{ code, message }` body
// (`bootstrap/app.php`). We surface them as a typed `PositionValidationError`
// so the page can show a localized message per code.

import type { Position, UnitType } from '@/types/domain';
import { apiFetch, ApiError } from './client';

export type PositionValidationCode = 'duplicate-name' | 'in-use';

const KNOWN_CODES: readonly PositionValidationCode[] = ['duplicate-name', 'in-use'];

export class PositionValidationError extends Error {
  readonly code: PositionValidationCode;

  constructor(code: PositionValidationCode) {
    super(`Position validation failed: ${code}`);
    this.name = 'PositionValidationError';
    this.code = code;
  }
}

function isPositionValidationCode(code: string | undefined): code is PositionValidationCode {
  return !!code && (KNOWN_CODES as readonly string[]).includes(code);
}

/** Rethrows `err` translated to a typed validation error; always throws. */
function rethrow(err: unknown): never {
  if (err instanceof ApiError && isPositionValidationCode(err.code)) {
    throw new PositionValidationError(err.code);
  }
  throw err;
}

export function listPositions(): Promise<Position[]> {
  return apiFetch<Position[]>('/positions');
}

export interface PositionInput {
  nameUz: string;
  allowedUnitTypes: UnitType[];
}

export async function createPosition(input: PositionInput): Promise<Position> {
  try {
    return await apiFetch<Position>('/positions', { method: 'POST', body: input });
  } catch (err) {
    rethrow(err);
  }
}

export async function updatePosition(
  id: string,
  patch: Partial<PositionInput>,
): Promise<Position> {
  try {
    return await apiFetch<Position>(`/positions/${id}`, { method: 'PATCH', body: patch });
  } catch (err) {
    rethrow(err);
  }
}

export async function deletePosition(id: string): Promise<void> {
  try {
    await apiFetch<void>(`/positions/${id}`, { method: 'DELETE' });
  } catch (err) {
    rethrow(err);
  }
}
