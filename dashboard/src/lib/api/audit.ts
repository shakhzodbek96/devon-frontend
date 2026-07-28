// Real backend for the append-only audit trail (PLAN_PHASE_AB.md §1.1).
// Signature-compatible with the mock's `listAudit`
// (`src/lib/mock-backend/index.ts`) so `src/lib/data/audit.ts` can
// re-export either implementation unchanged.

import type { AuditEntry } from '@/types/domain';
import { apiFetch } from './client';

export interface AuditFilters {
  resourceType?: AuditEntry['resourceType'];
  resourceUuid?: string;
  actorUuid?: string;
  /** Inclusive lower bound (ISO date or datetime string). */
  dateFrom?: string;
  /** Inclusive upper bound (ISO date or datetime string). */
  dateTo?: string;
  limit?: number;
}

export function listAudit(filters?: AuditFilters): Promise<AuditEntry[]> {
  const params = new URLSearchParams();
  if (filters?.resourceType) params.set('resourceType', filters.resourceType);
  if (filters?.resourceUuid) params.set('resourceUuid', filters.resourceUuid);
  if (filters?.actorUuid) params.set('actorUuid', filters.actorUuid);
  if (filters?.dateFrom) params.set('dateFrom', filters.dateFrom);
  if (filters?.dateTo) params.set('dateTo', filters.dateTo);
  if (filters?.limit) params.set('limit', String(filters.limit));

  const qs = params.toString();
  return apiFetch<AuditEntry[]>(`/audit${qs ? `?${qs}` : ''}`);
}
