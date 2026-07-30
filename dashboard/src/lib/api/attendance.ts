// Real API client for daily attendance check-in/check-out (PLAN_tabel-
// davomat.md §3/§4). New module — no mock counterpart, so there's no
// signature to mirror; this is the sole implementation
// `src/lib/data/attendance.ts` re-exports.

import type { AttendanceRecord } from '@/types/domain';
import { apiFetch, ApiError } from './client';
import {
  AttendanceNetworkError,
  AttendanceValidationError,
  isAttendanceValidationCode,
} from './attendanceErrors';

function rethrow(err: unknown): never {
  if (err instanceof ApiError) {
    if (isAttendanceValidationCode(err.code)) throw new AttendanceValidationError(err.code);
    if (err.status === 0) throw new AttendanceNetworkError();
  }
  throw err;
}

export async function checkIn(): Promise<AttendanceRecord> {
  try {
    return await apiFetch<AttendanceRecord>('/attendance/check-in', { method: 'POST', body: {} });
  } catch (err) {
    rethrow(err);
  }
}

export async function checkOut(): Promise<AttendanceRecord> {
  try {
    return await apiFetch<AttendanceRecord>('/attendance/check-out', { method: 'POST', body: {} });
  } catch (err) {
    rethrow(err);
  }
}

/** The acting employee's own attendance history for a given month (`YYYY-MM`). */
export async function myAttendance(month: string): Promise<AttendanceRecord[]> {
  try {
    return await apiFetch<AttendanceRecord[]>(
      `/attendance/me?month=${encodeURIComponent(month)}`,
    );
  } catch (err) {
    rethrow(err);
  }
}

export interface AttendanceFilters {
  unitUuid?: string;
  date?: string;
}

/** HR/monitoring view (`can:attendance.view`). */
export async function listAttendance(filters?: AttendanceFilters): Promise<AttendanceRecord[]> {
  const params = new URLSearchParams();
  if (filters?.unitUuid) params.set('unitUuid', filters.unitUuid);
  if (filters?.date) params.set('date', filters.date);
  const qs = params.toString();
  try {
    return await apiFetch<AttendanceRecord[]>(`/attendance${qs ? `?${qs}` : ''}`);
  } catch (err) {
    rethrow(err);
  }
}

export interface ManualAttendanceInput {
  employeeUuid: string;
  workDate: string;
  checkInAt?: string;
  checkOutAt?: string;
  status: AttendanceRecord['status'];
  note?: string;
}

/** HR manual entry/correction (`can:attendance.manage`). */
export async function manualAttendance(input: ManualAttendanceInput): Promise<AttendanceRecord> {
  try {
    return await apiFetch<AttendanceRecord>('/attendance/manual', { method: 'POST', body: input });
  } catch (err) {
    rethrow(err);
  }
}
