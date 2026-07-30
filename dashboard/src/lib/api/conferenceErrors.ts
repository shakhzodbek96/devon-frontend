// Business-rule error vocabulary for the conference-rooms module (PLAN_
// conference-room.md §4). New module — no mock counterpart, so this plays
// the role `src/lib/mock-backend/errors.ts` plays for the migrated modules:
// a framework-agnostic error class every UI consumer can `instanceof`-check,
// translated from the API's 422 `{ code, message }` body.

export class ConferenceNetworkError extends Error {
  constructor() {
    super('Network error');
    this.name = 'ConferenceNetworkError';
  }
}

// Room CRUD + booking create/cancel share one code vocabulary (backend
// returns the same set for both — see the task brief's 422 shape).
export type ConferenceValidationCode =
  | 'invalid-room'
  | 'room-archived'
  | 'invalid-range'
  | 'time-conflict'
  | 'not-authorized'
  | 'wrong-status';

const KNOWN_CODES: readonly ConferenceValidationCode[] = [
  'invalid-room',
  'room-archived',
  'invalid-range',
  'time-conflict',
  'not-authorized',
  'wrong-status',
];

export function isConferenceValidationCode(
  code: string | undefined,
): code is ConferenceValidationCode {
  return !!code && (KNOWN_CODES as readonly string[]).includes(code);
}

export class ConferenceValidationError extends Error {
  readonly code: ConferenceValidationCode;
  constructor(code: ConferenceValidationCode) {
    super(`Conference booking validation failed: ${code}`);
    this.name = 'ConferenceValidationError';
    this.code = code;
  }
}
