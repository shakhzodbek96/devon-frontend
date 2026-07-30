import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { CheckCircle2, ScanFace } from 'lucide-react';

import ResponsiveDialog from '@/components/common/ResponsiveDialog';
import { Button } from '@/components/ui/button';

import { checkIn, checkOut, AttendanceNetworkError, AttendanceValidationError } from '@/lib/data/attendance';
import type { AttendanceRecord } from '@/types/domain';

import { FakeFaceVerifier } from './FakeFaceVerifier';

type Phase = 'ready' | 'scanning' | 'done';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: 'in' | 'out';
  onDone: (record: AttendanceRecord) => void;
}

/**
 * Simplified Face ID ceremony (PLAN_tabel-davomat.md §0 — BLOCKED(face-
 * recognition)): no real camera, just a ~1.5s "scanning" animation
 * (`FakeFaceVerifier`, same theatre as the ERI `SignDialog`), then the real
 * check-in/check-out mutation fires. The frontend never sends a face
 * parameter — the server records `faceStatus = 'SELF_CONFIRMED'` on its own.
 */
export default function FaceCheckDialog({ open, onOpenChange, mode, onDone }: Props) {
  const { t } = useTranslation(['dashboard', 'common']);
  const [phase, setPhase] = useState<Phase>('ready');
  const [record, setRecord] = useState<AttendanceRecord | null>(null);

  function reset() {
    setPhase('ready');
    setRecord(null);
  }

  async function start() {
    setPhase('scanning');
    try {
      await FakeFaceVerifier.verify();
      const result = mode === 'in' ? await checkIn() : await checkOut();
      setRecord(result);
      setPhase('done');
    } catch (err) {
      setPhase('ready');
      if (err instanceof AttendanceValidationError) {
        toast.error(t(`dashboard:attendance.errors.${err.code}`));
        onOpenChange(false);
        reset();
      } else if (err instanceof AttendanceNetworkError) {
        toast.error(t('common:errors.network'));
      } else {
        toast.error(t('common:errors.unknown'));
      }
    }
  }

  function finish() {
    if (record) onDone(record);
    onOpenChange(false);
    reset();
  }

  return (
    <ResponsiveDialog
      open={open}
      onOpenChange={(next) => {
        if (phase === 'scanning') return;
        if (!next && phase === 'done') {
          finish();
          return;
        }
        onOpenChange(next);
        if (!next) reset();
      }}
      title={
        mode === 'in'
          ? t('dashboard:attendance.faceCheck.title-in')
          : t('dashboard:attendance.faceCheck.title-out')
      }
      description={phase === 'ready' ? t('dashboard:attendance.faceCheck.description') : undefined}
      footer={
        phase === 'ready' ? (
          <>
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              {t('common:actions.cancel')}
            </Button>
            <Button onClick={() => void start()}>
              <ScanFace className="mr-2 h-4 w-4" />
              {t('dashboard:attendance.faceCheck.cta')}
            </Button>
          </>
        ) : phase === 'done' ? (
          <Button onClick={finish}>{t('common:actions.close')}</Button>
        ) : undefined
      }
    >
      {phase === 'scanning' ? (
        <div className="flex flex-col items-center gap-4 py-10 text-center">
          <ScanFace className="h-12 w-12 animate-pulse text-primary" aria-hidden />
          <p className="text-sm font-medium text-ink">
            {t('dashboard:attendance.faceCheck.scanning')}
          </p>
          <p className="text-xs text-muted-foreground">
            {t('dashboard:attendance.faceCheck.scanning-hint')}
          </p>
        </div>
      ) : phase === 'done' ? (
        <div className="flex flex-col items-center gap-3 py-8 text-center">
          <CheckCircle2 className="h-12 w-12 text-primary" aria-hidden />
          <p className="text-sm font-semibold text-ink">
            {mode === 'in'
              ? t('dashboard:attendance.faceCheck.success-in')
              : t('dashboard:attendance.faceCheck.success-out')}
          </p>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-3 py-6 text-center">
          <ScanFace className="h-16 w-16 text-muted-foreground" aria-hidden />
          <p className="text-xs text-muted-foreground">
            {t('dashboard:attendance.faceCheck.hint')}
          </p>
        </div>
      )}
    </ResponsiveDialog>
  );
}
