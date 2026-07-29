// Data-seam facade for the incoming/outgoing correspondence module
// (PLAN_PHASE_G.md §5). Re-exports either the real API
// (`src/lib/api/letters.ts`) or the localStorage mock (`src/lib/mock-backend`)
// under one stable signature, switched centrally by `src/lib/data/config.ts`.
// `src/features/letters/*` — including signing (`LetterActions` →
// `SignDialog`) — imports from here.

import * as mockBackend from '@/lib/mock-backend';
import * as realApi from '@/lib/api/letters';
import type { Letter } from '@/types/domain';
import { dataSourceConfig } from './config';

export { LetterValidationError, MockNetworkError } from '@/lib/mock-backend/errors';
export type {
  DispatchLetterInput,
  LetterDetail,
  LetterFilters,
  RegisterIncomingLetterInput,
  SubmitLetterExecutionInput,
} from '@/lib/api/letters';

// Pure client-side logic (deadline vs. today, no I/O) — identical either way,
// so it is never switched by `dataSourceConfig`.
export { isLetterOverdue } from '@/lib/mock-backend';

export const listLetters =
  dataSourceConfig.letters === 'real' ? realApi.listLetters : mockBackend.listLetters;

export const getLetter =
  dataSourceConfig.letters === 'real' ? realApi.getLetter : mockBackend.getLetter;

export const registerIncomingLetter =
  dataSourceConfig.letters === 'real'
    ? realApi.registerIncomingLetter
    : mockBackend.registerIncomingLetter;

export const routeLetter =
  dataSourceConfig.letters === 'real' ? realApi.routeLetter : mockBackend.routeLetter;

export const assignLetterExecutor =
  dataSourceConfig.letters === 'real'
    ? realApi.assignLetterExecutor
    : mockBackend.assignLetterExecutor;

export const startLetterExecution =
  dataSourceConfig.letters === 'real'
    ? realApi.startLetterExecution
    : mockBackend.startLetterExecution;

export const submitLetterExecution =
  dataSourceConfig.letters === 'real'
    ? realApi.submitLetterExecution
    : mockBackend.submitLetterExecution;

export const acceptLetterExecution =
  dataSourceConfig.letters === 'real'
    ? realApi.acceptLetterExecution
    : mockBackend.acceptLetterExecution;

/**
 * `signLetter` — the real API takes one more argument (`signatureHex`, the
 * frontend's client-side fake ERI signature) than the mock, which mints its
 * own random hex server-side — see `src/lib/api/letters.ts`. A plain
 * ternary re-export would type as a function-union callable only with the
 * narrower (mock) arity, so this wraps both branches under one explicit
 * 4-arg signature instead (mirrors `src/lib/data/documents.ts`'s
 * `signDocument`).
 */
export async function signLetter(
  letterUuid: string,
  actorUuid: string,
  certificateUuid: string,
  signatureHex: string,
): Promise<Letter> {
  if (dataSourceConfig.letters === 'real') {
    return realApi.signLetter(letterUuid, actorUuid, certificateUuid, signatureHex);
  }
  return mockBackend.signLetter(letterUuid, certificateUuid, actorUuid);
}

export const dispatchLetter =
  dataSourceConfig.letters === 'real' ? realApi.dispatchLetter : mockBackend.dispatchLetter;
