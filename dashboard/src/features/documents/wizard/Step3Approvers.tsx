import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ChevronDown, ChevronUp, Info, X } from 'lucide-react';

import Combobox, { type ComboboxOption } from '@/components/common/Combobox';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { useActingEmployee } from '@/lib/acting';
import { listEmployees } from '@/lib/data/employees';
import { listPositions } from '@/lib/data/positions';
import type { Employee } from '@/types/domain';

import { useDocWizardStore } from './doc-wizard-store';

const FORM_ID = 'doc-wizard-step-3';

export default function Step3Approvers() {
  const { t } = useTranslation(['dashboard', 'common']);
  const acting = useActingEmployee();
  const data = useDocWizardStore((s) => s.data);
  // Edit mode: updateDraftDocument cannot flip requiresApproval — the switch
  // locks; the participant chain itself stays editable (the backend rebuilds
  // the upcoming round's PENDING steps).
  const locked = useDocWizardStore((s) => s.editing) !== null;
  const setRequiresApproval = useDocWizardStore((s) => s.setRequiresApproval);
  const setParticipants = useDocWizardStore((s) => s.setParticipants);
  const next = useDocWizardStore((s) => s.next);

  const [employees, setEmployees] = useState<Employee[]>([]);
  const [positionNames, setPositionNames] = useState<Map<string, string>>(new Map());
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const [emps, positions] = await Promise.all([listEmployees(), listPositions()]);
      if (cancelled) return;
      setEmployees(emps.filter((e) => e.status !== 'TERMINATED'));
      setPositionNames(new Map(positions.map((p) => [p.id, p.nameUz])));
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const byUuid = useMemo(() => new Map(employees.map((e) => [e.uuid, e])), [employees]);

  // Creator + already-added participants are excluded from the picker —
  // matches the backend's assertValidParticipants invariant.
  const options: ComboboxOption[] = useMemo(() => {
    const taken = new Set(data.participantUuids);
    if (acting) taken.add(acting.employee.uuid);
    return employees
      .filter((e) => !taken.has(e.uuid))
      .map((e) => ({
        value: e.uuid,
        label: e.fullNameGenerated,
        sublabel: positionNames.get(e.positionId) ?? e.corporateEmail,
      }));
  }, [employees, data.participantUuids, acting, positionNames]);

  function add(uuid: string) {
    setParticipants([...data.participantUuids, uuid]);
    setError(false);
  }

  function remove(index: number) {
    setParticipants(data.participantUuids.filter((_, i) => i !== index));
  }

  function move(index: number, delta: -1 | 1) {
    const target = index + delta;
    if (target < 0 || target >= data.participantUuids.length) return;
    const nextOrder = [...data.participantUuids];
    const moved = nextOrder[index]!;
    nextOrder[index] = nextOrder[target]!;
    nextOrder[target] = moved;
    setParticipants(nextOrder);
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (data.requiresApproval && data.participantUuids.length < 1) {
      setError(true);
      return;
    }
    setError(false);
    next();
  }

  return (
    <form id={FORM_ID} onSubmit={onSubmit} className="space-y-6" noValidate>
      <div className="rounded-lg border border-line bg-surface p-4">
        <div className="flex items-center justify-between gap-4">
          <Label htmlFor="requiresApproval" className="cursor-pointer text-sm font-medium">
            {t('dashboard:documents.wizard.step-3.switch-label')}
          </Label>
          <Switch
            id="requiresApproval"
            checked={data.requiresApproval}
            disabled={locked}
            onCheckedChange={(on) => {
              setRequiresApproval(on);
              setError(false);
            }}
          />
        </div>
        {locked && (
          <p className="mt-2 text-xs text-muted-foreground">
            {t('dashboard:documents.wizard.step-3.edit-locked')}
          </p>
        )}
      </div>

      {!data.requiresApproval && (
        <p className="text-sm text-muted-foreground">
          {t('dashboard:documents.wizard.step-3.off-explanation')}
        </p>
      )}

      {data.requiresApproval && (
        <>
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              {t('dashboard:documents.wizard.step-3.sequential-banner')}
            </AlertDescription>
          </Alert>

          <div className="space-y-2">
            <Label htmlFor="addParticipant">
              {t('dashboard:documents.wizard.step-3.participants-label')}{' '}
              <span className="text-destructive">*</span>
            </Label>

            {data.participantUuids.length > 0 && (
              <ol className="space-y-2">
                {data.participantUuids.map((uuid, i) => {
                  const emp = byUuid.get(uuid);
                  return (
                    <li
                      key={uuid}
                      className="flex items-center gap-3 rounded-lg border border-line bg-surface px-3 py-2.5"
                    >
                      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand-soft text-xs font-semibold tabular-nums text-primary-deep">
                        {i + 1}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-ink">
                          {emp?.fullNameGenerated ?? '—'}
                        </p>
                        <p className="truncate text-xs text-muted-foreground">
                          {emp ? (positionNames.get(emp.positionId) ?? emp.corporateEmail) : ''}
                        </p>
                      </div>
                      <div className="flex shrink-0 items-center gap-1">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-sm"
                          disabled={i === 0}
                          onClick={() => move(i, -1)}
                          aria-label={t('dashboard:documents.wizard.step-3.move-up')}
                        >
                          <ChevronUp className="h-4 w-4" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-sm"
                          disabled={i === data.participantUuids.length - 1}
                          onClick={() => move(i, 1)}
                          aria-label={t('dashboard:documents.wizard.step-3.move-down')}
                        >
                          <ChevronDown className="h-4 w-4" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-sm"
                          onClick={() => remove(i)}
                          aria-label={t('dashboard:documents.wizard.step-3.remove-participant')}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    </li>
                  );
                })}
              </ol>
            )}

            <Combobox
              id="addParticipant"
              options={options}
              value={null}
              onChange={add}
              placeholder={t('dashboard:documents.wizard.step-3.add-participant')}
            />

            {error && (
              <p className="text-xs text-destructive">
                {t('dashboard:documents.wizard.step-3.errors.min-participants')}
              </p>
            )}
          </div>
        </>
      )}
    </form>
  );
}

export { FORM_ID as STEP3_FORM_ID };
