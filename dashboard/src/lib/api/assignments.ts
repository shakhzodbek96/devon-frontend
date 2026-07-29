// Real backend for employee assignments (PLAN_PHASE_C.md §1.2, §2;
// PLAN_PHASE_D.md §1). Signature-compatible with the mock's
// `listAssignments` / `transferEmployee`
// (`src/lib/mock-backend/index.ts`) so `src/lib/data/assignments.ts` can
// re-export either implementation unchanged. There is no org-wide
// `/assignments` endpoint — reads go through the nested
// `GET /employees/{uuid}/assignments`, so an `employeeUuid` is required
// here even though the mock's `listAssignments` signature allows omitting
// it.
//
// Error translation: business-rule violations come back from the API as a
// 422 `{ code, message }` body (`bootstrap/app.php` on the backend). We
// reuse the mock's own `AssignmentValidationError` / `MockNetworkError`
// classes (framework-agnostic — no localStorage dependency) so every
// consumer's `err instanceof AssignmentValidationError` check works
// identically against either backend.

import {
  AssignmentValidationError,
  MockNetworkError,
  type AssignmentValidationCode,
} from '@/lib/mock-backend/errors';
import type { Assignment, AssignmentType } from '@/types/domain';
import { apiFetch, ApiError } from './client';

const KNOWN_CODES: readonly AssignmentValidationCode[] = ['workload-exceeded'];

function isAssignmentValidationCode(code: string | undefined): code is AssignmentValidationCode {
  return !!code && (KNOWN_CODES as readonly string[]).includes(code);
}

/** Rethrows `err` translated to the mock's error vocabulary; always throws. */
function rethrow(err: unknown): never {
  if (err instanceof ApiError) {
    if (isAssignmentValidationCode(err.code)) throw new AssignmentValidationError(err.code);
    if (err.status === 0) throw new MockNetworkError();
  }
  throw err;
}

export async function listAssignments(employeeUuid?: string): Promise<Assignment[]> {
  if (!employeeUuid) {
    throw new Error('listAssignments() requires an employeeUuid against the real backend in this phase.');
  }

  try {
    return await apiFetch<Assignment[]>(`/employees/${employeeUuid}/assignments`);
  } catch (err) {
    rethrow(err);
  }
}

/** Matches the mock's `TransferInput` (`src/lib/mock-backend/index.ts`) verbatim. */
export interface TransferInput {
  employeeUuid: string;
  newUnitUuid: string;
  newPositionId: string;
  startDate: string;
  workloadPercent: number;
  type: AssignmentType;
  closeOldAssignment: boolean;
  reason?: string;
}

/** Flow 3 — `POST /employees/{employeeUuid}/transfer`, matches the mock's `transferEmployee`. */
export async function transferEmployee(
  input: TransferInput,
  _actorUuid: string,
): Promise<Assignment> {
  try {
    return await apiFetch<Assignment>(`/employees/${input.employeeUuid}/transfer`, {
      method: 'POST',
      body: {
        newUnitUuid: input.newUnitUuid,
        newPositionId: input.newPositionId,
        startDate: input.startDate,
        workloadPercent: input.workloadPercent,
        type: input.type,
        closeOldAssignment: input.closeOldAssignment,
        reason: input.reason,
      },
    });
  } catch (err) {
    rethrow(err);
  }
}
