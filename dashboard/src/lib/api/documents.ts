// Real backend for the Documents + approval workflow module (milestone 2,
// PLAN_PHASE_F1.md §3). Signature-compatible with the mock's
// `listDocuments` / `listDocumentTemplates` / `getDocument` /
// `createDocument` / `updateDraftDocument` / `submitDocumentForReview` /
// `decideApproval` / `acceptDocument` / `emailDocument` /
// `recordDocumentView` / `deleteDocument` / `listMyApprovals`
// (`src/lib/mock-backend/index.ts`) so `src/lib/data/documents.ts` can
// re-export either implementation unchanged.
//
// Error translation: business-rule violations come back from the API as a
// 422 `{ code, message }` body (`bootstrap/app.php` on the backend). We
// reuse the mock's own `DocumentValidationError` / `MockNetworkError`
// classes (framework-agnostic — no localStorage dependency) so every
// consumer's `err instanceof DocumentValidationError` check works
// identically against either backend.
//
// Actor: every mutation here accepts an `_actorUuid` parameter purely for
// signature compatibility with the mock — the real backend always acts as
// the AUTHENTICATED user's own employee (`request.user().employee_uuid`),
// never a client-supplied uuid (PLAN_PHASE_F1.md §0/§2 — the
// privilege-escalation guard). The acting employee resolved by
// `src/lib/acting.ts` for a real-backed module is always the session's own
// employee, so this is never actually a mismatch in practice.
//
// ERI signing (APPROVED → SIGNED) is milestone F2 — there is no
// `signDocument` export here on purpose.

import {
  DocumentValidationError,
  MockNetworkError,
  type DocumentValidationCode,
} from '@/lib/mock-backend/errors';
import type {
  ApprovalDecision,
  ApprovalStep,
  Confidentiality,
  DocumentEntity,
  DocumentSource,
  DocumentStatus,
  DocumentTemplate,
  FileMeta,
  SignatureRecord,
} from '@/types/domain';
import { apiFetch, ApiError } from './client';

const KNOWN_CODES: readonly DocumentValidationCode[] = [
  'wrong-status',
  'not-creator',
  'not-participant',
  'out-of-order',
  'already-decided',
  'comment-required',
  'not-signer',
  'not-recipient',
  'cert-invalid',
  'not-editable',
  'not-deletable',
];

function isDocumentValidationCode(code: string | undefined): code is DocumentValidationCode {
  return !!code && (KNOWN_CODES as readonly string[]).includes(code);
}

/** Rethrows `err` translated to the mock's error vocabulary; always throws. */
function rethrow(err: unknown): never {
  if (err instanceof ApiError) {
    if (isDocumentValidationCode(err.code)) throw new DocumentValidationError(err.code);
    if (err.status === 0) throw new MockNetworkError();
  }
  throw err;
}

export async function listDocumentTemplates(): Promise<DocumentTemplate[]> {
  try {
    return await apiFetch<DocumentTemplate[]>('/document-templates');
  } catch (err) {
    rethrow(err);
  }
}

export interface DocumentFilters {
  status?: DocumentStatus;
  creatorUuid?: string;
  recipientUuid?: string;
  archivedOnly?: boolean;
  search?: string;
}

export async function listDocuments(filters?: DocumentFilters): Promise<DocumentEntity[]> {
  const params = new URLSearchParams();
  if (filters?.status) params.set('status', filters.status);
  if (filters?.creatorUuid) params.set('creatorUuid', filters.creatorUuid);
  if (filters?.recipientUuid) params.set('recipientUuid', filters.recipientUuid);
  if (filters?.archivedOnly) params.set('archivedOnly', 'true');
  if (filters?.search) params.set('search', filters.search);
  const qs = params.toString();

  try {
    return await apiFetch<DocumentEntity[]>(`/documents${qs ? `?${qs}` : ''}`);
  } catch (err) {
    rethrow(err);
  }
}

