import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

import Combobox, { type ComboboxOption } from '@/components/common/Combobox';
import MetaFileField from '@/components/common/MetaFileField';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { listPositions } from '@/lib/data/positions';
import { listUnits } from '@/lib/data/units';
import type { EmploymentType, Position, Unit, UnitType } from '@/types/domain';
import { cn } from '@/lib/utils';

import { step3Schema, type Step3Values } from './employee.schema';
import { useWizardStore } from './wizard-store';

const FORM_ID = 'wizard-step-3';

const EMPLOYMENT_TYPES: EmploymentType[] = ['FULL_TIME', 'PART_TIME', 'CONTRACT', 'INTERN'];
const ROLES = [
  'ROLE_EMPLOYEE',
  'ROLE_UNIT_HEAD',
  'ROLE_HR_OPERATOR',
  'ROLE_AUDITOR',
] as const;

export default function Step3Work() {
  const { t } = useTranslation(['dashboard', 'common']);
  const data = useWizardStore((s) => s.data.step3);
  const setStep3 = useWizardStore((s) => s.setStep3);
  const next = useWizardStore((s) => s.next);

  const form = useForm<Step3Values>({
    resolver: zodResolver(step3Schema),
    defaultValues: data,
    mode: 'onTouched',
  });

  const [units, setUnits] = useState<Unit[]>([]);
  const [positions, setPositions] = useState<Position[]>([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [u, p] = await Promise.all([listUnits(), listPositions()]);
      if (cancelled) return;
      setUnits(u.filter((x) => x.status === 'ACTIVE'));
      setPositions(p);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const unitOptions: ComboboxOption[] = useMemo(
    () =>
      units.map((u) => ({
        value: u.uuid,
        label: u.nameUz,
        sublabel: t(`common:unit-types.${u.type}`),
      })),
    [units, t],
  );

  const primaryUnitUuid = form.watch('primaryUnitUuid');
  const selectedUnit = useMemo(
    () => units.find((u) => u.uuid === primaryUnitUuid) ?? null,
    [units, primaryUnitUuid],
  );

  // Position dropdown filtered by selected unit type. When unit changes and
  // the previously-picked position is no longer allowed for the new type,
  // clear it so the user can't submit an invalid combination.
  const allowedPositions = useMemo(() => {
    if (!selectedUnit) return positions;
    return positions.filter((p) =>
      p.allowedUnitTypes.includes(selectedUnit.type as UnitType),
    );
  }, [positions, selectedUnit]);

  const positionId = form.watch('positionId');
  useEffect(() => {
    if (positionId && !allowedPositions.some((p) => p.id === positionId)) {
      form.setValue('positionId', '', { shouldValidate: false });
    }
  }, [allowedPositions, positionId, form]);

  function onSubmit(values: Step3Values) {
    setStep3(values);
    next();
  }

  const { errors } = form.formState;
  const employmentType = form.watch('employmentType');
  const role = form.watch('role');
  const employmentOrderExtract = form.watch('employmentOrderExtract');
  const positionInstruction = form.watch('positionInstruction');

  return (
    <form
      id={FORM_ID}
      onSubmit={form.handleSubmit(onSubmit)}
      className="space-y-5"
      noValidate
    >
      <div className="space-y-2">
        <Label htmlFor="primaryUnitUuid">
          {t('dashboard:employees.wizard.fields.unit')}{' '}
          <span className="text-destructive">*</span>
        </Label>
        <Combobox
          id="primaryUnitUuid"
          options={unitOptions}
          value={primaryUnitUuid || null}
          onChange={(v) =>
            form.setValue('primaryUnitUuid', v, {
              shouldDirty: true,
              shouldValidate: true,
            })
          }
          placeholder={t('dashboard:employees.wizard.placeholders.unit')}
          searchPlaceholder={t('dashboard:employees.wizard.placeholders.unit-search')}
          emptyMessage={t('dashboard:employees.wizard.errors.no-units')}
        />
        {errors.primaryUnitUuid?.message && (
          <p className="text-xs text-destructive">
            {t(errors.primaryUnitUuid.message as string)}
          </p>
        )}
      </div>

      <div className="space-y-2">
        <Label>
          {t('dashboard:employees.wizard.fields.position')}{' '}
          <span className="text-destructive">*</span>
        </Label>
        <Select
          value={positionId || undefined}
          onValueChange={(v) =>
            form.setValue('positionId', v, {
              shouldDirty: true,
              shouldValidate: true,
            })
          }
          disabled={!selectedUnit}
        >
          <SelectTrigger>
            <SelectValue
              placeholder={
                selectedUnit
                  ? t('dashboard:employees.wizard.placeholders.position')
                  : t('dashboard:employees.wizard.placeholders.position-disabled')
              }
            />
          </SelectTrigger>
          <SelectContent>
            {allowedPositions.length === 0 && selectedUnit && (
              <div className="px-3 py-2 text-xs text-muted-foreground">
                {t('dashboard:employees.wizard.errors.no-positions-for-unit')}
              </div>
            )}
            {allowedPositions.map((p) => (
              <SelectItem key={p.id} value={p.id}>
                {p.nameUz}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {errors.positionId?.message && (
          <p className="text-xs text-destructive">
            {t(errors.positionId.message as string)}
          </p>
        )}
      </div>

      <div className="space-y-2">
        <Label>
          {t('dashboard:employees.wizard.fields.employment-type')}{' '}
          <span className="text-destructive">*</span>
        </Label>
        <RadioGroup
          value={employmentType}
          onValueChange={(v) =>
            form.setValue('employmentType', v as EmploymentType, {
              shouldDirty: true,
            })
          }
          className="grid grid-cols-2 gap-2 md:grid-cols-4"
        >
          {EMPLOYMENT_TYPES.map((et) => (
            <label
              key={et}
              htmlFor={`et-${et}`}
              className={cn(
                'flex cursor-pointer items-center gap-2 rounded-lg border border-line bg-surface px-3 py-2.5 text-sm transition-colors',
                employmentType === et && 'border-primary bg-brand-soft text-primary-deep',
              )}
            >
              <RadioGroupItem value={et} id={`et-${et}`} />
              <span>{t(`common:employment-types.${et}`)}</span>
            </label>
          ))}
        </RadioGroup>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="hireDate">
            {t('dashboard:employees.wizard.fields.hire-date')}{' '}
            <span className="text-destructive">*</span>
          </Label>
          <Input id="hireDate" type="date" {...form.register('hireDate')} />
          {errors.hireDate?.message && (
            <p className="text-xs text-destructive">
              {t(errors.hireDate.message as string)}
            </p>
          )}
        </div>
        <div className="space-y-2">
          <Label>
            {t('dashboard:employees.wizard.fields.role')}{' '}
            <span className="text-destructive">*</span>
          </Label>
          <Select
            value={role}
            onValueChange={(v) =>
              form.setValue('role', v as Step3Values['role'], { shouldDirty: true })
            }
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {ROLES.map((r) => (
                <SelectItem key={r} value={r}>
                  {t(`common:roles.${r}`)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <MetaFileField
          id="employmentOrderExtract"
          labelKey="dashboard:employees.wizard.fields.order-extract"
          hintKey="dashboard:employees.wizard.hints.order-extract"
          value={employmentOrderExtract}
          errorKey={errors.employmentOrderExtract?.message as string | undefined}
          onChange={(meta) => {
            form.clearErrors('employmentOrderExtract');
            form.setValue('employmentOrderExtract', meta, {
              shouldDirty: true,
              shouldValidate: meta !== null,
            });
          }}
          onError={(key) =>
            form.setError('employmentOrderExtract', { type: 'manual', message: key })
          }
        />

        <MetaFileField
          id="positionInstruction"
          labelKey="dashboard:employees.wizard.fields.position-instruction"
          hintKey="dashboard:employees.wizard.hints.position-instruction"
          value={positionInstruction}
          errorKey={errors.positionInstruction?.message as string | undefined}
          onChange={(meta) => {
            form.clearErrors('positionInstruction');
            form.setValue('positionInstruction', meta, {
              shouldDirty: true,
              shouldValidate: meta !== null,
            });
          }}
          onError={(key) =>
            form.setError('positionInstruction', { type: 'manual', message: key })
          }
        />
      </div>
    </form>
  );
}

export { FORM_ID as STEP3_FORM_ID };
