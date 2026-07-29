// Central data-source switch (PLAN_PHASE_AB.md §1.3). Each domain is either
// 'real' (hits the Laravel API via `src/lib/api/*`) or 'mock' (reads the
// localStorage mock backend, `src/lib/mock-backend`). Flipping a domain here
// is the entire migration — the facade modules in this directory
// (`src/lib/data/*.ts`) re-export the matching implementation under a
// stable signature so consuming components never know which one they got.
//
// `audit`, `positions`, `units` went real in Phase A+B (PLAN_PHASE_AB.md).
// `employees`, `assignments`, `profileRequests` go real in Phase C
// (PLAN_PHASE_C.md §4) — but note the seam nuance: only the
// employee-management + profile components listed in PLAN_PHASE_C.md §4
// actually read through the `employees`/`assignments`/`profileRequests`
// facades. `src/lib/acting.ts` and all of
// `src/features/{documents,letters,tasks}/*` keep importing
// `src/lib/mock-backend` directly regardless of this flag (intentional
// hybrid — PLAN_PHASE_C.md §0.2). Every other domain stays on the mock
// until its own migration lands.
export type DataSourceMode = 'real' | 'mock';

export const dataSourceConfig = {
  audit: 'real',
  positions: 'real',
  units: 'real',
  employees: 'real',
  assignments: 'real',
  profileRequests: 'real',
  certificates: 'mock',
  documents: 'mock',
  letters: 'mock',
  tasks: 'mock',
} as const satisfies Record<string, DataSourceMode>;
