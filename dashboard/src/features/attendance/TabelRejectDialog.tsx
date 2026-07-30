import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';

import ResponsiveDialog from '@/components/common/ResponsiveDialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';

import { TabelNetworkError, TabelValidationError } from '@/lib/data/tabels';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  /** Bound rejection mutation (`headDecideTabel`/`hrDecideTabel` with `approve: false`). */
  onReject: (note: string) => Promise<unknown>;
  onDone: () => void;
}

/** Shared "reject with a note" dialog for both the unit-head and HR tabel decisions. */
export default function TabelRejectDialog({ open, onOpenChange, title, onReject, onDone }: Props) {
  const { t } = useTranslation(['dashboard', 'common']);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit() {
    setBusy(true);
    try {
      await onReject(note.trim());
      onOpenChange(false);
      setNote('');
      onDone();
    } catch (err) {
      if (err instanceof TabelValidationError) {
        toast.error(t(`dashboard:tabels.errors.${err.code}`));
      } else if (err instanceof TabelNetworkError) {
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
      onOpenChange={(next) => {
        onOpenChange(next);
        if (!next) setNote('');
      }}
      title={title}
      description={t('dashboard:tabels.reject.description')}
      footer={
        <>
          <Button variant="outline" disabled={busy} onClick={() => onOpenChange(false)}>
            {t('common:actions.cancel')}
          </Button>
          <Button variant="destructive" disabled={busy} onClick={() => void submit()}>
            {t('dashboard:tabels.reject.cta')}
          </Button>
        </>
      }
    >
      <Textarea
        value={note}
        onChange={(e) => setNote(e.target.value)}
        rows={3}
        placeholder={t('dashboard:tabels.reject.note-placeholder')}
      />
    </ResponsiveDialog>
  );
}
