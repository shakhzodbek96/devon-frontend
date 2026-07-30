// Data-seam facade for office Wi-Fi perimeter config (PLAN_tabel-davomat.md
// §4). New module — no mock backend, so this simply re-exports the real API
// under the facade's stable import path. A `mock` branch can be added here
// later without touching any consumer.

export {
  listOfficeNetworks,
  createOfficeNetwork,
  updateOfficeNetwork,
  deleteOfficeNetwork,
} from '@/lib/api/officeNetworks';
export type {
  CreateOfficeNetworkInput,
  UpdateOfficeNetworkInput,
} from '@/lib/api/officeNetworks';
export { AttendanceNetworkError } from '@/lib/api/attendanceErrors';
