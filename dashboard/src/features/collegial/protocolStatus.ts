// Shared status → badge-variant lookup for the protocol (bayonnoma) module
// (PLAN_kollegial-organ.md §5) — mirrors `attendance/statusMeta.ts`'s role.

import type { ProtocolStatus } from '@/types/domain';

type BadgeVariant = 'default' | 'secondary' | 'destructive' | 'outline';

const VARIANT: Record<ProtocolStatus, BadgeVariant> = {
  DRAFT: 'outline',
  SENT_FOR_REVIEW: 'secondary',
  REVIEW_REJECTED: 'destructive',
  SENT_TO_MEMBERS: 'secondary',
  MEMBERS_REJECTED: 'destructive',
  SENT_TO_CHAIRMAN: 'secondary',
  CHAIRMAN_REJECTED: 'destructive',
  APPROVED: 'default',
};

export function protocolStatusVariant(status: ProtocolStatus): BadgeVariant {
  return VARIANT[status];
}

export const EDITABLE_PROTOCOL_STATUSES: ProtocolStatus[] = [
  'DRAFT',
  'REVIEW_REJECTED',
  'MEMBERS_REJECTED',
  'CHAIRMAN_REJECTED',
];
