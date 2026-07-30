// Devon domain types — mirrors the HR & ERI TZ data model (master §15).
// All entity ids are `uuid` strings on the client; server-side ints are
// irrelevant for the localStorage-backed mock backend.

export type Role =
  | 'ROLE_SUPER_ADMIN'
  | 'ROLE_HR_ADMIN'
  | 'ROLE_HR_OPERATOR'
  | 'ROLE_UNIT_HEAD'
  | 'ROLE_EMPLOYEE'
  | 'ROLE_AUDITOR'
  | 'ROLE_DEVONXONA';

// === Units ===

export type UnitType =
  | 'DEPARTMENT'
  | 'DIRECTORATE'
  | 'DIVISION'
  | 'DEPARTMENT_SUB'
  | 'SECTION'
  | 'OTHER';

export type UnitStatus = 'ACTIVE' | 'ARCHIVED';

export interface Unit {
  uuid: string;
  nameUz: string;
  nameRu?: string;
  shortName?: string;
  code: string;
  type: UnitType;
  parentUuid: string | null;
  level: number;
  path: string;
  headEmployeeUuid?: string;
  deputyEmployeeUuid?: string;
  status: UnitStatus;
  description?: string;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  updatedBy: string;
}

// === Employees ===

export type EmploymentType = 'FULL_TIME' | 'PART_TIME' | 'CONTRACT' | 'INTERN';
export type EmployeeStatus =
  | 'DRAFT'
  | 'ACTIVE'
  | 'ON_LEAVE'
  | 'SUSPENDED'
  | 'TERMINATED';
export type Gender = 'M' | 'F';

/**
 * Certified extract of an HR order signed by the Director, plus the job
 * instruction document. Metadata only: the demo's mock backend never stores
 * file bytes (same convention as ERI certificates). Used for the hiring-order
 * extract ("buyruqdan ko'chirma"), the job instruction ("lavozim
 * yo'riqnomasi"), and the termination-order extract — all share this shape.
 */
export interface EmploymentOrderExtract {
  fileName: string;
  fileSize: number;
  mimeType: string;
  uploadedAt: string;
}

export interface Employee {
  uuid: string;
  userUuid: string;
  lastName: string;
  firstName: string;
  middleName?: string;
  fullNameGenerated: string;
  gender: Gender;
  birthDate?: string;
  pinfl: string;
  passportSeries?: string;
  workPhone?: string;
  internalExtension?: string;
  mobilePhone: string;
  corporateEmail: string;
  personalEmail?: string;
  primaryUnitUuid: string;
  positionId: string;
  employmentType: EmploymentType;
  hireDate: string;
  employmentOrderExtract?: EmploymentOrderExtract;
  /** "Lavozim yo'riqnomasi" — job-instruction document, required at creation. */
  positionInstruction?: EmploymentOrderExtract;
  terminationDate?: string;
  /** Certified extract of the termination order, required to terminate. */
  terminationOrderExtract?: EmploymentOrderExtract;
  status: EmployeeStatus;
  avatarUrl?: string;
  createdAt: string;
  updatedAt: string;
}

// === Assignments ===

export type AssignmentType = 'PRIMARY' | 'COMBINATION' | 'ACTING' | 'TEMPORARY';

export interface Assignment {
  uuid: string;
  employeeUuid: string;
  unitUuid: string;
  positionId: string;
  isPrimary: boolean;
  startDate: string;
  endDate?: string;
  workloadPercent: number;
  type: AssignmentType;
  reason?: string;
  createdAt: string;
}

// === Certificates (ERI) ===

export type CertStatus =
  | 'PENDING_APPROVAL'
  | 'ACTIVE'
  | 'EXPIRED'
  | 'REVOKED'
  | 'REJECTED';
export type CertType = 'SIGNING' | 'ENCRYPTION' | 'BOTH';
export type RevocationReason =
  | 'EXPIRED'
  | 'EMPLOYEE_TERMINATED'
  | 'COMPROMISED'
  | 'REPLACED'
  | 'MANUAL';

