import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';

import Combobox, { type ComboboxOption } from '@/components/common/Combobox';
import ResponsiveDialog from '@/components/common/ResponsiveDialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { listAssignments } from '@/lib/data/assignments';
import { listEmployees } from '@/lib/data/employees';
import { assignLetterExecutor } from '@/lib/data/letters';
import { listUnits } from '@/lib/data/units';

import { toastLetterError } from './letterErrors';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  letterUuid: string;
  /** The unit the letter was routed to — picker is scoped to its subtree. */
  routedUnitUuid: string;
  /** Acting employee (the routed unit's head) — policy re-validates. */
  actorUuid: string;
  onDone: () => void;
}

/**
 * BPMN 3.3 node 3 — the unit head assigns an executor. The picker mirrors the
 * backend's subtree membership check (primary unit OR open assignment whose
 * unit path is under the routed unit's path) so the only employees offered are
 * ones `assignLetterExecutor` will accept — it throws a non-policy error
 * otherwise (a bo'lim head assigns from his sho'bas too).
 */
export default function AssignDialog({
  open,
  onOpenChange,
  letterUuid,
  routedUnitUuid,
  actorUuid,
  onDone,
}: Props) {
  const { t } = useTranslation(['dashboard', 'common']);
  const [options, setOptions] = useState<ComboboxOption[]>([]);
  const [employeeUuid, setEmployeeUuid] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    setEmployeeUuid(null);
    setBusy(false);
    let cancelled = false;
    void (async () => {
      const [units, employees, assignments] = await Promise.all([
        listUnits(),
        listEmployees(),
        listAssignments(),
      ]);
      if (cancelled) return;
      const routedPath = units.find((u) => u.uuid === routedUnitUuid)?.path ?? '';
      const unitPath = new Map(units.map((u) => [u.uuid, u.path]));
      const inSubtree = (unitUuid: string) =>
        Boolean(routedPath) && (unitPath.get(unitUuid)?.startsWith(routedPath) ?? false);
      const byOpenAssignment = new Set(
        assignments.filter((a) => !a.endDate && inSubtree(a.unitUuid)).map((a) => a.employeeUuid),
      );
      setOptions(
        employees
          .filter(
            (e) =>
              e.status === 'ACTIVE' &&
              (inSubtree(e.primaryUnitUuid) || byOpenAssignment.has(e.uuid)),
          )
          .map((e) => ({ value: e.uuid, label: e.fullNameGenerated, sublabel: e.corporateEmail })),
      );
    })();
    return () => {
      cancelled = true;
    };
  }, [open, routedUnitUuid]);

  async function submit() {
    if (!employeeUuid) return;
    setBusy(true);
    try {
      await assignLetterExecutor(letterUuid, employeeUuid, actorUuid);
      toast.success(t('dashboard:letters.detail.assign.success'));
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
      title={t('dashboard:letters.detail.assign.title')}
      description={t('dashboard:letters.detail.assign.description')}
      footer={
        <div className="flex w-full flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={busy}>
            {t('common:actions.cancel')}
          </Button>
          <Button type="button" onClick={submit} disabled={!employeeUuid || busy}>
            {t('dashboard:letters.detail.assign.cta')}
          </Button>
        </div>
      }
    >
      <div className="space-y-2">
        <Label>{t('dashboard:letters.detail.assign.field-executor')}</Label>
        <Combobox
          options={options}
          value={employeeUuid}
          onChange={setEmployeeUuid}
          placeholder={t('dashboard:letters.detail.assign.executor-placeholder')}
          emptyMessage={t('dashboard:letters.detail.assign.no-members')}
        />
      </div>
    </ResponsiveDialog>
  );
}
