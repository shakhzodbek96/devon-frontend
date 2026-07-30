// Data-seam facade for conference rooms (PLAN_conference-room.md §4). New
// module — no mock backend, so this simply re-exports the real API under
// the facade's stable import path (`src/features/conference-rooms/*` never
// imports `src/lib/api/*` directly). A `mock` branch can be added here later
// without touching any consumer.

export {
  listConferenceRooms,
  createConferenceRoom,
  updateConferenceRoom,
  archiveConferenceRoom,
} from '@/lib/api/conferenceRooms';
export type {
  CreateConferenceRoomInput,
  UpdateConferenceRoomInput,
} from '@/lib/api/conferenceRooms';
export {
  ConferenceNetworkError,
  ConferenceValidationError,
  type ConferenceValidationCode,
} from '@/lib/api/conferenceErrors';