export interface Certificate {
  uuid: string;
  employeeUuid: string;
  serialNumber: string;
  thumbprint: string;
  subjectPinfl: string;
  subjectCommonName: string;
  subjectOrganization?: string;
  issuerName: string;
  validFrom: string;
  validTo: string;
  keyUsage: string[];
  certificateType: CertType;
  status: CertStatus;
  rejectionReason?: string;
  uploadedByUuid: string;
  approvedByUuid?: string;
  approvedAt?: string;
  revokedAt?: string;
  revocationReason?: RevocationReason;
  createdAt: string;
}

// === Users (auth) ===

export interface User {
  uuid: string;
  employeeUuid?: string;
  email: string;
  passwordHash: string;
  roles: Role[];
  mustChangePassword: boolean;
  passwordChangedAt?: string;
  createdAt: string;
}

// === Audit ===

export type AuditAction =
  | 'CREATE'
  | 'UPDATE'
  | 'DELETE'
  | 'ARCHIVE'
  | 'LOGIN'
  | 'LOGOUT'
  | 'PASSWORD_CHANGED'
  | 'UNIT_TRANSFER'
  | 'CERTIFICATE_UPLOADED'
  | 'CERTIFICATE_APPROVED'
  | 'CERTIFICATE_REJECTED'
  | 'CERTIFICATE_REVOKED'
  | 'PROFILE_CHANGE_REQUESTED'
  | 'PROFILE_CHANGE_APPROVED'
  | 'POV_SWITCHED'
  | 'DOCUMENT_CREATED'
  | 'DOCUMENT_SENT_FOR_REVIEW'
  | 'DOCUMENT_APPROVED'
  | 'DOCUMENT_REJECTED'
  | 'DOCUMENT_SIGNED'
  | 'DOCUMENT_CLOSED'
  | 'DOCUMENT_VIEWED'
  | 'DOCUMENT_EMAILED'
  | 'LETTER_REGISTERED'
  | 'LETTER_ROUTED'
  | 'LETTER_ASSIGNED'
  | 'LETTER_EXECUTED'
  | 'LETTER_ACCEPTED'
  | 'LETTER_SIGNED'
  | 'LETTER_DISPATCHED'
  | 'LETTER_CLOSED'
  | 'TASK_CREATED'
  | 'TASK_UPDATED'
  | 'TASK_STARTED'
  | 'TASK_CLARIFICATION_REQUESTED'
  | 'TASK_CLARIFICATION_ANSWERED'
  | 'TASK_SUBMITTED'
  | 'TASK_ACCEPTED'
  | 'TASK_RETURNED'
  | 'TASK_REJECTED'
  | 'CANCEL'
  | 'ATTENDANCE_CHECKED_IN'
  | 'ATTENDANCE_CHECKED_OUT'
  | 'ATTENDANCE_MANUAL_ENTRY'
  | 'TABEL_GENERATED'
  | 'TABEL_ENTRIES_UPDATED'
  | 'TABEL_SUBMITTED'
  | 'TABEL_HEAD_SIGNED'
  | 'TABEL_HEAD_REJECTED'
  | 'TABEL_HR_ACCEPTED'
  | 'TABEL_HR_REJECTED'
  | 'TABEL_REGISTRY_DISPATCHED'
  | 'COLLEGIAL_MEMBER_ADDED'
  | 'COLLEGIAL_MEMBER_REMOVED'
  | 'PROTOCOL_CREATED'
  | 'PROTOCOL_UPDATED'
  | 'PROTOCOL_SUBMITTED'
  | 'PROTOCOL_REVIEWER_APPROVED'
  | 'PROTOCOL_REVIEWER_REJECTED'
  | 'PROTOCOL_SENT_TO_MEMBERS'
  | 'PROTOCOL_MEMBER_SIGNED'
  | 'PROTOCOL_MEMBER_DECLINED'
  | 'PROTOCOL_SENT_TO_CHAIRMAN'
  | 'PROTOCOL_CHAIRMAN_APPROVED'
  | 'PROTOCOL_CHAIRMAN_REJECTED';

