// Data-seam facade for the Documents + approval workflow module
// (PLAN_PHASE_F1.md §5, PLAN_PHASE_F2.md §3). Re-exports either the real
// API (`src/lib/api/documents.ts`) or the localStorage mock
// (`src/lib/mock-backend`) under one stable signature, switched centrally
// by `src/lib/data/config.ts`. `src/features/documents/*` — including
// signing (`DocumentActions` → `SignDialog`) — imports from here.

import * as mockBackend from '@/lib/mock-backend';
import * as realApi from '@/lib/api/documents';
import type { DocumentEntity } from '@/types/domain';
import { dataSourceConfig } from './config';

export { DocumentValidationError, MockNetworkError } from '@/lib/mock-backend/errors';
export type {
  ApprovalQueueItem,
  CreateDocumentInput,
  DocumentDetail,
  DocumentFilters,
  UpdateDraftDocumentInput,
} from '@/lib/api/documents';

export const listDocumentTemplates =
  dataSourceConfig.documentTemplates === 'real'
    ? realApi.listDocumentTemplates
    : mockBackend.listDocumentTemplates;

export const listDocuments =
  dataSourceConfig.documents === 'real' ? realApi.listDocuments : mockBackend.listDocuments;

export const getDocument =
  dataSourceConfig.documents === 'real' ? realApi.getDocument : mockBackend.getDocument;

export const listMyApprovals =
  dataSourceConfig.documents === 'real' ? realApi.listMyApprovals : mockBackend.listMyApprovals;

export const recordDocumentView =
  dataSourceConfig.documents === 'real'
    ? realApi.recordDocumentView
    : mockBackend.recordDocumentView;

export const createDocument =
  dataSourceConfig.documents === 'real' ? realApi.createDocument : mockBackend.createDocument;

export const updateDraftDocument =
  dataSourceConfig.documents === 'real'
    ? realApi.updateDraftDocument
    : mockBackend.updateDraftDocument;

export const submitDocumentForReview =
  dataSourceConfig.documents === 'real'
    ? realApi.submitDocumentForReview
    : mockBackend.submitDocumentForReview;

export const decideApproval =
  dataSourceConfig.documents === 'real' ? realApi.decideApproval : mockBackend.decideApproval;

/**
 * `signDocument` — the real API takes one more argument (`signatureHex`,
 * the frontend's client-side fake ERI signature) than the mock, which
 * mints its own random hex server-side — see `src/lib/api/documents.ts`.
 * A plain ternary re-export would type as a function-union callable only
 * with the narrower (mock) arity, so this wraps both branches under one
 * explicit 4-arg signature instead.
 */
export async function signDocument(
  documentUuid: string,
  actorUuid: string,
  certificateUuid: string,
  signatureHex: string,
): Promise<DocumentEntity> {
  if (dataSourceConfig.documents === 'real') {
    return realApi.signDocument(documentUuid, actorUuid, certificateUuid, signatureHex);
  }
  return mockBackend.signDocument(documentUuid, actorUuid, certificateUuid);
}

export const acceptDocument =
  dataSourceConfig.documents === 'real' ? realApi.acceptDocument : mockBackend.acceptDocument;

export const emailDocument =
  dataSourceConfig.documents === 'real' ? realApi.emailDocument : mockBackend.emailDocument;

export const deleteDocument =
  dataSourceConfig.documents === 'real' ? realApi.deleteDocument : mockBackend.deleteDocument;
