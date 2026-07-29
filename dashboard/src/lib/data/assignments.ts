// Data-seam facade for employee assignments (PLAN_PHASE_C.md §4). Re-exports
// either the real API (`src/lib/api/assignments.ts`) or the localStorage
// mock (`src/lib/mock-backend`), switched centrally by
// `src/lib/data/config.ts`. Only `ProfileUnitsTab` imports from here — the
// still-mock `TransferForm` / `EmployeeTransferPage` (Phase D territory)
// and the M2 `CreateTaskForm` / `AssignDialog` keep reading the mock's
// org-wide `listAssignments()` directly (see PLAN_PHASE_C.md §0.2).

import * as mockBackend from '@/lib/mock-backend';
import * as realApi from '@/lib/api/assignments';
import { dataSourceConfig } from './config';

export const listAssignments =
  dataSourceConfig.assignments === 'real' ? realApi.listAssignments : mockBackend.listAssignments;