export type AuditResourceType =
  | 'unit'
  | 'employee'
  | 'assignment'
  | 'certificate'
  | 'user'
  | 'profile-request'
  | 'document'
  | 'letter'
  | 'task'
  | 'conference-room'
  | 'conference-booking'
  | 'office-network'
  | 'work-shift'
  | 'attendance'
  | 'tabel'
  | 'tabel-registry'
  | 'collegial-body'
  | 'protocol';

export interface AuditEntry {
  uuid: string;
  actorUuid: string;
  actorName: string;
  action: AuditAction;
  resourceType: AuditResourceType;
  resourceUuid: string;
  resourceLabel: string;
  changes?: Record<string, { from: unknown; to: unknown }>;
  context?: Record<string, unknown>;
  createdAt: string;
}

// === Profile change requests (employee self-service) ===

export interface ProfileChangeRequest {
  uuid: string;
  employeeUuid: string;
  fields: Record<string, { from: unknown; to: unknown }>;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  rejectionReason?: string;
  createdAt: string;
  reviewedAt?: string;
  reviewedByUuid?: string;
}

// === Positions (seeded catalogue, not user-created in the demo) ===

export interface Position {
  id: string;
  nameUz: string;
  allowedUnitTypes: UnitType[];
}

// === Notifications (milestone 2, master §15) ===

export type NotificationType =
  | 'DOC_REVIEW_REQUESTED'
  | 'DOC_DECIDED'
  | 'DOC_APPROVED'
  | 'DOC_REJECTED'
  | 'DOC_SIGN_REQUESTED'
  | 'DOC_SIGNED'
  | 'DOC_CLOSED'
  | 'LETTER_ROUTED'
  | 'LETTER_ASSIGNED'
  | 'LETTER_EXECUTED'
  | 'LETTER_ACCEPTED'
  | 'LETTER_SIGN_REQUESTED'
  | 'LETTER_DISPATCHED'
  | 'TASK_ASSIGNED'
  | 'TASK_CLARIFICATION_REQUESTED'
  | 'TASK_CLARIFICATION_ANSWERED'
  | 'TASK_SUBMITTED'
  | 'TASK_ACCEPTED'
  | 'TASK_RETURNED'
  | 'TASK_REJECTED';

// Named AppNotification because `Notification` collides with lib.dom's global type.
export interface AppNotification {
  uuid: string;
  recipientEmployeeUuid: string;
  type: NotificationType;
  /** Fully-qualified i18n key (`dashboard:notifications.title.*`) — body text is NEVER stored as a literal. */
  titleKey: string;
  /** Interpolation values: docNumber, letterNumber, actorName, … */
  params: Record<string, string>;
  resourceType: 'document' | 'letter' | 'task';
  resourceUuid: string;
  isRead: boolean;
  createdAt: string;
}

// === Documents (milestone 2, master §15 — BPMN 3.4 / BP-4) ===

export type DocumentSource = 'TEMPLATE' | 'UPLOAD';

// BP-4 canon: draft → in-review → (rejected → rework) → approved → signed | closed
// `CLOSED` = accepted without ERI ("Qabul qilish" branch 11.2 of BPMN 3.4).
// Archival is NOT a status — it's the `archivedAt` stamp (nightly-job simulation).
// Editing an APPROVED document (BP-4 "modification cancels approvals") is out of
// scope for the demo — only DRAFT and REJECTED documents are editable.
export type DocumentStatus =
  | 'DRAFT'
  | 'IN_REVIEW'
  | 'REJECTED'
  | 'APPROVED'
  | 'SIGNED'
  | 'CLOSED';

/** Display-only badge in the demo (TLH 4-BLOK). */
export type Confidentiality = 'ODDIY' | 'MAXFIY';

/**
 * Metadata-only file convention — identical shape to
 * `Employee.employmentOrderExtract`. No bytes stored. Shared by documents
 * (step 17) and letters (step 20) — keep free of domain-specific fields.
 */
export interface FileMeta {
  fileName: string;
  fileSize: number;
  mimeType: string;
  uploadedAt: string;
}

