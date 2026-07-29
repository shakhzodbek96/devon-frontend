import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';

import ResponsiveDialog from '@/components/common/ResponsiveDialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { MockNetworkError, rejectCertificate } from '@/lib/data/certificates';
import { useAuthStore } from '@/stores/useAuthStore';
import type { Certificate, Employee } from '@/types/domain';

const MIN_REASON_LENGTH = 5;

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  cert: Certificate;
  employee?: Employee;
  onDone: () => void;
}

export default function RejectDialog({ open, onOpenChange, cert, employee, onDone }: Props) {
  const { t } = useTranslation(['dashboard', 'common']);
  const actor = useAuthStore((s) => s.user?.uuid ?? '');
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // Reset on close so a discarded draft doesn't leak.
  useEffect(() => {
    if (!open) {
      setReason('');
      setError(null);
      setBusy(false);
    }
  }, [open]);

  async function confirm() {
    const trimmed = reason.trim();
    if (trimmed.length < MIN_REASON_LENGTH) {
      setError(t('dashboard:certificates.reject.reason-required'));
      return;
    }
    try {
      setBusy(true);
      await rejectCertificate(cert.uuid, trimmed, actor);
      toast.success(t('dashboard:certificates.toast.rejected'));
      onOpenChange(false);
      onDone();
    } catch (err) {
      toast.error(
        err instanceof MockNetworkError ? t('common:errors.network') : t('common:errors.unknown'),
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <ResponsiveDialog
      open={open}
      onOpenChange={onOpenChange}
      title={t('dashboard:certificates.reject.title')}
      description={t('dashboard:certificates.reject.body', {
        name: employee?.fullNameGenerated ?? cert.subjectCommonName,
      })}
      footer={
        <div className="flex w-full flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={busy}>
            {t('common:actions.cancel')}
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={confirm}
            disabled={busy}
          >
            {t('dashboard:certificates.reject.confirm')}
          </Button>
        </div>
      }
    >
      <div className="space-y-2">
        <Label htmlFor="reject-reason">
          {t('dashboard:certificates.reject.reason-label')}{' '}
          <span className="text-destructive">*</span>
        </Label>
        <Textarea
          id="reject-reason"
          value={reason}
          onChange={(e) => {
            setReason(e.target.value);
            if (error) setError(null);
          }}
          placeholder={t('dashboard:certificates.reject.reason-placeholder')}
          rows={4}
        />
        {error && <p className="text-xs text-destructive">{error}</p>}
      </div>
    </ResponsiveDialog>
  );
}
