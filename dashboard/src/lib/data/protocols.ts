// Data-seam facade for the bayonnoma (protocol) approval chain
// (PLAN_kollegial-organ.md §4). New module — no mock backend, so this
// simply re-exports the real API under the facade's stable import path
// (`src/features/collegial/*` never imports `src/lib/api/*` directly). A
// `mock` branch can be added here later without touching any consumer.

export {
  listProtocols,
  getProtocol,
  createProtocol,
  updateProtocol,
  submitProtocol,
  reviewerDecideProtocol,
  memberSignProtocol,
  memberDeclineProtocol,
  chairmanDecideProtocol,
} from '@/lib/api/protocols';
export type {
  ProtocolFilters,
  ProtocolInput,
  ProtocolPatch,
  ReviewerDecideInput,
  MemberSignInput,
  ChairmanDecideInput,
} from '@/lib/api/protocols';
export {
  CollegialNetworkError,
  CollegialValidationError,
  type CollegialValidationCode,
} from '@/lib/api/collegialErrors';