export interface DocumentDetail {
  document: DocumentEntity;
  steps: ApprovalStep[];
  signatures: SignatureRecord[];
}

export async function getDocument(uuid: string): Promise<DocumentDetail | null> {
  try {
    return await apiFetch<DocumentDetail>(`/documents/${uuid}`);
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) return null;
    rethrow(err);
  }
}

export type ApprovalQueueItem =
  | { kind: 'decision'; document: DocumentEntity; step: ApprovalStep }
  | { kind: 'signature'; document: DocumentEntity }
  | { kind: 'acceptance'; document: DocumentEntity };

export async function listMyApprovals(_actorUuid: string): Promise<ApprovalQueueItem[]> {
  try {
    return await apiFetch<ApprovalQueueItem[]>('/me/approvals');
  } catch (err) {
    rethrow(err);
  }
}

export async function recordDocumentView(uuid: string, _actorUuid: string): Promise<void> {
  try {
    await apiFetch<{ ok: boolean }>(`/documents/${uuid}/view`, { method: 'POST' });
  } catch (err) {
    rethrow(err);
  }
}

export interface CreateDocumentInput {
  title: string;
  source: DocumentSource;
  templateUuid?: string;
  values?: Record<string, string>;
  fileMeta?: Omit<FileMeta, 'uploadedAt'>;
  confidentiality: Confidentiality;
  recipientUuid: string;
  signerUuid?: string;
  requiresApproval: boolean;
  participantUuids?: string[];
}

export async function createDocument(
  input: CreateDocumentInput,
  _actorUuid: string,
): Promise<DocumentEntity> {
  try {
    return await apiFetch<DocumentEntity>('/documents', { method: 'POST', body: input });
  } catch (err) {
    rethrow(err);
  }
}

export interface UpdateDraftDocumentInput {
  title?: string;
  values?: Record<string, string>;
  fileMeta?: Omit<FileMeta, 'uploadedAt'>;
  recipientUuid?: string;
  signerUuid?: string | null;
  confidentiality?: Confidentiality;
  participantUuids?: string[];
}

export async function updateDraftDocument(
  uuid: string,
  patch: UpdateDraftDocumentInput,
  _actorUuid: string,
): Promise<DocumentEntity> {
  try {
    return await apiFetch<DocumentEntity>(`/documents/${uuid}`, { method: 'PATCH', body: patch });
  } catch (err) {
    rethrow(err);
  }
}

export async function submitDocumentForReview(
  uuid: string,
  _actorUuid: string,
): Promise<DocumentEntity> {
  try {
    return await apiFetch<DocumentEntity>(`/documents/${uuid}/send-for-review`, {
      method: 'POST',
    });
  } catch (err) {
    rethrow(err);
  }
}

export async function decideApproval(
  documentUuid: string,
  _actorUuid: string,
  decision: Exclude<ApprovalDecision, 'PENDING'>,
  comment?: string,
): Promise<DocumentEntity> {
  try {
    return await apiFetch<DocumentEntity>(`/documents/${documentUuid}/decide`, {
      method: 'POST',
      body: { decision, comment },
    });
  } catch (err) {
    rethrow(err);
  }
}

export async function acceptDocument(
  documentUuid: string,
  _actorUuid: string,
): Promise<DocumentEntity> {
  try {
    return await apiFetch<DocumentEntity>(`/documents/${documentUuid}/accept`, {
      method: 'POST',
    });
  } catch (err) {
    rethrow(err);
  }
}

export async function emailDocument(
  uuid: string,
  _actorUuid: string,
  email: string,
): Promise<DocumentEntity> {
  try {
    return await apiFetch<DocumentEntity>(`/documents/${uuid}/email`, {
      method: 'POST',
      body: { email },
    });
  } catch (err) {
    rethrow(err);
  }
}

export async function deleteDocument(uuid: string, _actorUuid: string): Promise<void> {
  try {
    await apiFetch<void>(`/documents/${uuid}`, { method: 'DELETE' });
  } catch (err) {
    rethrow(err);
  }
}
