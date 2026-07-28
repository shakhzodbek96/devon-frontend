// Data-seam facade for the audit trail (PLAN_PHASE_AB.md §1.3). Re-exports
// either the real API (`src/lib/api/audit.ts`) or the localStorage mock
// (`src/lib/mock-backend`) under one stable signature, switched centrally
// by `src/lib/data/config.ts`. `src/features/audit/*` imports from here —
// never straight from the mock.
//
// Seam note: now that `audit` is real, `AuditLogPage` shows DB-backed audit
// rows for auth actions and unit mutations only. Modules still on the mock
// (employees, certificates, documents, letters, tasks) keep writing to the
// mock's own localStorage audit table, which this page can no longer see —
// each module's entries reappear here automatically once that module
// migrates to the real API. This is expected during the incremental
// migration, not a bug.

import * as mockBackend from '@/lib/mock-backend';
import * as realApi from '@/lib/api/audit';
import { dataSourceConfig } from './config';

export type { AuditFilters } from '@/lib/api/audit';

export const listAudit = dataSourceConfig.audit === 'real' ? realApi.listAudit : mockBackend.listAudit;
