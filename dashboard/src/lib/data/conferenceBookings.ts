// Data-seam facade for conference-room bookings (PLAN_conference-room.md
// §4). New module — no mock backend, so this re-exports the real API.

export {
  listConferenceBookings,
  createConferenceBooking,
  cancelConferenceBooking,
} from '@/lib/api/conferenceBookings';
export type {
  ListConferenceBookingsFilters,
  CreateConferenceBookingInput,
} from '@/lib/api/conferenceBookings';
export {
  ConferenceNetworkError,
  ConferenceValidationError,
  type ConferenceValidationCode,
} from '@/lib/api/conferenceErrors';
