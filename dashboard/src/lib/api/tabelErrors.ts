// Business-rule error vocabulary for the tabel (monthly attendance sheet)
// module (PLAN_tabel-davomat.md §4). New module — no mock counterpart, so
// this plays the role `src/lib/mock-backend/errors.ts` plays for the
// migrated modules: a framework-agnostic error class every UI consumer can
// `instanceof`-check, translated from the API's 422 `{ code, message }`
// body.

export class TabelNetworkError extends Error {
  constructor() {
    super('Network error');
    this.name = 'TabelNetworkError';
  }
}

export type TabelValidationCode =
  | 'not-editable'
  | 'wrong-status'
  | 'not-authorized'
  | 'entries-incomplete'
  | 'not-all-units-ready'
  | 'not-rahbar'
  | 'cert-invalid';

const KNOWN_CODES: readonly TabelValidationCode[] = [
  'not-editable',
  'wrong-status',
  'not-authorized',
  'entries-incomplete',
  'not-all-units-ready',
  'not-rahbar',
  'cert-invalid',
];

export function isTabelValidationCode(code: string | undefined): code is TabelValidationCode {
  return !!code && (KNOWN_CODES as readonly string[]).includes(code);
}

export class TabelValidationError extends Error {
  readonly code: TabelValidationCode;
  constructor(code: TabelValidationCode) {
    super(`Tabel validation failed: ${code}`);
    this.name = 'TabelValidationError';
    this.code = code;
  }
}
