// Data-seam facade for standard work-shift config (PLAN_tabel-davomat.md
// §4). New module — no mock backend, so this simply re-exports the real API
// under the facade's stable import path. A `mock` branch can be added here
// later without touching any consumer.

export {
  listWorkShifts,
  createWorkShift,
  updateWorkShift,
  deleteWorkShift,
} from '@/lib/api/workShifts';
export type { CreateWorkShiftInput, UpdateWorkShiftInput } from '@/lib/api/workShifts';
export { AttendanceNetworkError } from '@/lib/api/attendanceErrors';
