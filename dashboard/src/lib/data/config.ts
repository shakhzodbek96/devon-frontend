// Central data-source switch (PLAN_PHASE_AB.md §1.3). Each domain is either
// 'real' (hits the Laravel API via `src/lib/api/*`) or 'mock' (reads the
// localStorage mock backend, `src/lib/mock-backend`). Flipping a domain here
// is the entire migration — the facade modules in this directory
// (`src/lib/data/*.ts`) re-export the matching implementation under a
// stable signature so consuming components never know which one they got.
//
// Only `audit`, `positions`, and `units` are real in this slice
// (PLAN_PHASE_AB.md Phase A+B). Every other domain stays on the mock until
// its own migration lands — see the seam note in `src/lib/data/audit.ts`.
export type DataSourceMode = 'real' | 'mock';

export const dataSourceConfig = {
  audit: 'real',
  positions: 'real',
  units: 'real',
  employees: 'mock',
  certificates: 'mock',
  documents: 'mock',
  letters: 'mock',
  tasks: 'mock',
} as const satisfies Record<string, DataSourceMode>;
