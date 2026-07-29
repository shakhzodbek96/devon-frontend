// Real backend for employee self-service profile-change requests
// (PLAN_PHASE_C.md §2). Signature-compatible with the mock's
// `submitProfileChangeRequest` / `listProfileRequests` /
// `approveProfileRequest` (`src/lib/mock-backend/index.ts`).

import { MockNetworkError } from '@/lib/mock-backend/errors';
import type { ProfileChangeRequest } from '@/types/domain';
import { apiFetch, ApiError } from './client';

function rethrow(err: unknown): never {
  if (err instanceof ApiError && err.status === 0) throw new MockNetworkError();
  throw err;
}

export interface SubmitProfileChangeInput {
  employeeUuid: string;
  fields: Record<string, { from: unknown; to: unknown }>;
}

/**
 * `employeeUuid` is accepted for signature compatibility with the mock but
 * ignored — the backend resolves it from the acting user's own linked
 * employee (`POST /me/profile-change-request`), never trusted from the
 * client.
 */
export async function submitProfileChangeRequest(
  input: SubmitProfileChangeInput,
  _actorUuid: string,
): Promise<ProfileChangeRequest> {
  try {
    return await apiFetch<ProfileChangeRequest>('/me/profile-change-request', {
      method: 'POST',
      body: { fields: input.fields },
    });
  } catch (err) {
    rethrow(err);
  }
}

export async function listProfileRequests(
  status?: ProfileChangeRequest['status'],
): Promise<ProfileChangeRequest[]> {
  try {
    const qs = status ? `?status=${status}` : '';

    return await apiFetch<ProfileChangeRequest[]>(`/profile-change-requests${qs}`);
  } catch (err) {
    rethrow(err);
  }
}

export async function approveProfileRequest(
  uuid: string,
  _actorUuid: string,
  decision: 'APPROVED' | 'REJECTED',
  rejectionReason?: string,
): Promise<ProfileChangeRequest> {
  try {
    return await apiFetch<ProfileChangeRequest>(`/profile-change-requests/${uuid}/decide`, {
      method: 'POST',
      body: { decision, rejectionReason },
    });
  } catch (err) {
    rethrow(err);
  }
}
