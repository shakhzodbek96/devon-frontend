// Real API client for the monthly tabel (attendance sheet) approval
// workflow (PLAN_tabel-davomat.md §3/§4). New module — no mock counterpart,
// so there's no signature to mirror; this is the sole implementation
// `src/lib/data/tabels.ts` re-exports.

import type { Tabel, TabelEntryStatus, TabelRegistry } from '@/types/domain';
import { apiFetch, ApiError } from './client';
import { TabelNetworkError, TabelValidationError, isTabelValidationCode } from './tabelErrors';

function rethrow(err: unknown): never {
  if (err instanceof ApiError) {
    if (isTabelValidationCode(err.code)) throw new TabelValidationError(err.code);
    if (err.status === 0) throw new TabelNetworkError();
  }
  throw err;
}

/** Idempotent — returns the existing DRAFT/etc. tabel or creates one. */
export async function generateTabel(unitUuid: string, period: string): Promise<Tabel> {
  try {
    return await apiFetch<Tabel>('/tabels/generate', {
      method: 'POST',
      body: { unitUuid, period },
    });
  } catch (err) {
    rethrow(err);
  }
}

export interface TabelFilters {
  unitUuid?: string;
  period?: string;
  /** 'mine' — tabels of units the acting employee heads. */
  box?: 'mine';
}

export async function listTabels(filters?: TabelFilters): Promise<Tabel[]> {
  const params = new URLSearchParams();
  if (filters?.unitUuid) params.set('unitUuid', filters.unitUuid);
  if (filters?.period) params.set('period', filters.period);
  if (filters?.box) params.set('box', filters.box);
  const qs = params.toString();
  try {
    return await apiFetch<Tabel[]>(`/tabels${qs ? `?${qs}` : ''}`);
  } catch (err) {
    rethrow(err);
  }
}

export async function getTabel(uuid: string): Promise<Tabel> {
  try {
    return await apiFetch<Tabel>(`/tabels/${uuid}`);
  } catch (err) {
    rethrow(err);
  }
}

export interface TabelEntryPatch {
  employeeUuid: string;
  workDate: string;
  status: TabelEntryStatus;
  note?: string;
}

export async function updateTabelEntries(uuid: string, entries: TabelEntryPatch[]): Promise<Tabel> {
  try {
    return await apiFetch<Tabel>(`/tabels/${uuid}/entries`, {
      method: 'PATCH',
      body: { entries },
    });
  } catch (err) {
    rethrow(err);
  }
}

export async function submitTabel(uuid: string): Promise<Tabel> {
  try {
    return await apiFetch<Tabel>(`/tabels/${uuid}/submit`, { method: 'POST', body: {} });
  } catch (err) {
    rethrow(err);
  }
}

export interface HeadDecideInput {
  approve: boolean;
  certificateUuid?: string;
  signatureHex?: string;
  note?: string;
}

/** Unit head decision — `approve: true` requires an ERI signature. */
export async function headDecideTabel(uuid: string, input: HeadDecideInput): Promise<Tabel> {
  try {
    return await apiFetch<Tabel>(`/tabels/${uuid}/head-decide`, { method: 'POST', body: input });
  } catch (err) {
    rethrow(err);
  }
}

export interface HrDecideInput {
  approve: boolean;
  note?: string;
}

export async function hrDecideTabel(uuid: string, input: HrDecideInput): Promise<Tabel> {
  try {
    return await apiFetch<Tabel>(`/tabels/${uuid}/hr-decide`, { method: 'POST', body: input });
  } catch (err) {
    rethrow(err);
  }
}

/** Accounting-facing registry view for a period (`can:attendance.view-registry`). */
export async function getTabelRegistry(period: string): Promise<TabelRegistry> {
  try {
    return await apiFetch<TabelRegistry>(`/tabel-registry/${encodeURIComponent(period)}`);
  } catch (err) {
    rethrow(err);
  }
}
