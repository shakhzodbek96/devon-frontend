// Real backend for the incoming/outgoing correspondence module (milestone 2,
// PLAN_PHASE_G.md §5, BPMN 3.3 / BP-3). Signature-compatible with the mock's
// `listLetters` / `getLetter` / `registerIncomingLetter` / `routeLetter` /
// `assignLetterExecutor` / `startLetterExecution` / `submitLetterExecution` /
// `acceptLetterExecution` / `signLetter` / `dispatchLetter`
// (`src/lib/mock-backend/index.ts`) so `src/lib/data/letters.ts` can
// re-export either implementation unchanged.
//
// Error translation: business-rule violations come back from the API as a
// 422 `{ code, message }` body (`bootstrap/app.php` on the backend). We
// reuse the mock's own `LetterValidationError` / `MockNetworkError` classes
// (framework-agnostic — no localStorage dependency) so every consumer's
// `err instanceof LetterValidationError` check works identically against
// either backend.
//
// Actor: every mutation here accepts an `_actorUuid` parameter purely for
// signature compatibility with the mock — the real backend always acts as
// the AUTHENTICATED user's own employee (`request.user().employee_uuid`),
// never a client-supplied uuid (same privilege-escalation guard as
// `src/lib/api/documents.ts`).
//
// Letter ERI signing (ON_SIGNATURE → RESPONDED, `signLetter`): reuses the
// SHARED `signatures` table (`resource_type='letter'`, PLAN_PHASE_F2.md
// §1). `signatureHex` is the frontend's client-side fake signature
// (`FakeEriSigner.ts`, BLOCKED(e-imzo) — the private key never reaches this
// call). Unlike the mock (which mints its own random hex server-side), the
// real backend requires the caller to supply it, so this export takes one
// more argument than `mock-backend`'s `signLetter` — see
// `src/lib/data/letters.ts` for the signature-bridging wrapper.

import {
  LetterValidationError,
  MockNetworkError,
  type LetterValidationCode,
} from '@/lib/mock-backend/errors';
import type {
  FileMeta,
  Letter,
  LetterChannel,
  LetterDirection,
  LetterStatus,
  SignatureRecord,
} from '@/types/domain';
import { apiFetch, ApiError } from './client';

const KNOWN_CODES: readonly LetterValidationCode[] = [
  'wrong-status',
  'not-devonxona',
  'not-rahbar',
  'not-unit-head',
  'not-executor',
  'comment-required',
  'missing-response',
  'cert-invalid',
];

function isLetterValidationCode(code: string | undefined): code is LetterValidationCode {
  return !!code && (KNOWN_CODES as readonly string[]).includes(code);
}

/** Rethrows `err` translated to the mock's error vocabulary; always throws. */
function rethrow(err: unknown): never {
  if (err instanceof ApiError) {
    if (isLetterValidationCode(err.code)) throw new LetterValidationError(err.code);
    if (err.status === 0) throw new MockNetworkError();
  }
  throw err;
}

export interface LetterFilters {
  direction?: LetterDirection;
  status?: LetterStatus;
  search?: string;
  overdueOnly?: boolean;
}

export async function listLetters(filters?: LetterFilters): Promise<Letter[]> {
  const params = new URLSearchParams();
  if (filters?.direction) params.set('direction', filters.direction);
  if (filters?.status) params.set('status', filters.status);
  if (filters?.search) params.set('search', filters.search);
  if (filters?.overdueOnly) params.set('overdueOnly', 'true');
  const qs = params.toString();

  try {
    return await apiFetch<Letter[]>(`/letters${qs ? `?${qs}` : ''}`);
  } catch (err) {
    rethrow(err);
  }
}

export interface LetterDetail {
  letter: Letter;
  signatures: SignatureRecord[];
  /** On INCOMING rows — the dispatched OUTGOING reply, if any. */
  linkedOutgoing?: Letter;
  /** On OUTGOING rows — the INCOMING letter being answered, if any. */
  linkedIncoming?: Letter;
  routedToUnitName?: string;
  assignedEmployeeName?: string;
  registeredByName: string;
}