export interface TemplateField {
  /** Placeholder token inside `bodyTemplate`, e.g. "ASOS". */
  key: string;
  /** Fully-qualified i18n key for the field label (`dashboard:documents.fields.*`). */
  labelKey: string;
  /** 'employee' renders as a Combobox and resolves to the FIO at substitution time. */
  kind: 'text' | 'textarea' | 'date' | 'employee';
  required: boolean;
}

export type DocumentTemplateCode =
  | 'BUYRUQ'
  | 'XIZMAT_XATI'
  | 'MALUMOTNOMA'
  | 'ARIZA'
  | 'BILDIRISHNOMA';

export interface DocumentTemplate {
  uuid: string;
  code: DocumentTemplateCode;
  nameUz: string;
  descriptionUz: string;
  /** Uzbek body text with `{{PLACEHOLDER}}` tokens. */
  bodyTemplate: string;
  fields: TemplateField[];
}

export interface DocumentViewRecord {
  employeeUuid: string;
  viewedAt: string;
}

// Named DocumentEntity because `Document` collides with lib.dom's global type.
export interface DocumentEntity {
  uuid: string;
  /** Auto-numbered: 'HJ-2026/0001' (year hardcoded per master §17). */
  number: string;
  title: string;
  source: DocumentSource;
  /** source = TEMPLATE. */
  templateUuid?: string;
  /**
   * source = TEMPLATE — raw placeholder values keyed by `TemplateField.key`
   * (employee-kind fields hold uuids). Persisted so the DRAFT/REJECTED rework
   * loop can re-enter the wizard prefilled (BP-4 "edit + resubmit", step 19).
   */
  values?: Record<string, string>;
  /** source = TEMPLATE — placeholders resolved at creation. */
  renderedBody?: string;
  /** source = UPLOAD (metadata only). */
  fileMeta?: FileMeta;
  confidentiality: Confidentiality;
  /** Employee uuid (BPMN: hujjat yaratuvchi). */
  creatorUuid: string;
  /** "Kimga". */
  recipientUuid: string;
  /** "Kim imzolaydi" — undefined ⇒ recipient accepts without ERI → CLOSED. */
  signerUuid?: string;
  /** "Kelishuv varaqasi kerakmi?" */
  requiresApproval: boolean;
  status: DocumentStatus;
  /** Approval round; increments on resubmit after REJECTED. */
  round: number;
  /** §2.2 "who viewed" audit requirement — one record per employee. */
  viewedBy: DocumentViewRecord[];
  sentForReviewAt?: string;
  approvedAt?: string;
  signedAt?: string;
  closedAt?: string;
  /** Stamped when the simulated nightly job would have run; drives Arxiv grouping. */
  archivedAt?: string;
  /** Mock email-export log (§2.7). */
  emailedTo?: string[];
  createdAt: string;
  updatedAt: string;
}

export type ApprovalDecision =
  | 'PENDING'
  | 'APPROVED'
  | 'APPROVED_WITH_COMMENT'
  | 'REJECTED';

export interface ApprovalStep {
  uuid: string;
  documentUuid: string;
  /** Matches `DocumentEntity.round` when the step was created. */
  round: number;
  /** 1-based; the demo chain is strictly sequential. */
  order: number;
  employeeUuid: string;
  decision: ApprovalDecision;
  /** REQUIRED when decision = REJECTED (BP-4 failure-mode rule). */
  comment?: string;
  decidedAt?: string;
}

/** Shared by documents (step 17) and letters (step 20) — `resourceType` discriminates. */
export interface SignatureRecord {
  uuid: string;
  resourceType: 'document' | 'letter';
  resourceUuid: string;
  employeeUuid: string;
  /** Must be an ACTIVE certificate belonging to that employee. */
  certificateUuid: string;
  /** Cosmetic — mirrors the TLH's phpseclib stack line. */
  algorithm: 'RSA-PKCS7';
  /** Fake hex via crypto.getRandomValues (FakePfxParser convention). */
  signatureHex: string;
  signedAt: string;
}

// === Letters (milestone 2, step 20 — BPMN 3.3 / BP-3) ===

