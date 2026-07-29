// Data-seam facade for employee self-service profile-change requests
// (PLAN_PHASE_C.md §4). Re-exports either the real API
// (`src/lib/api/profileRequests.ts`) or the localStorage mock
// (`src/lib/mock-backend`), switched centrally by `src/lib/data/config.ts`.

import * as mockBackend from '@/lib/mock-backend';
import * as realApi from '@/lib/api/profileRequests';
import { dataSourceConfig } from './config';

export type { SubmitProfileChangeInput } from '@/lib/api/profileRequests';

export const submitProfileChangeRequest =
  dataSourceConfig.profileRequests === 'real'
    ? realApi.submitProfileChangeRequest
    : mockBackend.submitProfileChangeRequest;
export const listProfileRequests =
  dataSourceConfig.profileRequests === 'real'
    ? realApi.listProfileRequests
    : mockBackend.listProfileRequests;
export const approveProfileRequest =
  dataSourceConfig.profileRequests === 'real'
    ? realApi.approveProfileRequest
    : mockBackend.approveProfileRequest;
