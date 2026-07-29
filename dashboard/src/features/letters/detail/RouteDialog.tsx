import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';

import Combobox, { type ComboboxOption } from '@/components/common/Combobox';
import ResponsiveDialog from '@/components/common/ResponsiveDialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { routeLetter } from '@/lib/data/letters';
import { listUnits } from '@/lib/data/units';

import { toastLetterError } from './letterErrors';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  letterUuid: string;
  /** Acting employee (the Rahbar persona) — policy re-validates. */
  actorUuid: string;
  onDone: () => void;
}

/** BPMN 3.3 node 2 — the Rahbar routes a REGISTERED letter to a unit. */
export default function RouteDialog({ open, onOpenChange, letterUuid, actorUuid, onDone }: Props) {
  const { t } = useTranslation(['dashboard', 'common']);
  const [options, setOptions] = useState<ComboboxOption[]>([]);
  const [unitUuid, setUnitUuid] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    setUnitUuid(null);
    setBusy(false);
    let cancelled = false;
    void (async () => {
      const units = await listUnits();
      if (cancelled) return;
      setOptions(
        units
          .filter((u) => u.status === 'ACTIVE')
          .map((u) => ({ value: u.uuid, label: u.nameUz, sublabel: u.code })),
      );
    })();
    return () => {
      cancelled = true;
    };
  }, [open]);

  async function submit() {
    if (!unitUuid) return;
    setBusy(true);
    try {
      const next = await routeLetter(letterUuid, unitUuid, actorUuid);
      toast.success(t('dashboard:letters.detail.route.success', { number: next.number }));
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
      title={t('dashboard:letters.detail.route.title')}
      description={t('dashboard:letters.detail.route.description')}
      footer={
        <div className="flex w-full flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={busy}>
            {t('common:actions.cancel')}
          </Button>
          <Button type="button" onClick={submit} disabled={!unitUuid || busy}>
            {t('dashboard:letters.detail.route.cta')}
          </Button>
        </div>
      }
    >
      <div className="space-y-2">
        <Label>{t('dashboard:letters.detail.route.field-unit')}</Label>
        <Combobox
          options={options}
          value={unitUuid}
          onChange={setUnitUuid}
          placeholder={t('dashboard:letters.detail.route.unit-placeholder')}
        />
      </div>
    </ResponsiveDialog>
  );
}