export type LetterDirection = 'INCOMING' | 'OUTGOING';

// BP-3 canon (extended 2026-06-12 per BPMN 3.3's explicit acceptance + signature gates):
// registered → routed → assigned → in-progress → executed → [on-signature →] responded → dispatched → closed
//                                       ↘ closed-without-response (comment-only execution, accepted)
// Demo semantics: an INCOMING letter terminates in CLOSED (response dispatched)
// or CLOSED_NO_RESPONSE (comment-only execution accepted); DISPATCHED is the
// terminal state of OUTGOING rows, created at dispatch time as the reply.
export type LetterStatus =
  | 'REGISTERED'
  | 'ROUTED'
  | 'ASSIGNED'
  | 'IN_PROGRESS'
  /** Executor submitted; awaiting unit-head acceptance. */
  | 'EXECUTED'
  /** Accepted; awaiting Rahbar ERI (only when requiresSignature). */
  | 'ON_SIGNATURE'
  /** Response ready for dispatch. */
  | 'RESPONDED'
  | 'DISPATCHED'
  | 'CLOSED'
  | 'CLOSED_NO_RESPONSE';

export type LetterChannel = 'POCHTA' | 'EMAIL' | 'KURYER' | 'QOGOZ';

export interface Letter {
  uuid: string;
  direction: LetterDirection;
  /** Auto-numbered: incoming 'K-2026/0001' · outgoing 'CH-2026/0001' (year hardcoded per master §17). */
  number: string;
  /** Sender (incoming) / addressee (outgoing). */
  externalOrg: string;
  subject: string;
  channel: LetterChannel;
  /** Scanned original (incoming) / dispatch package (outgoing). */
  fileMeta?: FileMeta;
  /** Incoming only. */
  receivedAt?: string;
  /** Ijro muddati — optional; drives the overdue badge. */
  deadline?: string;
  routedToUnitUuid?: string;
  assignedEmployeeUuid?: string;
  /** "Rahbar imzo talab etiladimi?" */
  requiresSignature: boolean;
  /** BPMN 7.1 path (comment-only execution). */
  executionComment?: string;
  /** BPMN 7.2 path (ready response file attached). */
  responseFileMeta?: FileMeta;
  /** BPMN 7.2 alt: response composed as an internal DocumentEntity. */
  responseDocumentUuid?: string;
  /** On OUTGOING replies — the incoming letter being answered. */
  linkedIncomingUuid?: string;
  status: LetterStatus;
  registeredByUuid: string;
  dispatchedAt?: string;
  closedAt?: string;
  createdAt: string;
  updatedAt: string;
}

// === Task delegation (milestone 3, BPMN 3.2 / BP-2) ===

export type TaskPriority = 'HIGH' | 'MEDIUM' | 'STANDARD';

// BP-2 canon: new → in-progress → under-review → done.
// REJECTED ("Closed-rejected", UC-09) is terminal; renders inside the Done
// column with a destructive badge. Clarification (BP-2 6.1/7) does NOT change
// status. `round` increments on each return → resubmit cycle.
export type TaskStatus =
  | 'NEW'
  | 'IN_PROGRESS'
  | 'UNDER_REVIEW'
  | 'DONE'
  | 'REJECTED';

export type TaskCommentKind =
  | 'CLARIFICATION_REQUEST'
  | 'CLARIFICATION_REPLY'
  | 'RETURN_FEEDBACK'
  | 'REJECT_REASON'
  | 'NOTE';

export interface TaskComment {
  uuid: string;
  authorUuid: string;
  kind: TaskCommentKind;
  body: string;
  createdAt: string;
}

export interface TaskDeliverable {
  summary: string;
  /** Metadata-only attachment (reuses the M2 FileMeta — no bytes stored). */
  file?: FileMeta;
  /** OR a reference to an existing DocumentEntity. */
  documentUuid?: string;
  submittedAt: string;
}

