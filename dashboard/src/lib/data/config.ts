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
// pages from hanging on a real login). Phase F2 (PLAN_PHASE_F2.md) wires ERI
// document signing itself: `signatures` is a new table folded into the
// `documents` domain (`signDocument` in `src/lib/data/documents.ts`,
// `FakeEriSigner.ts` stays client-side — BLOCKED(e-imzo), see that plan's
// §0), and the shared `SignDialog`'s certificate picker now reads through
// the real `certificates` facade instead of the mock. Phase G
// (PLAN_PHASE_G.md) switches `letters` real: the full BP-3 correspondence
// lifecycle (register/route/assign/execute/accept/sign/dispatch) now hits
// the Laravel API, and letter signing reuses the SAME shared `signatures`
// table `documents` already writes to (`resource_type='letter'`) — see
// `src/lib/api/letters.ts`.
// Phase H (PLAN_PHASE_H.md) switches `tasks` real — the LAST mock module:
// the full BP-2 task delegation / Kanban lifecycle (create/start/
// clarification/submit/review) now hits the Laravel API, subtree
// assignment authorization uses the real units' materialized path/level —
// see `src/lib/api/tasks.ts`. Every domain is now 'real'; this migration
// is complete.
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
  letters: 'real',
  tasks: 'real',
} as const satisfies Record<string, DataSourceMode>;
