import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { X } from 'lucide-react';
import { toast } from 'sonner';

import Combobox, { type ComboboxOption } from '@/components/common/Combobox';
import ResponsiveDialog from '@/components/common/ResponsiveDialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

import {
  addCollegialBodyMember,
  createCollegialBody,
  removeCollegialBodyMember,
  updateCollegialBody,
  CollegialNetworkError,
  CollegialValidationError,
} from '@/lib/data/collegialBodies';
import type { CollegialBody, Employee } from '@/types/domain';

const FORM_ID = 'collegial-body-form';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  body: CollegialBody | null;
  employees: Employee[];
  onSaved: () => void;
}

/**
 * Create/edit sheet for the standing collegial-body registry
 * (PLAN_kollegial-organ.md §5). On create, the initial member roster is
 * chosen inline (`memberEmployeeUuids` goes on the POST body). On edit,
 * name/chairman/secretary/quorum go through `updateCollegialBody`, while
 * roster membership is managed live via `addCollegialBodyMember`/
 * `removeCollegialBodyMember` — the backend has no bulk-roster PATCH.
 */
export default function BodyFormSheet({ open, onOpenChange, body, employees, onSaved }: Props) {
  const { t } = useTranslation(['dashboard', 'common']);
  const isEdit = !!body;

  const [name, setName] = useState('');
  const [chairmanUuid, setChairmanUuid] = useState<string | null>(null);
  const [secretaryUuid, setSecretaryUuid] = useState<string | null>(null);
  const [quorumMin, setQuorumMin] = useState(1);
  const [newMemberUuids, setNewMemberUuids] = useState<string[]>([]);
  const [currentMemberUuids, setCurrentMemberUuids] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [memberBusy, setMemberBusy] = useState(false);
  const [nameError, setNameError] = useState(false);

  useEffect(() => {
    if (!open) return;
    setName(body?.name ?? ''); // eslint-disable-line react-hooks/set-state-in-effect
    setChairmanUuid(body?.chairmanEmployeeUuid ?? null);
    setSecretaryUuid(body?.secretaryEmployeeUuid ?? null);
    setQuorumMin(body?.quorumMin ?? 1);
    setNewMemberUuids([]);
    setCurrentMemberUuids(body?.memberEmployeeUuids ?? []);
    setNameError(false);
  }, [open, body]);

  const employeeOptions: ComboboxOption[] = useMemo(
    () =>
      employees
        .filter((e) => e.status !== 'TERMINATED')
        .map((e) => ({ value: e.uuid, label: e.fullNameGenerated, sublabel: e.corporateEmail })),
    [employees],
  );

  const byUuid = useMemo(() => new Map(employees.map((e) => [e.uuid, e])), [employees]);

  const addMemberOptions = useMemo(() => {
    const taken = new Set(isEdit ? currentMemberUuids : newMemberUuids);
    return employeeOptions.filter((o) => !taken.has(o.value));
  }, [employeeOptions, isEdit, currentMemberUuids, newMemberUuids]);

  function reportError(err: unknown) {
    if (err instanceof CollegialValidationError) toast.error(t(`dashboard:collegial.errors.${err.code}`));
    else if (err instanceof CollegialNetworkError) toast.error(t('common:errors.network'));
    else toast.error(t('common:errors.unknown'));
  }

  async function handleAddMember(employeeUuid: string) {
    if (!isEdit || !body) {
      setNewMemberUuids((prev) => [...prev, employeeUuid]);
      return;
    }
    setMemberBusy(true);
    try {
      const updated = await addCollegialBodyMember(body.uuid, employeeUuid);
      setCurrentMemberUuids(updated.memberEmployeeUuids ?? []);
      onSaved();
    } catch (err) {
      reportError(err);
    } finally {
      setMemberBusy(false);
    }
  }

  async function handleRemoveMember(employeeUuid: string) {
    if (!isEdit || !body) {
      setNewMemberUuids((prev) => prev.filter((u) => u !== employeeUuid));
      return;
    }
    setMemberBusy(true);
    try {
      const updated = await removeCollegialBodyMember(body.uuid, employeeUuid);
      setCurrentMemberUuids(updated.memberEmployeeUuids ?? []);
      onSaved();
    } catch (err) {
      reportError(err);
    } finally {
      setMemberBusy(false);
    }
  }

  async function submit() {
    if (!name.trim() || !chairmanUuid || !secretaryUuid) {
      setNameError(true);
      return;
    }
    setNameError(false);
    setBusy(true);
    try {
      if (isEdit && body) {
        await updateCollegialBody(body.uuid, {
          name: name.trim(),
          chairmanEmployeeUuid: chairmanUuid,
          secretaryEmployeeUuid: secretaryUuid,
          quorumMin,
        });
        toast.success(t('dashboard:collegial.bodies.toast.updated'));
      } else {
        await createCollegialBody({
          name: name.trim(),
          chairmanEmployeeUuid: chairmanUuid,
          secretaryEmployeeUuid: secretaryUuid,
          quorumMin,
          memberEmployeeUuids: newMemberUuids,
        });
        toast.success(t('dashboard:collegial.bodies.toast.created'));
      }
      onSaved();
      onOpenChange(false);
    } catch (err) {
      reportError(err);
    } finally {
      setBusy(false);
    }
  }

  const memberUuids = isEdit ? currentMemberUuids : newMemberUuids;

  return (
    <ResponsiveDialog
      open={open}
      onOpenChange={onOpenChange}
      title={t(isEdit ? 'dashboard:collegial.bodies.form.edit-title' : 'dashboard:collegial.bodies.form.create-title')}
      description={t('dashboard:collegial.bodies.form.description')}
      footer={
        <div className="flex w-full gap-2 md:w-auto">
          <Button variant="outline" type="button" className="flex-1 md:flex-none" onClick={() => onOpenChange(false)} disabled={busy}>
            {t('common:actions.cancel')}
          </Button>
          <Button form={FORM_ID} type="submit" className="flex-1 md:flex-none" disabled={busy}>
            {t('common:actions.save')}
          </Button>
        </div>
      }
    >
      <form
        id={FORM_ID}
        onSubmit={(e) => {
          e.preventDefault();
          void submit();
        }}
        className="space-y-4"
      >
        <div className="space-y-2">
          <Label htmlFor="body-name">
            {t('dashboard:collegial.bodies.form.name')} <span className="text-destructive">*</span>
          </Label>
          <Input id="body-name" value={name} onChange={(e) => setName(e.target.value)} autoFocus />
        </div>

        <div className="space-y-2">
          <Label>
            {t('dashboard:collegial.bodies.form.chairman')} <span className="text-destructive">*</span>
          </Label>
          <Combobox
            options={employeeOptions}
            value={chairmanUuid}
            onChange={setChairmanUuid}
            placeholder={t('common:labels.select')}
          />
        </div>

        <div className="space-y-2">
          <Label>
            {t('dashboard:collegial.bodies.form.secretary')} <span className="text-destructive">*</span>
          </Label>
          <Combobox
            options={employeeOptions}
            value={secretaryUuid}
            onChange={setSecretaryUuid}
            placeholder={t('common:labels.select')}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="body-quorum">{t('dashboard:collegial.bodies.form.quorum')}</Label>
          <Input
            id="body-quorum"
            type="number"
            min={1}
            value={quorumMin}
            onChange={(e) => {
              const n = Number(e.target.value);
              setQuorumMin(Number.isFinite(n) && n > 0 ? n : 1);
            }}
          />
        </div>

        {nameError && (
          <p className="text-xs text-destructive">{t('dashboard:collegial.bodies.form.errors.required')}</p>
        )}

        <div className="space-y-2">
          <Label>{t('dashboard:collegial.bodies.form.members')}</Label>
          {memberUuids.length > 0 && (
            <ul className="space-y-1.5">
              {memberUuids.map((uuid) => (
                <li
                  key={uuid}
                  className="flex items-center justify-between gap-2 rounded-md border border-line bg-surface px-3 py-2 text-sm"
                >
                  <span className="truncate text-ink">{byUuid.get(uuid)?.fullNameGenerated ?? uuid}</span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    disabled={memberBusy}
                    onClick={() => void handleRemoveMember(uuid)}
                    aria-label={t('common:actions.remove')}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </li>
              ))}
            </ul>
          )}
          <Combobox
            options={addMemberOptions}
            value={null}
            onChange={(v) => void handleAddMember(v)}
            disabled={memberBusy}
            placeholder={t('dashboard:collegial.bodies.form.add-member')}
          />
        </div>
      </form>
    </ResponsiveDialog>
  );
}
