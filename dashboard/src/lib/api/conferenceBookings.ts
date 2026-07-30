// Real API client for conference-room bookings (PLAN_conference-room.md
// §4). New module — no mock counterpart.

import type { ConferenceBooking } from '@/types/domain';
import { apiFetch, ApiError } from './client';
import { ConferenceNetworkError, isConferenceValidationCode, ConferenceValidationError } from './conferenceErrors';

function rethrow(err: unknown): never {
  if (err instanceof ApiError) {
    if (isConferenceValidationCode(err.code)) throw new ConferenceValidationError(err.code);
    if (err.status === 0) throw new ConferenceNetworkError();
  }
  throw err;
}

export interface ListConferenceBookingsFilters {
  roomUuid?: string;
  date?: string;
  /** `'mine'` restricts to the authenticated user's own bookings. */
  box?: 'mine';
}

export async function listConferenceBookings(
  filters: ListConferenceBookingsFilters = {},
): Promise<ConferenceBooking[]> {
  const params = new URLSearchParams();
  if (filters.roomUuid) params.set('roomUuid', filters.roomUuid);
  if (filters.date) params.set('date', filters.date);
  if (filters.box) params.set('box', filters.box);
  const qs = params.toString();
  try {
    return await apiFetch<ConferenceBooking[]>(`/conference-bookings${qs ? `?${qs}` : ''}`);
  } catch (err) {
    rethrow(err);
  }
}

export interface CreateConferenceBookingInput {
  roomUuid: string;
  purpose: string;
  /** `YYYY-MM-DD`. */
  date: string;
  /** `HH:mm`. */
  startTime: string;
  /** `HH:mm`. */
  endTime: string;
}

export async function createConferenceBooking(
  input: CreateConferenceBookingInput,
): Promise<ConferenceBooking> {
  try {
    return await apiFetch<ConferenceBooking>('/conference-bookings', {
      method: 'POST',
      body: input,
    });
  } catch (err) {
    rethrow(err);
  }
}

export async function cancelConferenceBooking(uuid: string): Promise<ConferenceBooking> {
  try {
    return await apiFetch<ConferenceBooking>(`/conference-bookings/${uuid}/cancel`, {
      method: 'POST',
    });
  } catch (err) {
    rethrow(err);
  }
}
