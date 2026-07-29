// Data-seam facade for the ERI Certificates module (Flow 4, PLAN_PHASE_E.md
// §7). Re-exports either the real API (`src/lib/api/certificates.ts`) or the
// localStorage mock (`src/lib/mock-backend`) under one stable signature,
// switched centrally by `src/lib/data/config.ts`. `src/features/
// certificates/*`, `src/features/employees/profile/ProfileCertificatesTab`,
// and `src/features/dashboard-home/ExpiringCertsAlert` import from here —
// never straight from the mock.

import * as mockBackend from '@/lib/mock-backend';
import * as realApi from '@/lib/api/certificates';
import { dataSourceConfig } from './config';

export { CertificateValidationError, MockNetworkError } from '@/lib/mock-backend/errors';
export type { CertificateFilters, UploadCertificateInput } from '@/lib/api/certificates';

export const listCertificates =
  dataSourceConfig.certificates === 'real' ? realApi.listCertificates : mockBackend.listCertificates;
export const uploadCertificate =
  dataSourceConfig.certificates === 'real' ? realApi.uploadCertificate : mockBackend.uploadCertificate;
export const approveCertificate =
  dataSourceConfig.certificates === 'real' ? realApi.approveCertificate : mockBackend.approveCertificate;
export const rejectCertificate =
  dataSourceConfig.certificates === 'real' ? realApi.rejectCertificate : mockBackend.rejectCertificate;
export const revokeCertificate =
  dataSourceConfig.certificates === 'real' ? realApi.revokeCertificate : mockBackend.revokeCertificate;
export const reorderCertificates =
  dataSourceConfig.certificates === 'real'
    ? realApi.reorderCertificates
    : mockBackend.reorderCertificates;
