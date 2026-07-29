// Data-seam facade for the Documents + approval workflow module
// (PLAN_PHASE_F1.md §5). Re-exports either the real API
// (`src/lib/api/documents.ts`) or the localStorage mock
// (`src/lib/mock-backend`) under one stable signature, switched centrally
// by `src/lib/data/config.ts`. `src/features/documents/*` (registry,
// wizard, detail — everything except signing) imports from here.
//
// ERI signing (`signDocument`) is milestone F2 and is deliberately NOT
// re-exported — `SignDialog` stays wired to the mock directly, gated off
// by the acting-document's status until F2 lands (see `DocumentActions`).

import * as mockBackend from '@/lib/mock-backend';
import * as realApi from '@/lib/api/documents';
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

export const acceptDocument =
  dataSourceConfig.documents === 'real' ? realApi.acceptDocument : mockBackend.acceptDocument;

export const emailDocument =
  dataSourceConfig.documents === 'real' ? realApi.emailDocument : mockBackend.emailDocument;

export const deleteDocument =
  dataSourceConfig.documents === 'real' ? realApi.deleteDocument : mockBackend.deleteDocument;