export async function getLetter(uuid: string): Promise<LetterDetail | null> {
  try {
    return await apiFetch<LetterDetail>(`/letters/${uuid}`);
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) return null;
    rethrow(err);
  }
}

export interface RegisterIncomingLetterInput {
  externalOrg: string;
  subject: string;
  channel: LetterChannel;
  /** ISO date (yyyy-mm-dd) — when the paper/email actually arrived. */
  receivedAt: string;
  /** ISO date — ijro muddati; drives the overdue badge. */
  deadline?: string;
  /** "Javobga rahbar imzosi talab qilinadi". */
  requiresSignature: boolean;
  /** Scanned original — pick-time metadata; the backend stamps `uploadedAt`. */
  fileMeta?: Omit<FileMeta, 'uploadedAt'>;
}

export async function registerIncomingLetter(
  input: RegisterIncomingLetterInput,
  _actorUuid: string,
): Promise<Letter> {
  try {
    return await apiFetch<Letter>('/letters', { method: 'POST', body: input });
  } catch (err) {
    rethrow(err);
  }
}

export async function routeLetter(
  uuid: string,
  unitUuid: string,
  _actorUuid: string,
): Promise<Letter> {
  try {
    return await apiFetch<Letter>(`/letters/${uuid}/route`, {
      method: 'POST',
      body: { unitUuid },
    });
  } catch (err) {
    rethrow(err);
  }
}

export async function assignLetterExecutor(
  uuid: string,
  employeeUuid: string,
  _actorUuid: string,
): Promise<Letter> {
  try {
    return await apiFetch<Letter>(`/letters/${uuid}/assign`, {
      method: 'POST',
      body: { employeeUuid },
    });
  } catch (err) {
    rethrow(err);
  }
}

export async function startLetterExecution(uuid: string, _actorUuid: string): Promise<Letter> {
  try {
    return await apiFetch<Letter>(`/letters/${uuid}/start`, { method: 'POST' });
  } catch (err) {
    rethrow(err);
  }
}

export interface SubmitLetterExecutionInput {
  /** BPMN 7.1 — comment-only execution. Present (even empty) selects this path. */
  executionComment?: string;
  /** BPMN 7.2 — ready response file (pick-time metadata). */
  responseFileMeta?: Omit<FileMeta, 'uploadedAt'>;
  /** BPMN 7.2 alt — response composed as an internal document. */
  responseDocumentUuid?: string;
}

export async function submitLetterExecution(
  uuid: string,
  input: SubmitLetterExecutionInput,
  _actorUuid: string,
): Promise<Letter> {
  try {
    return await apiFetch<Letter>(`/letters/${uuid}/execute`, { method: 'POST', body: input });
  } catch (err) {
    rethrow(err);
  }
}

export async function acceptLetterExecution(uuid: string, _actorUuid: string): Promise<Letter> {
  try {
    return await apiFetch<Letter>(`/letters/${uuid}/accept`, { method: 'POST' });
  } catch (err) {
    rethrow(err);
  }
}

/**
 * `POST /letters/{uuid}/sign` — ON_SIGNATURE → RESPONDED, shared
 * `signatures` table. BLOCKED(e-imzo): `signatureHex` is a client-generated
 * fake — see the module doc comment.
 */
export async function signLetter(
  uuid: string,
  _actorUuid: string,
  certificateUuid: string,
  signatureHex: string,
): Promise<Letter> {
  try {
    return await apiFetch<Letter>(`/letters/${uuid}/sign`, {
      method: 'POST',
      body: { certificateUuid, signatureHex },
    });
  } catch (err) {
    rethrow(err);
  }
}

export interface DispatchLetterInput {
  /** Outbound channel for the reply. */
  channel: LetterChannel;
}

export async function dispatchLetter(
  uuid: string,
  input: DispatchLetterInput,
  _actorUuid: string,
): Promise<{ incoming: Letter; outgoing: Letter }> {
  try {
    return await apiFetch<{ incoming: Letter; outgoing: Letter }>(`/letters/${uuid}/dispatch`, {
      method: 'POST',
      body: input,
    });
  } catch (err) {
    rethrow(err);
  }
}
