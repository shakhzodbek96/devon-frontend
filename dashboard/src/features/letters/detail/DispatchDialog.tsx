import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FileText } from 'lucide-react';
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
import { formatBytes } from '@/lib/format';
import { dispatchLetter } from '@/lib/data/letters';
import type { Letter, LetterChannel } from '@/types/domain';

import { toastLetterError } from './letterErrors';

const CHANNELS: LetterChannel[] = ['POCHTA', 'EMAIL', 'KURYER', 'QOGOZ'];

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  letter: Letter;
  /** Acting employee (the Devonxona persona) — policy re-validates. */
  actorUuid: string;
  onDone: () => void;
}

/**
 * BPMN 3.3 node 10 — Devonxona dispatches the reply. The backend closes this
 * incoming letter and mints the outgoing CH-row in one step; the success toast
 * carries the assigned number. Only the channel is collected — the backend's
 * DispatchLetterInput persists nothing else, so no inert note field is shown.
 */
export default function DispatchDialog({ open, onOpenChange, letter, actorUuid, onDone }: Props) {
  const { t } = useTranslation(['dashboard', 'common']);
  const [channel, setChannel] = useState<LetterChannel>(letter.channel);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    setChannel(letter.channel);
    setBusy(false);
  }, [open, letter.channel]);

  async function submit() {
    setBusy(true);
    try {
      const { outgoing } = await dispatchLetter(letter.uuid, { channel }, actorUuid);
      toast.success(t('dashboard:letters.detail.dispatch.success', { number: outgoing.number }));
      onOpenChange(false);
      onDone();
    } catch (err) {
      toastLetterError(t, err);
    } finally {
      setBusy(false);
    }
  }

  return (
    <ResponsiveDialog
      open={open}
      onOpenChange={onOpenChange}
      title={t('dashboard:letters.detail.dispatch.title')}
      description={t('dashboard:letters.detail.dispatch.description')}
      footer={
        <div className="flex w-full flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={busy}>
            {t('common:actions.cancel')}
          </Button>
          <Button type="button" onClick={submit} disabled={busy}>
            {t('dashboard:letters.detail.dispatch.cta')}
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        <dl className="space-y-2.5 rounded-lg border border-line bg-surface-2/30 p-3 text-sm">
          <div className="flex items-baseline justify-between gap-3">
            <dt className="shrink-0 text-xs text-muted-foreground">
              {t('dashboard:letters.detail.dispatch.outgoing-number')}
            </dt>
            <dd className="text-right font-medium text-ink">
              {t('dashboard:letters.detail.dispatch.outgoing-preview')}
            </dd>
          </div>
          <div className="flex items-baseline justify-between gap-3">
            <dt className="shrink-0 text-xs text-muted-foreground">
              {t('dashboard:letters.detail.dispatch.addressee')}
            </dt>
            <dd className="min-w-0 text-right font-medium break-words text-ink">
              {letter.externalOrg}
            </dd>
          </div>
        </dl>

        {letter.responseFileMeta && (
          <div className="flex items-center gap-3 rounded-lg border border-line bg-surface px-3 py-2.5">
            <FileText className="h-4 w-4 shrink-0 text-primary" />
            <span className="min-w-0 flex-1 truncate text-sm text-ink">
              {letter.responseFileMeta.fileName}{' '}
              <span className="text-muted-foreground">
                ({formatBytes(letter.responseFileMeta.fileSize)})
              </span>
            </span>
          </div>
        )}

        <div className="space-y-2">
          <Label>{t('dashboard:letters.detail.dispatch.field-channel')}</Label>
          <Select value={channel} onValueChange={(v) => setChannel(v as LetterChannel)}>
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {CHANNELS.map((c) => (
                <SelectItem key={c} value={c}>
                  {t(`dashboard:letters.channels.${c}`)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
    </ResponsiveDialog>
  );
}
