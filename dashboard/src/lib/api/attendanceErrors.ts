// Business-rule error vocabulary for the attendance module (PLAN_tabel-
// davomat.md §4). New module — no mock counterpart, so this plays the role
// `src/lib/mock-backend/errors.ts` plays for the migrated modules: a
// framework-agnostic error class every UI consumer can `instanceof`-check,
// translated from the API's 422 `{ code, message }` body.

export class AttendanceNetworkError extends Error {
  constructor() {
    super('Network error');
    this.name = 'AttendanceNetworkError';
  }
}

export type AttendanceValidationCode = 'network-blocked' | 'already-checked-in' | 'already-closed';

const KNOWN_CODES: readonly AttendanceValidationCode[] = [
  'network-blocked',
  'already-checked-in',
  'already-closed',
];

export function isAttendanceValidationCode(
  code: string | undefined,
): code is AttendanceValidationCode {
  return !!code && (KNOWN_CODES as readonly string[]).includes(code);
}

export class AttendanceValidationError extends Error {
  readonly code: AttendanceValidationCode;
  constructor(code: AttendanceValidationCode) {
    super(`Attendance validation failed: ${code}`);
    this.name = 'AttendanceValidationError';
    this.code = code;
  }
}
