// Data-seam facade for the collegial-body registry (PLAN_kollegial-organ.md
// §4). New module — no mock backend, so this simply re-exports the real API
// under the facade's stable import path (`src/features/collegial/*` never
// imports `src/lib/api/*` directly). A `mock` branch can be added here later
// without touching any consumer.

export {
  listCollegialBodies,
  createCollegialBody,
  updateCollegialBody,
  archiveCollegialBody,
  addCollegialBodyMember,
  removeCollegialBodyMember,
} from '@/lib/api/collegialBodies';
export type {
  CollegialBodyInput,
  UpdateCollegialBodyInput,
} from '@/lib/api/collegialBodies';
export {
  CollegialNetworkError,
  CollegialValidationError,
  type CollegialValidationCode,
} from '@/lib/api/collegialErrors';
