// Real API client for the bayonnoma (protocol) approval chain
// (PLAN_kollegial-organ.md §1, §4). New module — no mock counterpart, so
// there's no signature to mirror; this is the sole implementation
// `src/lib/data/protocols.ts` re-exports.

import type { Protocol } from '@/types/domain';
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

export interface ProtocolFilters {
  bodyUuid?: string;
  status?: string;
  /** 'mine' — protocols where the acting employee is secretary/reviewer/participant/chairman. */
  box?: 'mine';
}

/** Note: list rows do NOT include `reviewers`/`participants` (backend doesn't eager-load for `index`). */
export async function listProtocols(filters?: ProtocolFilters): Promise<Protocol[]> {
  const params = new URLSearchParams();
  if (filters?.bodyUuid) params.set('bodyUuid', filters.bodyUuid);
  if (filters?.status) params.set('status', filters.status);
  if (filters?.box) params.set('box', filters.box);
  const qs = params.toString();
  try {
    return await apiFetch<Protocol[]>(`/protocols${qs ? `?${qs}` : ''}`);
  } catch (err) {
    rethrow(err);
  }
}

export async function getProtocol(uuid: string): Promise<Protocol> {
  try {
    return await apiFetch<Protocol>(`/protocols/${uuid}`);
  } catch (err) {
    rethrow(err);
  }
}

export interface ProtocolInput {
  /** `YYYY-MM-DD`. */
  protocolDate: string;
  templateKey: string;
  agenda: string;
  participantUuids: string[];
  reviewerUuids?: string[];
}

/** Secretary of the body, or `collegial.manage`. Creates a DRAFT. */
export async function createProtocol(bodyUuid: string, input: ProtocolInput): Promise<Protocol> {
  try {
    return await apiFetch<Protocol>(`/collegial-bodies/${bodyUuid}/protocols`, {
      method: 'POST',
      body: input,
    });
  } catch (err) {
    rethrow(err);
  }
}

export interface ProtocolPatch {
  protocolDate?: string;
  templateKey?: string;
  agenda?: string;
  participantUuids?: string[];
  reviewerUuids?: string[];
}

/** Only in EDITABLE_STATUSES (DRAFT/*_REJECTED); secretary/`collegial.manage` only. */
export async function updateProtocol(uuid: string, patch: ProtocolPatch): Promise<Protocol> {
  try {
    return await apiFetch<Protocol>(`/protocols/${uuid}`, { method: 'PATCH', body: patch });
  } catch (err) {
    rethrow(err);
  }
}

export async function submitProtocol(uuid: string): Promise<Protocol> {
  try {
    return await apiFetch<Protocol>(`/protocols/${uuid}/submit`, { method: 'POST', body: {} });
  } catch (err) {
    rethrow(err);
  }
}

export interface ReviewerDecideInput {
  approve: boolean;
  /** Required when `approve: false`. */
  note?: string;
}

/** No ERI — reviewers just confirm "no objection" (drawio has no signature at this station). */
export async function reviewerDecideProtocol(
  uuid: string,
  input: ReviewerDecideInput,
): Promise<Protocol> {
  try {
    return await apiFetch<Protocol>(`/protocols/${uuid}/reviewer-decide`, {
      method: 'POST',
      body: input,
    });
  } catch (err) {
    rethrow(err);
  }
}

export interface MemberSignInput {
  certificateUuid: string;
  signatureHex: string;
}

export async function memberSignProtocol(uuid: string, input: MemberSignInput): Promise<Protocol> {
  try {
    return await apiFetch<Protocol>(`/protocols/${uuid}/member-sign`, {
      method: 'POST',
      body: input,
    });
  } catch (err) {
    rethrow(err);
  }
}

export async function memberDeclineProtocol(uuid: string, note: string): Promise<Protocol> {
  try {
    return await apiFetch<Protocol>(`/protocols/${uuid}/member-decline`, {
      method: 'POST',
      body: { note },
    });
  } catch (err) {
    rethrow(err);
  }
}

export interface ChairmanDecideInput {
  approve: boolean;
  /** Required when `approve: true` (ERI). */
  certificateUuid?: string;
  signatureHex?: string;
  /** Required when `approve: false`. */
  note?: string;
}

export async function chairmanDecideProtocol(
  uuid: string,
  input: ChairmanDecideInput,
): Promise<Protocol> {
  try {
    return await apiFetch<Protocol>(`/protocols/${uuid}/chairman-decide`, {
      method: 'POST',
      body: input,
    });
  } catch (err) {
    rethrow(err);
  }
}
