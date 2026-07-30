// Business-rule error vocabulary for the collegial-body / protocol module
// (PLAN_kollegial-organ.md §4). New module — no mock counterpart, so this
// plays the role `src/lib/mock-backend/errors.ts` plays for the migrated
// modules: a framework-agnostic error class every UI consumer can
// `instanceof`-check, translated from the API's 422 `{ code, message }`
// body. One vocabulary covers BOTH `CollegialBodyService` and
// `ProtocolService` — same as the backend's single `ProtocolValidationException`.

export class CollegialNetworkError extends Error {
  constructor() {
    super('Network error');
    this.name = 'CollegialNetworkError';
  }
}

export type CollegialValidationCode =
  | 'not-editable'
  | 'wrong-status'
  | 'not-authorized'
  | 'not-reviewer'
  | 'not-participant'
  | 'not-chairman'
  | 'already-decided'
  | 'already-signed'
  | 'quorum-not-met'
  | 'not-body-member'
  | 'cert-invalid';

const KNOWN_CODES: readonly CollegialValidationCode[] = [
  'not-editable',
  'wrong-status',
  'not-authorized',
  'not-reviewer',
  'not-participant',
  'not-chairman',
  'already-decided',
  'already-signed',
  'quorum-not-met',
  'not-body-member',
  'cert-invalid',
];

export function isCollegialValidationCode(
  code: string | undefined,
): code is CollegialValidationCode {
  return !!code && (KNOWN_CODES as readonly string[]).includes(code);
}

export class CollegialValidationError extends Error {
  readonly code: CollegialValidationCode;
  constructor(code: CollegialValidationCode) {
    super(`Collegial validation failed: ${code}`);
    this.name = 'CollegialValidationError';
    this.code = code;
  }
}
