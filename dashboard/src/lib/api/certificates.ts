// Real backend for the ERI Certificates module (Flow 4, PLAN_PHASE_E.md §5).
// Signature-compatible with the mock's `listCertificates` / `uploadCertificate`
// / `approveCertificate` / `rejectCertificate` / `revokeCertificate` /
// `reorderCertificates` (`src/lib/mock-backend/index.ts`) so
// `src/lib/data/certificates.ts` can re-export either implementation
// unchanged.
//
// Error translation: business-rule violations come back from the API as a
// 422 `{ code, message }` body (`bootstrap/app.php` on the backend). We
// reuse the mock's own `CertificateValidationError` / `MockNetworkError`
// classes (framework-agnostic — no localStorage dependency) so every
// consumer's `err instanceof CertificateValidationError` check works
// identically against either backend.
//
// BLOCKED(e-imzo): only certificate *metadata* is ever sent here — the PFX
// private key never leaves the browser (`src/features/certificates/
// FakePfxParser.ts` stays client-side, PLAN_PHASE_E.md §0).

import {
  CertificateValidationError,
  MockNetworkError,
  type CertificateValidationCode,
} from '@/lib/mock-backend/errors';
import type { Certificate } from '@/types/domain';
import { apiFetch, ApiError } from './client';

const KNOWN_CODES: readonly CertificateValidationCode[] = ['serial-taken', 'pinfl-mismatch'];

function isCertificateValidationCode(code: string | undefined): code is CertificateValidationCode {
  return !!code && (KNOWN_CODES as readonly string[]).includes(code);
}

/** Rethrows `err` translated to the mock's error vocabulary; always throws. */
function rethrow(err: unknown): never {
  if (err instanceof ApiError) {
    if (isCertificateValidationCode(err.code)) throw new CertificateValidationError(err.code);
    if (err.status === 0) throw new MockNetworkError();
  }
  throw err;
}

export interface CertificateFilters {
  status?: Certificate['status'];
  employeeUuid?: string;
}

export async function listCertificates(filters?: CertificateFilters): Promise<Certificate[]> {
  const params = new URLSearchParams();
  if (filters?.status) params.set('status', filters.status);
  if (filters?.employeeUuid) params.set('employeeUuid', filters.employeeUuid);
  const qs = params.toString();

  try {
    return await apiFetch<Certificate[]>(`/certificates${qs ? `?${qs}` : ''}`);
  } catch (err) {
    rethrow(err);
  }
}

export interface UploadCertificateInput {
  employeeUuid: string;
  serialNumber: string;
  thumbprint: string;
  subjectPinfl: string;
  subjectCommonName: string;
  subjectOrganization?: string;
  issuerName: string;
  validFrom: string;
  validTo: string;
  keyUsage: string[];
  certificateType: Certificate['certificateType'];
  autoApprove?: boolean;
}

export async function uploadCertificate(
  input: UploadCertificateInput,
  _actorUuid: string,
): Promise<Certificate> {
  try {
    return await apiFetch<Certificate>('/certificates', { method: 'POST', body: input });
  } catch (err) {
    rethrow(err);
  }
}

export async function approveCertificate(uuid: string, _actorUuid: string): Promise<Certificate> {
  try {
    return await apiFetch<Certificate>(`/certificates/${uuid}/approve`, { method: 'POST' });
  } catch (err) {
    rethrow(err);
  }
}

export async function rejectCertificate(
  uuid: string,
  reason: string,
  _actorUuid: string,
): Promise<Certificate> {
  try {
    return await apiFetch<Certificate>(`/certificates/${uuid}/reject`, {
      method: 'POST',
      body: { reason },
    });
  } catch (err) {
    rethrow(err);
  }
}

export async function revokeCertificate(
  uuid: string,
  reason: Certificate['revocationReason'],
  _actorUuid: string,
): Promise<Certificate> {
  try {
    return await apiFetch<Certificate>(`/certificates/${uuid}/revoke`, {
      method: 'POST',
      body: { reason },
    });
  } catch (err) {
    rethrow(err);
  }
}

/**
 * UI-cosmetic drag reorder (PLAN_PHASE_E.md §2) — the real backend does not
 * persist certificate display order (no endpoint for it); within-column
 * reorder stays local to the current session only and resets on the next
 * `listCertificates` reload. Signature-compatible no-op so
 * `CertificatesPage`'s `onReorder` handler works unchanged against either
 * backend.
 */
export async function reorderCertificates(_orderedUuids: string[]): Promise<void> {
  return undefined;
}
