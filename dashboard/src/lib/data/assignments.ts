// Data-seam facade for employee assignments (PLAN_PHASE_C.md §4;
// PLAN_PHASE_D.md §3). Re-exports either the real API
// (`src/lib/api/assignments.ts`) or the localStorage mock
// (`src/lib/mock-backend`), switched centrally by `src/lib/data/config.ts`.
// `ProfileUnitsTab` and `TransferForm` / `EmployeeTransferPage` (Flow 3)
// import from here — the M2 `CreateTaskForm` / `AssignDialog` keep reading
// the mock's org-wide `listAssignments()` directly (see PLAN_PHASE_C.md
// §0.2; M2 stays mock-only through this phase).

import * as mockBackend from '@/lib/mock-backend';
import * as realApi from '@/lib/api/assignments';
import { dataSourceConfig } from './config';

export {
  AssignmentValidationError,
  MockNetworkError,
} from '@/lib/mock-backend/errors';
export type { TransferInput } from '@/lib/api/assignments';

/** Shared business constant (not data-source dependent) — matches the mock's `MAX_TOTAL_WORKLOAD_PERCENT`. */
export const MAX_TOTAL_WORKLOAD_PERCENT = 150;

export const listAssignments =
  dataSourceConfig.assignments === 'real' ? realApi.listAssignments : mockBackend.listAssignments;
export const transferEmployee =
  dataSourceConfig.assignments === 'real' ? realApi.transferEmployee : mockBackend.transferEmployee;
