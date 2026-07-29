import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';

import ResponsiveDialog from '@/components/common/ResponsiveDialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { MockNetworkError, revokeCertificate } from '@/lib/data/certificates';
import { useAuthStore } from '@/stores/useAuthStore';
import type { Certificate, Employee, RevocationReason } from '@/types/domain';

// EMPLOYEE_TERMINATED is set automatically by the terminateEmployee cascade
// in the mock-backend — we never expose it as a manual choice here.
const REVOCATION_REASONS: Exclude<RevocationReason, 'EMPLOYEE_TERMINATED'>[] = [
  'EXPIRED',
  'COMPROMISED',
  'REPLACED',
  'MANUAL',
];

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  cert: Certificate;
  employee?: Employee;
  onDone: () => void;
}

export default function RevokeDialog({ open, onOpenChange, cert, employee, onDone }: Props) {
  const { t } = useTranslation(['dashboard', 'common']);
  const actor = useAuthStore((s) => s.user?.uuid ?? '');
  const [reason, setReason] = useState<RevocationReason | ''>('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) {
      setReason('');
      setBusy(false);
    }
  }, [open]);

  async function confirm() {
    if (!reason) return;
    try {
      setBusy(true);
      await revokeCertificate(cert.uuid, reason, actor);
      toast.success(t('dashboard:certificates.toast.revoked'));
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
      title={t('dashboard:certificates.revoke.title')}
      description={t('dashboard:certificates.revoke.body')}
      footer={
        <div className="flex w-full flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={busy}>
            {t('common:actions.cancel')}
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={confirm}
            disabled={busy || !reason}
          >
            {t('dashboard:certificates.revoke.confirm')}
          </Button>
        </div>
      }
    >
      <div className="space-y-3">
        <p className="text-sm text-body">
          <span className="text-muted-foreground">
            {t('dashboard:certificates.details.owner')}:
          </span>{' '}
          <span className="font-medium text-ink">
            {employee?.fullNameGenerated ?? cert.subjectCommonName}
          </span>
        </p>
        <div className="space-y-2">
          <Label htmlFor="revoke-reason">
            {t('dashboard:certificates.revoke.reason-label')}{' '}
            <span className="text-destructive">*</span>
          </Label>
          <Select value={reason} onValueChange={(v) => setReason(v as RevocationReason)}>
            <SelectTrigger id="revoke-reason">
              <SelectValue placeholder={t('dashboard:certificates.revoke.reason-placeholder')} />
            </SelectTrigger>
            <SelectContent>
              {REVOCATION_REASONS.map((r) => (
                <SelectItem key={r} value={r}>
                  {t(`dashboard:certificates.revoke.reasons.${r}`)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
    </ResponsiveDialog>
  );
}
