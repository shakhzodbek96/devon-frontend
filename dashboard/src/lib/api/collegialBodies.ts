// Real API client for the standing collegial-body registry (admin CRUD +
// permanent-roster member management, PLAN_kollegial-organ.md §4). New
// module — no mock counterpart, so there's no signature to mirror; this is
// the sole implementation `src/lib/data/collegialBodies.ts` re-exports.

import type { CollegialBody } from '@/types/domain';
import { apiFetch, ApiError } from './client';
import {
  CollegialNetworkError,
  CollegialValidationError,
  isCollegialValidationCode,
} from './collegialErrors';

function rethrow(err: unknown): never {
  if (err instanceof ApiError) {
    if (isCollegialValidationCode(err.code)) throw new CollegialValidationError(err.code);
    if (err.status === 0) throw new CollegialNetworkError();
  }
  throw err;
}

/** Open to every authenticated user (protocol-creation flow needs to list bodies). */
export async function listCollegialBodies(): Promise<CollegialBody[]> {
  try {
    return await apiFetch<CollegialBody[]>('/collegial-bodies');
  } catch (err) {
    rethrow(err);
  }
}

export interface CollegialBodyInput {
  name: string;
  chairmanEmployeeUuid: string;
  secretaryEmployeeUuid: string;
  quorumMin: number;
  memberEmployeeUuids?: string[];
}

/** `collegial.manage` only. */
export async function createCollegialBody(input: CollegialBodyInput): Promise<CollegialBody> {
  try {
    return await apiFetch<CollegialBody>('/collegial-bodies', { method: 'POST', body: input });
  } catch (err) {
    rethrow(err);
  }
}

export interface UpdateCollegialBodyInput {
  name?: string;
  chairmanEmployeeUuid?: string;
  secretaryEmployeeUuid?: string;
  quorumMin?: number;
}

/** `collegial.manage` only. Roster membership is managed separately — see below. */
export async function updateCollegialBody(
  uuid: string,
  patch: UpdateCollegialBodyInput,
): Promise<CollegialBody> {
  try {
    return await apiFetch<CollegialBody>(`/collegial-bodies/${uuid}`, {
      method: 'PATCH',
      body: patch,
    });
  } catch (err) {
    rethrow(err);
  }
}

/** `collegial.manage` only — soft archive. */
export async function archiveCollegialBody(uuid: string): Promise<void> {
  try {
    await apiFetch<void>(`/collegial-bodies/${uuid}`, { method: 'DELETE' });
  } catch (err) {
    rethrow(err);
  }
}

/** `collegial.manage` only. */
export async function addCollegialBodyMember(
  uuid: string,
  employeeUuid: string,
): Promise<CollegialBody> {
  try {
    return await apiFetch<CollegialBody>(`/collegial-bodies/${uuid}/members`, {
      method: 'POST',
      body: { employeeUuid },
    });
  } catch (err) {
    rethrow(err);
  }
}

/** `collegial.manage` only. */
export async function removeCollegialBodyMember(
  uuid: string,
  employeeUuid: string,
): Promise<CollegialBody> {
  try {
    return await apiFetch<CollegialBody>(
      `/collegial-bodies/${uuid}/members/${employeeUuid}`,
      { method: 'DELETE' },
    );
  } catch (err) {
    rethrow(err);
  }
}
