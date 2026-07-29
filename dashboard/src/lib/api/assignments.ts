// Real backend for employee assignments (PLAN_PHASE_C.md §1.2, §2).
// Signature-compatible with the mock's `listAssignments`
// (`src/lib/mock-backend/index.ts`). Phase C only exposes the nested
// `GET /employees/{uuid}/assignments` read — there is no org-wide
// `/assignments` endpoint yet (transfer/timeline logic is Phase D), so an
// `employeeUuid` is required here even though the mock's signature allows
// omitting it (the only caller switched to this facade,
// `ProfileUnitsTab`, always passes one — see PLAN_PHASE_C.md §4).

import type { Assignment } from '@/types/domain';
import { apiFetch } from './client';

export async function listAssignments(employeeUuid?: string): Promise<Assignment[]> {
  if (!employeeUuid) {
    throw new Error('listAssignments() requires an employeeUuid against the real backend in this phase.');
  }

  return apiFetch<Assignment[]>(`/employees/${employeeUuid}/assignments`);
}
