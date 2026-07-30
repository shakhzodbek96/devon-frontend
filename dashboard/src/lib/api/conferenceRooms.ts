// Real API client for conference rooms (admin CRUD, PLAN_conference-room.md
// §4). New module — no mock counterpart, so there's no signature to mirror;
// this is the sole implementation `src/lib/data/conferenceRooms.ts` re-exports.

import type { ConferenceRoom, ConferenceRoomStatus } from '@/types/domain';
import { apiFetch, ApiError } from './client';
import { ConferenceNetworkError, isConferenceValidationCode, ConferenceValidationError } from './conferenceErrors';

function rethrow(err: unknown): never {
  if (err instanceof ApiError) {
    if (isConferenceValidationCode(err.code)) throw new ConferenceValidationError(err.code);
    if (err.status === 0) throw new ConferenceNetworkError();
  }
  throw err;
}

export async function listConferenceRooms(): Promise<ConferenceRoom[]> {
  try {
    return await apiFetch<ConferenceRoom[]>('/conference-rooms');
  } catch (err) {
    rethrow(err);
  }
}

export interface CreateConferenceRoomInput {
  name: string;
  capacity: number;
  location?: string;
}

export async function createConferenceRoom(
  input: CreateConferenceRoomInput,
): Promise<ConferenceRoom> {
  try {
    return await apiFetch<ConferenceRoom>('/conference-rooms', { method: 'POST', body: input });
  } catch (err) {
    rethrow(err);
  }
}

export interface UpdateConferenceRoomInput {
  name?: string;
  capacity?: number;
  location?: string;
  status?: ConferenceRoomStatus;
}

export async function updateConferenceRoom(
  uuid: string,
  patch: UpdateConferenceRoomInput,
): Promise<ConferenceRoom> {
  try {
    return await apiFetch<ConferenceRoom>(`/conference-rooms/${uuid}`, {
      method: 'PATCH',
      body: patch,
    });
  } catch (err) {
    rethrow(err);
  }
}

export async function archiveConferenceRoom(uuid: string): Promise<void> {
  try {
    await apiFetch<void>(`/conference-rooms/${uuid}`, { method: 'DELETE' });
  } catch (err) {
    rethrow(err);
  }
}
