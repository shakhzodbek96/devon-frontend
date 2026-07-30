// Shared status → (badge variant, i18n key, calendar color) lookup for the
// attendance/tabel module. `AttendanceStatus` and `TabelEntryStatus` share
// most codes (tabel entries add `DAY_OFF`), so one table covers both.

import type { AttendanceStatus, TabelEntryStatus } from '@/types/domain';

export type AnyDayStatus = AttendanceStatus | TabelEntryStatus;

export const DAY_STATUS_OPTIONS: TabelEntryStatus[] = [
  'OK',
  'LATE',
  'EARLY_EXIT',
  'ABSENT',
  'HOLIDAY_WORK',
  'AUTO_CLOSED',
  'MANUAL',
  'DAY_OFF',
];

interface StatusMeta {
  labelKey: string;
  badgeVariant: 'default' | 'secondary' | 'destructive' | 'outline';
  /** Utility classes for the calendar-grid cell background. */
  cellClass: string;
}

const META: Record<AnyDayStatus, StatusMeta> = {
  OK: {
    labelKey: 'dashboard:attendance.status.OK',
    badgeVariant: 'default',
    cellClass: 'bg-primary/15 text-primary',
  },
  LATE: {
    labelKey: 'dashboard:attendance.status.LATE',
    badgeVariant: 'secondary',
    cellClass: 'bg-warning-soft text-warning-fg',
  },
  EARLY_EXIT: {
    labelKey: 'dashboard:attendance.status.EARLY_EXIT',
    badgeVariant: 'secondary',
    cellClass: 'bg-warning-soft text-warning-fg',
  },
  ABSENT: {
    labelKey: 'dashboard:attendance.status.ABSENT',
    badgeVariant: 'destructive',
    cellClass: 'bg-destructive/10 text-destructive',
  },
  HOLIDAY_WORK: {
    labelKey: 'dashboard:attendance.status.HOLIDAY_WORK',
    badgeVariant: 'secondary',
    cellClass: 'bg-brand-soft text-primary',
  },
  AUTO_CLOSED: {
    labelKey: 'dashboard:attendance.status.AUTO_CLOSED',
    badgeVariant: 'outline',
    cellClass: 'bg-surface-2 text-muted-foreground',
  },
  MANUAL: {
    labelKey: 'dashboard:attendance.status.MANUAL',
    badgeVariant: 'outline',
    cellClass: 'bg-surface-2 text-body',
  },
  DAY_OFF: {
    labelKey: 'dashboard:attendance.status.DAY_OFF',
    badgeVariant: 'outline',
    cellClass: 'bg-surface-2 text-muted-foreground',
  },
};

export function statusMeta(status: AnyDayStatus): StatusMeta {
  return META[status];
}