export interface TaskEntity {
  uuid: string;
  /** Auto-numbered 'TOP-2026/0001' (topshiriq; year hardcoded per master §17). */
  number: string;
  title: string;
  description: string;
  priority: TaskPriority;
  status: TaskStatus;
  /** Manager (Rahbar / Bo'lim boshlig'i) — employee uuid. */
  assignerUuid: string;
  /** Single subordinate — employee uuid; must be in the assigner's subtree. */
  assigneeUuid: string;
  deadline: string;
  /** Optional related document attached at creation. */
  attachedDocumentUuid?: string;
  /** OR a metadata-only file attached at creation. */
  attachedFile?: FileMeta;
  /** Set on first submit; replaceable while UNDER_REVIEW. */
  deliverable?: TaskDeliverable;
  /** Accept-with-note text (return/reject reasons live in `comments`). */
  reviewNote?: string;
  /** Embedded chronological clarification + feedback thread. */
  comments: TaskComment[];
  round: number;
  /** True if the deliverable was submitted after the deadline (UC-09 A2). */
  lateSubmission?: boolean;
  startedAt?: string;
  submittedAt?: string;
  acceptedAt?: string;
  rejectedAt?: string;
  createdAt: string;
  updatedAt: string;
}

// === Conference rooms (Tier 2, PLAN_conference-room.md) ===
// New module — no mock counterpart, so these mirror the real backend
// contract (`ConferenceRoomResource` / `ConferenceBookingResource`) directly.

export type ConferenceRoomStatus = 'ACTIVE' | 'ARCHIVED';

export interface ConferenceRoom {
  uuid: string;
  name: string;
  capacity: number;
  location?: string;
  status: ConferenceRoomStatus;
  createdAt: string;
  updatedAt: string;
}

export type ConferenceBookingStatus = 'BOOKED' | 'CANCELLED';

export interface ConferenceBooking {
  uuid: string;
  roomUuid: string;
  /** Acting employee uuid who made the booking. */
  bookedBy: string;
  purpose: string;
  /** `YYYY-MM-DD`. */
  date: string;
  /** `HH:mm`. */
  startTime: string;
  /** `HH:mm`. */
  endTime: string;
  status: ConferenceBookingStatus;
  cancelledBy?: string;
  cancelledAt?: string;
  createdAt: string;
  updatedAt: string;
}

// === Attendance / Tabel (PLAN_tabel-davomat.md) ===
// New module — no mock counterpart, so these mirror the real backend
// contract directly.

export type OfficeNetworkStatus = 'ACTIVE' | 'ARCHIVED';

export interface OfficeNetwork {
  uuid: string;
  name: string;
  cidr: string;
  unitUuid?: string;
  status: OfficeNetworkStatus;
}

export interface WorkShift {
  uuid: string;
  unitUuid?: string;
  /** `HH:mm`. */
  startTime: string;
  /** `HH:mm`. */
  endTime: string;
  lateGraceMin: number;
  earlyExitGraceMin: number;
}

export type AttendanceStatus =
  | 'OK'
  | 'LATE'
  | 'EARLY_EXIT'
  | 'ABSENT'
  | 'HOLIDAY_WORK'
  | 'AUTO_CLOSED'
  | 'MANUAL';

export type FaceStatus = 'SELF_CONFIRMED' | 'SKIPPED';

export type AttendanceSource = 'SELF_CHECKIN' | 'HR_MANUAL' | 'AUTO_CLOSE';

export interface AttendanceRecord {
  uuid: string;
  employeeUuid: string;
  /** `YYYY-MM-DD`. */
  workDate: string;
  checkInAt?: string;
  checkOutAt?: string;
  status: AttendanceStatus;
  lateMinutes?: number;
  earlyExitMinutes?: number;
  networkOk: boolean;
  /** BLOCKED(face-recognition) — self-reported only, never real biometrics. */
  faceStatus?: FaceStatus;
  source: AttendanceSource;
  note?: string;
  createdAt: string;
  updatedAt: string;
}

export type TabelStatus =
  | 'DRAFT'
  | 'SENT_TO_HEAD'
  | 'HEAD_REJECTED'
  | 'SENT_TO_HR'
  | 'HR_REJECTED'
  | 'HR_ACCEPTED';

