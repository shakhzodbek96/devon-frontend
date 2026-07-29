import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { Loader2, Send } from 'lucide-react';

import ResponsiveDialog from '@/components/common/ResponsiveDialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { DocumentValidationError, emailDocument, MockNetworkError } from '@/lib/data/documents';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  documentUuid: string;
  actorUuid: string;
  onDone: () => void;
}

/** §2.7 mock email export — appends to the document's emailedTo log, no real mail. */
export default function EmailDialog({
  open,
  onOpenChange,
  documentUuid,
  actorUuid,
  onDone,
}: Props) {
  const { t } = useTranslation(['dashboard', 'common']);
  const [email, setEmail] = useState('');
  const [emailError, setEmailError] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (open) {
      setEmail('');
      setEmailError(false);
    }
  }, [open]);

  async function submit() {
    if (!EMAIL_PATTERN.test(email.trim())) {
      setEmailError(true);
      return;
    }
    setBusy(true);
    try {
      await emailDocument(documentUuid, actorUuid, email.trim());
      toast.success(t('dashboard:documents.detail.toast.emailed'));
      onOpenChange(false);
      onDone();
    } catch (err) {
      if (err instanceof DocumentValidationError) {
        toast.error(t(`dashboard:documents.errors.${err.code}`));
      } else if (err instanceof MockNetworkError) {
        toast.error(t('common:errors.network'));
      } else {
        toast.error(t('common:errors.unknown'));
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <ResponsiveDialog
      open={open}
      onOpenChange={onOpenChange}
      title={t('dashboard:documents.detail.email.title')}
      description={t('dashboard:documents.detail.email.description')}
      footer={
        <>
          <Button variant="outline" disabled={busy} onClick={() => onOpenChange(false)}>
            {t('common:actions.cancel')}
          </Button>
          <Button disabled={busy} onClick={submit}>
            {busy ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Send className="mr-2 h-4 w-4" />
            )}
            {t('dashboard:documents.detail.email.cta')}
          </Button>
        </>
      }
    >
      <div className="space-y-2">
        <Label htmlFor="email-to">{t('dashboard:documents.detail.email.label')}</Label>
        <Input
          id="email-to"
          type="email"
          autoComplete="off"
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
            setEmailError(false);
          }}
          placeholder="nom@tashkilot.uz"
        />
        {emailError && (
          <p className="text-xs text-destructive">
            {t('dashboard:documents.detail.email.invalid')}
          </p>
        )}
      </div>
    </ResponsiveDialog>
  );
}
