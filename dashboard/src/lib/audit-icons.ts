// Single source of truth for the audit-action → lucide-icon mapping.
//
// Three surfaces render audit entries with the same iconography and MUST stay
// in sync: the home `RecentActivityCard`, the `/audit` log rows, and the
// employee-profile history tab. Before this module the map lived inline in all
// three; step 22 extracted it here so adding an `AuditAction` only touches one
// place. The `Record<AuditAction, LucideIcon>` typing makes the map exhaustive
// against the FRONTEND `AuditAction` union at compile time — but that union
// can still drift behind whatever action strings the backend actually logs
// (it did: a whole batch of new-module actions shipped without a frontend
// update, and every one of those audit rows crashed the ENTIRE app with
// "Element type is invalid" — no error boundary existed to contain it).
// `getActionIcon` below is the runtime safety net all three surfaces must
// call through instead of indexing `ACTION_ICON` directly.

import {
  Archive,
  ArrowRightLeft,
  BadgeCheck,
  CalendarX,
  CheckCircle,
  CirclePlay,
  ClipboardCheck,
  Drama,
  Eye,
  FileCheck,
  FileCheck2,
  FilePenLine,
  FilePlus,
  FileX,
  Forward,
  HelpCircle,
  KeyRound,
  LogIn,
  LogOut,
  Mail,
  MailCheck,
  MailPlus,
  MessageCircle,
  Pencil,
  PenLine,
  Plus,
  RefreshCw,
  Send,
  SendHorizontal,
  ShieldCheck,
  ShieldOff,
  ShieldX,
  Table as TableIcon,
  Trash2,
  UserMinus,
  Upload,
  UserCheck,
  UserCog,
  UserPlus,
  XCircle,
  type LucideIcon,
} from 'lucide-react';

import type { AuditAction } from '@/types/domain';

export const ACTION_ICON: Record<AuditAction, LucideIcon> = {
  CREATE: Plus,
  UPDATE: Pencil,
  DELETE: Trash2,
  ARCHIVE: Archive,
  LOGIN: LogIn,
  LOGOUT: LogOut,
  PASSWORD_CHANGED: KeyRound,
  UNIT_TRANSFER: ArrowRightLeft,
  CERTIFICATE_UPLOADED: Upload,
  CERTIFICATE_APPROVED: ShieldCheck,
  CERTIFICATE_REJECTED: ShieldOff,
  CERTIFICATE_REVOKED: ShieldX,
  PROFILE_CHANGE_REQUESTED: UserCog,
  PROFILE_CHANGE_APPROVED: UserCheck,
  POV_SWITCHED: Drama,
  DOCUMENT_CREATED: FilePlus,
  DOCUMENT_SENT_FOR_REVIEW: Send,
  DOCUMENT_APPROVED: FileCheck,
  DOCUMENT_REJECTED: FileX,
  DOCUMENT_SIGNED: FilePenLine,
  DOCUMENT_CLOSED: FileCheck2,
  DOCUMENT_VIEWED: Eye,
  DOCUMENT_EMAILED: Mail,
  LETTER_REGISTERED: MailPlus,
  LETTER_ROUTED: Forward,
  LETTER_ASSIGNED: UserPlus,
  LETTER_EXECUTED: ClipboardCheck,
  LETTER_ACCEPTED: BadgeCheck,
  LETTER_SIGNED: PenLine,
  LETTER_DISPATCHED: SendHorizontal,
  LETTER_CLOSED: MailCheck,
  TASK_CREATED: FilePlus,
  TASK_UPDATED: Pencil,
  TASK_STARTED: CirclePlay,
  TASK_CLARIFICATION_REQUESTED: HelpCircle,
  TASK_CLARIFICATION_ANSWERED: MessageCircle,
  TASK_SUBMITTED: Send,
  TASK_ACCEPTED: CheckCircle,
  TASK_RETURNED: RefreshCw,
  TASK_REJECTED: XCircle,
  CANCEL: CalendarX,
  ATTENDANCE_CHECKED_IN: LogIn,
  ATTENDANCE_CHECKED_OUT: LogOut,
  ATTENDANCE_MANUAL_ENTRY: PenLine,
  TABEL_GENERATED: TableIcon,
  TABEL_ENTRIES_UPDATED: Pencil,
  TABEL_SUBMITTED: Send,
  TABEL_HEAD_SIGNED: FilePenLine,
  TABEL_HEAD_REJECTED: FileX,
  TABEL_HR_ACCEPTED: FileCheck,
  TABEL_HR_REJECTED: FileX,
  TABEL_REGISTRY_DISPATCHED: SendHorizontal,
  COLLEGIAL_MEMBER_ADDED: UserPlus,
  COLLEGIAL_MEMBER_REMOVED: UserMinus,
  PROTOCOL_CREATED: FilePlus,
  PROTOCOL_UPDATED: Pencil,
  PROTOCOL_SUBMITTED: Send,
  PROTOCOL_REVIEWER_APPROVED: FileCheck,
  PROTOCOL_REVIEWER_REJECTED: FileX,
  PROTOCOL_SENT_TO_MEMBERS: Forward,
  PROTOCOL_MEMBER_SIGNED: FilePenLine,
  PROTOCOL_MEMBER_DECLINED: XCircle,
  PROTOCOL_SENT_TO_CHAIRMAN: Forward,
  PROTOCOL_CHAIRMAN_APPROVED: BadgeCheck,
  PROTOCOL_CHAIRMAN_REJECTED: FileX,
};

/**
 * Fallback for any action string the backend logs that isn't (yet) in
 * `ACTION_ICON`, instead of handing `undefined` to React and crashing the
 * whole app (see module doc above). Callers must look up as
 * `ACTION_ICON[action as AuditAction] ?? DEFAULT_ACTION_ICON` — NOT a
 * wrapper function call, which trips the "components created during
 * render" lint rule (it can't see through the call that the result is
 * still just a static map value).
 */
export const DEFAULT_ACTION_ICON: LucideIcon = HelpCircle;
