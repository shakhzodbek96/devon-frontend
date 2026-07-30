// Data-seam facade for daily attendance check-in/check-out (PLAN_tabel-
// davomat.md §4). New module — no mock backend, so this simply re-exports
// the real API under the facade's stable import path
// (`src/features/attendance/*` never imports `src/lib/api/*` directly). A
// `mock` branch can be added here later without touching any consumer.

export {
  checkIn,
  checkOut,
  myAttendance,
  listAttendance,
  manualAttendance,
} from '@/lib/api/attendance';
export type { AttendanceFilters, ManualAttendanceInput } from '@/lib/api/attendance';
export {
  AttendanceNetworkError,
  AttendanceValidationError,
  type AttendanceValidationCode,
} from '@/lib/api/attendanceErrors';
