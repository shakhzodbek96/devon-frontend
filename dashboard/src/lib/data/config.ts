// Central data-source switch (PLAN_PHASE_AB.md §1.3). Each domain is either
// 'real' (hits the Laravel API via `src/lib/api/*`) or 'mock' (reads the
// localStorage mock backend, `src/lib/mock-backend`). Flipping a domain here
// is the entire migration — the facade modules in this directory
// (`src/lib/data/*.ts`) re-export the matching implementation under a
// stable signature so consuming components never know which one they got.
//
// `audit`, `positions`, `units` went real in Phase A+B (PLAN_PHASE_AB.md).
// `employees`, `assignments`, `profileRequests` went real in Phase C
// (PLAN_PHASE_C.md §4) and Phase D (PLAN_PHASE_D.md §3) extended the
// `assignments` facade with `transfer` (Flow 3) + switched the remaining
// employee-management/assignment components (`TransferForm`,
// `EmployeeTransferPage`, `UnitDetailsSheet`'s head-employee display) onto
// it. Phase E (PLAN_PHASE_E.md §7) switched `certificates` real: certificate
// metadata + lifecycle (upload/approve/reject/revoke) now hit the Laravel
// API. Phase F1 (PLAN_PHASE_F1.md) switches `documents` / `documentTemplates`
// / `notifications` real: the document create/approve/reject/rework/accept
// workflow + the notification bell now hit the Laravel API too, and
// `src/lib/acting.ts` resolves the acting employee/units through the real
// `employees`/`units` facades (§0 of that plan — the fix that stops M2
// pages from hanging on a real login). ERI signing (SIGNED) stays F2 —
// `SignDialog`/`FakeEriSigner`/`SignatureHistoryCard` and the certificate
// data underneath them are untouched, still reading mock certificates data
// where those components read it directly.
// `letters`/`tasks` stay mock entirely in F1 (own migration later) —
// `src/features/{letters,tasks}/*` keep importing `src/lib/mock-backend`
// directly.
export type DataSourceMode = 'real' | 'mock';

export const dataSourceConfig = {
  audit: 'real',
  positions: 'real',
  units: 'real',
  employees: 'real',
  assignments: 'real',
  profileRequests: 'real',
  certificates: 'real',
  documents: 'real',
  documentTemplates: 'real',
  notifications: 'real',
  letters: 'mock',
  tasks: 'mock',
} as const satisfies Record<string, DataSourceMode>;
