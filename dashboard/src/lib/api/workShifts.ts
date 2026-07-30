// Real API client for standard work-shift config (admin CRUD, PLAN_tabel-
// davomat.md §3/§4). New module — no mock counterpart, so there's no
// signature to mirror; this is the sole implementation
// `src/lib/data/workShifts.ts` re-exports.

import type { WorkShift } from '@/types/domain';
import { apiFetch, ApiError } from './client';
import { AttendanceNetworkError } from './attendanceErrors';

function rethrow(err: unknown): never {
  if (err instanceof ApiError && err.status === 0) throw new AttendanceNetworkError();
  throw err;
}

export async function listWorkShifts(): Promise<WorkShift[]> {
  try {
    return await apiFetch<WorkShift[]>('/work-shifts');
  } catch (err) {
    rethrow(err);
  }
}

export interface CreateWorkShiftInput {
  unitUuid?: string;
  startTime: string;
  endTime: string;
  lateGraceMin?: number;
  earlyExitGraceMin?: number;
}

export async function createWorkShift(input: CreateWorkShiftInput): Promise<WorkShift> {
  try {
    return await apiFetch<WorkShift>('/work-shifts', { method: 'POST', body: input });
  } catch (err) {
    rethrow(err);
  }
}

export interface UpdateWorkShiftInput {
  unitUuid?: string;
  startTime?: string;
  endTime?: string;
  lateGraceMin?: number;
  earlyExitGraceMin?: number;
}

export async function updateWorkShift(
  uuid: string,
  patch: UpdateWorkShiftInput,
): Promise<WorkShift> {
  try {
    return await apiFetch<WorkShift>(`/work-shifts/${uuid}`, { method: 'PATCH', body: patch });
  } catch (err) {
    rethrow(err);
  }
}

export async function deleteWorkShift(uuid: string): Promise<void> {
  try {
    await apiFetch<void>(`/work-shifts/${uuid}`, { method: 'DELETE' });
  } catch (err) {
    rethrow(err);
  }
}
