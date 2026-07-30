// Real API client for office Wi-Fi perimeter config (admin CRUD,
// PLAN_tabel-davomat.md §3/§4). New module — no mock counterpart, so
// there's no signature to mirror; this is the sole implementation
// `src/lib/data/officeNetworks.ts` re-exports.

import type { OfficeNetwork } from '@/types/domain';
import { apiFetch, ApiError } from './client';
import { AttendanceNetworkError } from './attendanceErrors';

function rethrow(err: unknown): never {
  if (err instanceof ApiError && err.status === 0) throw new AttendanceNetworkError();
  throw err;
}

export async function listOfficeNetworks(): Promise<OfficeNetwork[]> {
  try {
    return await apiFetch<OfficeNetwork[]>('/office-networks');
  } catch (err) {
    rethrow(err);
  }
}

export interface CreateOfficeNetworkInput {
  name: string;
  cidr: string;
  unitUuid?: string;
}

export async function createOfficeNetwork(
  input: CreateOfficeNetworkInput,
): Promise<OfficeNetwork> {
  try {
    return await apiFetch<OfficeNetwork>('/office-networks', { method: 'POST', body: input });
  } catch (err) {
    rethrow(err);
  }
}

export interface UpdateOfficeNetworkInput {
  name?: string;
  cidr?: string;
  unitUuid?: string;
  status?: OfficeNetwork['status'];
}

export async function updateOfficeNetwork(
  uuid: string,
  patch: UpdateOfficeNetworkInput,
): Promise<OfficeNetwork> {
  try {
    return await apiFetch<OfficeNetwork>(`/office-networks/${uuid}`, {
      method: 'PATCH',
      body: patch,
    });
  } catch (err) {
    rethrow(err);
  }
}

export async function deleteOfficeNetwork(uuid: string): Promise<void> {
  try {
    await apiFetch<void>(`/office-networks/${uuid}`, { method: 'DELETE' });
  } catch (err) {
    rethrow(err);
  }
}