export type TabelEntryStatus =
  | 'OK'
  | 'LATE'
  | 'EARLY_EXIT'
  | 'ABSENT'
  | 'HOLIDAY_WORK'
  | 'AUTO_CLOSED'
  | 'MANUAL'
  | 'VACATION'
  | 'SICK_LEAVE'
  | 'BUSINESS_TRIP'
  | 'DAY_OFF';

export interface TabelEntry {
  uuid: string;
  tabelUuid: string;
  employeeUuid: string;
  /** `YYYY-MM-DD`. */
  workDate: string;
  status: TabelEntryStatus;
  note?: string;
}

export interface Tabel {
  uuid: string;
  unitUuid: string;
  /** `YYYY-MM`. */
  period: string;
  status: TabelStatus;
  createdBy: string;
  submittedAt?: string;
  headSignedAt?: string;
  headNote?: string;
  hrAcceptedAt?: string;
  hrNote?: string;
  /** Only present when the `entries` relation was eager-loaded — `getTabel`
   *  includes them; `listTabels` and the decision endpoints do not. */
  entries?: TabelEntry[];
  createdAt: string;
  updatedAt: string;
}

export interface TabelRegistryUnitRow {
  unitUuid: string;
  unitNameUz: string;
  tabelUuid: string | null;
  status: TabelStatus | null;
}

export interface TabelRegistry {
  period: string;
  dispatched: boolean;
  dispatchedAt: string | null;
  units: TabelRegistryUnitRow[];
}

// === Kollegial organ / Bayonnoma (PLAN_kollegial-organ.md) ===
// New module — no mock counterpart, these mirror the real backend contract
// (`CollegialBodyResource`/`ProtocolResource`/`ProtocolReviewerResource`/
// `ProtocolParticipantResource`) field-for-field.

export type CollegialBodyStatus = 'ACTIVE' | 'ARCHIVED';

export interface CollegialBody {
  uuid: string;
  name: string;
  chairmanEmployeeUuid: string;
  secretaryEmployeeUuid: string;
  quorumMin: number;
  status: CollegialBodyStatus;
  /** Only present when the `members` relation was eager-loaded — always
   *  true for `listCollegialBodies`/create/update/addMember/removeMember. */
  memberEmployeeUuids?: string[];
  createdBy: string;
  updatedBy: string;
  createdAt: string;
  updatedAt: string;
}

export type ProtocolStatus =
  | 'DRAFT'
  | 'SENT_FOR_REVIEW'
  | 'REVIEW_REJECTED'
  | 'SENT_TO_MEMBERS'
  | 'MEMBERS_REJECTED'
  | 'SENT_TO_CHAIRMAN'
  | 'CHAIRMAN_REJECTED'
  | 'APPROVED';

export type ProtocolReviewerDecision = 'PENDING' | 'APPROVED' | 'REJECTED';

export interface ProtocolReviewer {
  uuid: string;
  protocolUuid: string;
  employeeUuid: string;
  decision: ProtocolReviewerDecision;
  note?: string;
  decidedAt?: string;
}

export type ProtocolParticipantDecision = 'PENDING' | 'SIGNED' | 'DECLINED';

export interface ProtocolParticipant {
  uuid: string;
  protocolUuid: string;
  employeeUuid: string;
  decision: ProtocolParticipantDecision;
  note?: string;
  decidedAt?: string;
}

export interface Protocol {
  uuid: string;
  number: string;
  collegialBodyUuid: string;
  /** `YYYY-MM-DD`. */
  protocolDate: string;
  templateKey: string;
  agenda: string;
  status: ProtocolStatus;
  reviewNote?: string;
  chairmanNote?: string;
  createdBy: string;
  submittedAt?: string;
  membersCompletedAt?: string;
  chairmanSignedAt?: string;
  finalizedAt?: string;
  /** Only present when the relations were eager-loaded — `getProtocol` and
   *  every mutation response include them; `listProtocols` does not. */
  reviewers?: ProtocolReviewer[];
  participants?: ProtocolParticipant[];
  createdAt: string;
  updatedAt: string;
}
