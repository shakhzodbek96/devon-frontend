import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { approveCertificate, MockNetworkError } from '@/lib/data/certificates';
import { useAuthStore } from '@/stores/useAuthStore';
import type { Certificate, Employee } from '@/types/domain';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  cert: Certificate;
  employee?: Employee;
  onDone: () => void;
}

export default function ApproveDialog({ open, onOpenChange, cert, employee, onDone }: Props) {
  const { t } = useTranslation(['dashboard', 'common']);
  const actor = useAuthStore((s) => s.user?.uuid ?? '');
  const [busy, setBusy] = useState(false);

  async function confirm() {
    try {
      setBusy(true);
      await approveCertificate(cert.uuid, actor);
      toast.success(t('dashboard:certificates.toast.approved'));
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
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t('dashboard:certificates.approve.title')}</AlertDialogTitle>
          <AlertDialogDescription>
            {t('dashboard:certificates.approve.body', {
              name: employee?.fullNameGenerated ?? cert.subjectCommonName,
            })}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={busy}>{t('common:actions.cancel')}</AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => {
              e.preventDefault();
              confirm();
            }}
            disabled={busy}
          >
            {t('dashboard:certificates.approve.confirm')}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
