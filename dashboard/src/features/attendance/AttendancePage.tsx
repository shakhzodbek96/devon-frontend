import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ChevronLeft, ChevronRight, LogIn, LogOut } from 'lucide-react';
import { toast } from 'sonner';

import LoadingState from '@/components/common/LoadingState';
import PageHeader from '@/components/common/PageHeader';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

import { myAttendance, AttendanceNetworkError } from '@/lib/data/attendance';
import { formatDateTime } from '@/i18n/uz-locale';
import type { AttendanceRecord } from '@/types/domain';

import FaceCheckDialog from './FaceCheckDialog';
import { statusMeta } from './statusMeta';

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

function currentMonth(): string {
  return new Date().toISOString().slice(0, 7);
}

function daysInMonth(month: string): number {
  const [y, m] = month.split('-').map(Number);
  return new Date(y!, m!, 0).getDate();
}

/** Monday=0..Sunday=6 offset of the 1st of the month, for the calendar grid's leading blanks. */
function leadingBlankCount(month: string): number {
  const [y, m] = month.split('-').map(Number);
  const dow = new Date(y!, m! - 1, 1).getDay(); // 0=Sun..6=Sat
  return (dow + 6) % 7; // shift to Mon=0
}

const WEEKDAY_KEYS = [
  'dashboard:attendance.weekday.mon',
  'dashboard:attendance.weekday.tue',
  'dashboard:attendance.weekday.wed',
  'dashboard:attendance.weekday.thu',
  'dashboard:attendance.weekday.fri',
  'dashboard:attendance.weekday.sat',
  'dashboard:attendance.weekday.sun',
];

export default function AttendancePage() {
  const { t } = useTranslation(['dashboard', 'common']);
  const [month, setMonth] = useState(currentMonth());
  const [records, setRecords] = useState<AttendanceRecord[] | null>(null);
  const [faceMode, setFaceMode] = useState<'in' | 'out' | null>(null);

  const reload = useCallback(async () => {
    try {
      setRecords(await myAttendance(month));
    } catch (err) {
      if (err instanceof AttendanceNetworkError) toast.error(t('common:errors.network'));
      else toast.error(t('common:errors.unknown'));
    }
  }, [month, t]);

  useEffect(() => {
    setRecords(null); // eslint-disable-line react-hooks/set-state-in-effect
    void reload();
  }, [reload]);

  const today = todayIso();
  const todayRecord = records?.find((r) => r.workDate === today) ?? null;

  const dayState: 'not-started' | 'checked-in' | 'closed' = !todayRecord?.checkInAt
    ? 'not-started'
    : !todayRecord.checkOutAt
      ? 'checked-in'
      : 'closed';

  const recordsByDate = useMemo(() => {
    const map = new Map<string, AttendanceRecord>();
    for (const r of records ?? []) map.set(r.workDate, r);
    return map;
  }, [records]);

  const totalDays = daysInMonth(month);
  const leadingBlanks = leadingBlankCount(month);
  const cells: (number | null)[] = [
    ...Array.from({ length: leadingBlanks }, () => null),
    ...Array.from({ length: totalDays }, (_, i) => i + 1),
  ];

  function shiftMonth(delta: number) {
    const [y, m] = month.split('-').map(Number);
    const d = new Date(y!, m! - 1 + delta, 1);
    setMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
  }

  return (
    <div className="space-y-6 md:space-y-8">
      <PageHeader
        title={t('dashboard:attendance.page-title')}
        subtitle={t('dashboard:attendance.page-subtitle')}
      />

      <Card>
        <CardHeader>
          <CardTitle>{t('dashboard:attendance.today.title')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {!records && <LoadingState rows={1} />}
          {records && (
            <>
              <div className="flex flex-wrap items-center gap-3">
                <Badge variant={dayState === 'closed' ? 'secondary' : 'outline'}>
                  {dayState === 'not-started' && t('dashboard:attendance.today.not-started')}
                  {dayState === 'checked-in' && t('dashboard:attendance.today.checked-in')}
                  {dayState === 'closed' && t('dashboard:attendance.today.closed')}
                </Badge>
                {todayRecord?.checkInAt && (
                  <span className="text-xs text-muted-foreground">
                    {t('dashboard:attendance.today.check-in-at', {
                      time: formatDateTime(todayRecord.checkInAt),
                    })}
                  </span>
                )}
                {todayRecord?.checkOutAt && (
                  <span className="text-xs text-muted-foreground">
                    {t('dashboard:attendance.today.check-out-at', {
                      time: formatDateTime(todayRecord.checkOutAt),
                    })}
                  </span>
                )}
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  disabled={dayState !== 'not-started'}
                  onClick={() => setFaceMode('in')}
                >
                  <LogIn className="mr-2 h-4 w-4" />
                  {t('dashboard:attendance.today.check-in')}
                </Button>
                <Button
                  variant="outline"
                  disabled={dayState !== 'checked-in'}
                  onClick={() => setFaceMode('out')}
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  {t('dashboard:attendance.today.check-out')}
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-2">
          <CardTitle>{t('dashboard:attendance.history.title')}</CardTitle>
          <div className="flex items-center gap-1">
            <Button size="icon" variant="ghost" onClick={() => shiftMonth(-1)}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="min-w-24 text-center text-sm font-medium text-ink">{month}</span>
            <Button size="icon" variant="ghost" onClick={() => shiftMonth(1)}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {!records && <LoadingState rows={4} />}
          {records && (
            <div className="space-y-3">
              <div className="grid grid-cols-7 gap-1.5">
                {WEEKDAY_KEYS.map((k) => (
                  <div
                    key={k}
                    className="text-center text-[11px] font-semibold uppercase tracking-wide text-muted-foreground"
                  >
                    {t(k)}
                  </div>
                ))}
                {cells.map((day, i) => {
                  if (day === null) return <div key={`blank-${i}`} />;
                  const dateStr = `${month}-${String(day).padStart(2, '0')}`;
                  const rec = recordsByDate.get(dateStr);
                  const meta = rec ? statusMeta(rec.status) : null;
                  return (
                    <div
                      key={dateStr}
                      title={rec ? t(meta!.labelKey) : undefined}
                      className={`flex h-14 flex-col items-center justify-center rounded-md border border-line text-xs ${
                        meta ? meta.cellClass : 'bg-surface text-muted-foreground'
                      } ${dateStr === today ? 'ring-2 ring-primary' : ''}`}
                    >
                      <span className="font-semibold">{day}</span>
                      {meta && <span className="mt-0.5 truncate px-1 text-[10px]">{t(meta.labelKey)}</span>}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <FaceCheckDialog
        open={faceMode !== null}
        onOpenChange={(open) => {
          if (!open) setFaceMode(null);
        }}
        mode={faceMode ?? 'in'}
        onDone={() => {
          toast.success(
            faceMode === 'in'
              ? t('dashboard:attendance.today.toast.checked-in')
              : t('dashboard:attendance.today.toast.checked-out'),
          );
          void reload();
        }}
      />
    </div>
  );
}
