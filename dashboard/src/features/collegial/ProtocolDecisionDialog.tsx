import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';

import ResponsiveDialog from '@/components/common/ResponsiveDialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';

import { CollegialNetworkError, CollegialValidationError } from '@/lib/data/protocols';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  /** Note is required — every rejection station on this module requires one (§3). */
  onReject: (note: string) => Promise<unknown>;
  onDone: () => void;
}

/**
 * Shared "reject with a note" dialog for the reviewer/participant/chairman
 * rejection stations (PLAN_kollegial-organ.md §2 simplification #1 — every
 * station bounces the protocol back to an editable state the same way).
 */
export default function ProtocolDecisionDialog({
  open,
  onOpenChange,
  title,
  description,
  onReject,
  onDone,
}: Props) {
  const { t } = useTranslation(['dashboard', 'common']);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit() {
    if (!note.trim()) return;
    setBusy(true);
    try {
      await onReject(note.trim());
      onOpenChange(false);
      setNote('');
      onDone();
    } catch (err) {
      if (err instanceof CollegialValidationError) toast.error(t(`dashboard:collegial.errors.${err.code}`));
      else if (err instanceof CollegialNetworkError) toast.error(t('common:errors.network'));
      else toast.error(t('common:errors.unknown'));
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
      description={description}
      footer={
        <>
          <Button variant="outline" disabled={busy} onClick={() => onOpenChange(false)}>
            {t('common:actions.cancel')}
          </Button>
          <Button variant="destructive" disabled={busy || !note.trim()} onClick={() => void submit()}>
            {t('common:actions.reject')}
          </Button>
        </>
      }
    >
      <Textarea
        value={note}
        onChange={(e) => setNote(e.target.value)}
        rows={3}
        placeholder={t('dashboard:collegial.protocols.detail.note-placeholder')}
      />
    </ResponsiveDialog>
  );
}
