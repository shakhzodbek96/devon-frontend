// Data-seam facade for the monthly tabel approval workflow (PLAN_tabel-
// davomat.md §4). New module — no mock backend, so this simply re-exports
// the real API under the facade's stable import path
// (`src/features/attendance/*` never imports `src/lib/api/*` directly). A
// `mock` branch can be added here later without touching any consumer.

export {
  generateTabel,
  listTabels,
  getTabel,
  updateTabelEntries,
  submitTabel,
  headDecideTabel,
  hrDecideTabel,
  getTabelRegistry,
} from '@/lib/api/tabels';
export type { TabelFilters, TabelEntryPatch, HeadDecideInput, HrDecideInput } from '@/lib/api/tabels';
export { TabelNetworkError, TabelValidationError, type TabelValidationCode } from '@/lib/api/tabelErrors';
