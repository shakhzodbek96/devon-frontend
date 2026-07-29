import { useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { z } from 'zod';

import Combobox, { type ComboboxOption } from '@/components/common/Combobox';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Slider } from '@/components/ui/slider';
import { Textarea } from '@/components/ui/textarea';
import {
  AssignmentValidationError,
  listAssignments,
  MAX_TOTAL_WORKLOAD_PERCENT,
  MockNetworkError,
  transferEmployee,
} from '@/lib/data/assignments';
import { listPositions } from '@/lib/data/positions';
import { listUnits } from '@/lib/data/units';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/stores/useAuthStore';
import type {
  Assignment,
  AssignmentType,
  Employee,
  Position,
  Unit,
  UnitType,
} from '@/types/domain';

const ASSIGNMENT_TYPES: AssignmentType[] = ['PRIMARY', 'COMBINATION', 'ACTING', 'TEMPORARY'];

const transferSchema = z.object({
  newUnitUuid: z.string().uuid('dashboard:employees.transfer.errors.no-unit'),
  newPositionId: z.string().min(1, 'dashboard:employees.transfer.errors.no-position'),
  startDate: z.string().min(1, 'common:errors.required'),
  workloadPercent: z.number().int().min(1).max(100),
  type: z.enum(['PRIMARY', 'COMBINATION', 'ACTING', 'TEMPORARY']),
  closeOldAssignment: z.boolean(),
  reason: z.string().max(500).optional(),
});

type TransferValues = z.infer<typeof transferSchema>;

interface Props {
  employee: Employee;
  /** Stable string id so the parent's external "Save" button can submit via `form` attribute. */
  formId: string;
  /** Notified once async data loads — lets the parent enable / disable the submit CTA. */
  onReadyChange?: (ready: boolean) => void;
  /** Toggle the submitting flag so the parent can disable the submit CTA. */
  onSubmittingChange?: (submitting: boolean) => void;
}

export default function TransferForm({ employee, formId, onReadyChange, onSubmittingChange }: Props) {
  const { t } = useTranslation(['dashboard', 'common']);
  const navigate = useNavigate();
  const actor = useAuthStore((s) => s.user?.uuid ?? '');

  const [units, setUnits] = useState<Unit[]>([]);
  const [positions, setPositions] = useState<Position[]>([]);
  const [currentAssignments, setCurrentAssignments] = useState<Assignment[]>([]);
  const [ready, setReady] = useState(false);

  const form = useForm<TransferValues>({
    resolver: zodResolver(transferSchema),
    defaultValues: {
      newUnitUuid: '',
      newPositionId: '',
      startDate: new Date().toISOString().slice(0, 10),
      workloadPercent: 100,
      type: 'PRIMARY',
      closeOldAssignment: true,
      reason: '',
    },
  });

  useEffect(() => {
    let active = true;
    (async () => {
      const [u, p, a] = await Promise.all([
        listUnits(),
        listPositions(),
        listAssignments(employee.uuid),
      ]);
      if (!active) return;
      setUnits(u.filter((x) => x.status === 'ACTIVE'));
      setPositions(p);
      setCurrentAssignments(a);
      setReady(true);
    })();
    return () => {
      active = false;
    };
  }, [employee.uuid]);

  useEffect(() => {
    onReadyChange?.(ready);
  }, [ready, onReadyChange]);

  useEffect(() => {
    onSubmittingChange?.(form.formState.isSubmitting);
  }, [form.formState.isSubmitting, onSubmittingChange]);

  const currentPrimaryUnit = useMemo(
    () => units.find((u) => u.uuid === employee.primaryUnitUuid) ?? null,
    [units, employee.primaryUnitUuid],
  );
  const currentPosition = useMemo(
    () => positions.find((p) => p.id === employee.positionId) ?? null,
    [positions, employee.positionId],
  );

  const unitOptions: ComboboxOption[] = useMemo(
    () =>
      units.map((u) => ({
        value: u.uuid,
        label: u.nameUz,
        sublabel: t(`common:unit-types.${u.type}`),
      })),
    [units, t],
  );

  const newUnitUuid = form.watch('newUnitUuid');
  const selectedUnit = useMemo(
    () => units.find((u) => u.uuid === newUnitUuid) ?? null,
    [units, newUnitUuid],
  );

  // Position options filtered by the selected unit's type.
  const positionOptions: ComboboxOption[] = useMemo(() => {
    if (!selectedUnit) return [];
    return positions
      .filter((p) => p.allowedUnitTypes.includes(selectedUnit.type as UnitType))
      .map((p) => ({ value: p.id, label: p.nameUz }));
  }, [positions, selectedUnit]);

  const newPositionId = form.watch('newPositionId');
  useEffect(() => {
    if (newPositionId && !positionOptions.some((o) => o.value === newPositionId)) {
      form.setValue('newPositionId', '', { shouldValidate: false });
    }
  }, [positionOptions, newPositionId, form]);

  // When user picks COMBINATION, the old assignment must stay open by definition.
  const assignmentType = form.watch('type');
  useEffect(() => {
    if (assignmentType === 'COMBINATION') {
      form.setValue('closeOldAssignment', false, { shouldDirty: true });
    }
  }, [assignmentType, form]);

  const workloadPercent = form.watch('workloadPercent');
  const closeOld = form.watch('closeOldAssignment');

  // Compute the effective total workload for the inline hint. Matches the
  // mock-backend's MAX_TOTAL_WORKLOAD_PERCENT guard exactly.
  const carriedWorkload = useMemo(() => {
    if (closeOld) return 0;
    return currentAssignments
      .filter((a) => !a.endDate)
      .reduce((sum, a) => sum + a.workloadPercent, 0);
  }, [currentAssignments, closeOld]);
  const projectedTotal = carriedWorkload + workloadPercent;
  const overCap = projectedTotal > MAX_TOTAL_WORKLOAD_PERCENT;

  const existingActivePrimary = currentAssignments.find((a) => a.isPrimary && !a.endDate);

  async function onSubmit(values: TransferValues) {
    if (values.newUnitUuid === employee.primaryUnitUuid && values.type === 'PRIMARY') {
      form.setError('newUnitUuid', {
        type: 'manual',
        message: 'dashboard:employees.transfer.errors.same-unit',
      });
      return;
    }

    try {
      await transferEmployee(
        {
          employeeUuid: employee.uuid,
          newUnitUuid: values.newUnitUuid,
          newPositionId: values.newPositionId,
          startDate: values.startDate,
          workloadPercent: values.workloadPercent,
          type: values.type,
          closeOldAssignment: values.closeOldAssignment,
          reason: values.reason || undefined,
        },
        actor,
      );
      toast.success(
        t('dashboard:employees.transfer.success', { name: employee.fullNameGenerated }),
      );
      navigate(`/employees/${employee.uuid}`, { replace: true });
    } catch (err) {
      if (err instanceof AssignmentValidationError) {
        toast.error(t(`dashboard:employees.transfer.errors.${err.code}`));
      } else if (err instanceof MockNetworkError) {
        toast.error(t('common:errors.network'));
      } else {
        toast.error(t('common:errors.unknown'));
      }
    }
  }

  return (
    <form
      id={formId}
      onSubmit={form.handleSubmit(onSubmit)}
      className="space-y-6"
      noValidate
    >
      <section className="rounded-lg border border-line bg-surface-2/40 p-4 text-sm">
        <p className="text-body">
          <span className="text-muted-foreground">
            {t('dashboard:employees.transfer.current-label', {
              name: currentPrimaryUnit?.nameUz ?? '—',
            })}
          </span>
        </p>
        <p className="text-body">
          <span className="text-muted-foreground">
            {t('dashboard:employees.transfer.current-position-label', {
              name: currentPosition?.nameUz ?? '—',
            })}
          </span>
        </p>
      </section>

      <div className="space-y-2">
        <Label htmlFor="newUnitUuid">
          {t('dashboard:employees.transfer.new-unit')}{' '}
          <span className="text-destructive">*</span>
        </Label>
        <Combobox
          id="newUnitUuid"
          options={unitOptions}
          value={newUnitUuid || null}
          onChange={(v) =>
            form.setValue('newUnitUuid', v, { shouldDirty: true, shouldValidate: true })
          }
          placeholder={t('dashboard:employees.transfer.new-unit-placeholder')}
          searchPlaceholder={t('dashboard:employees.wizard.placeholders.unit-search')}
          emptyMessage={t('dashboard:employees.wizard.errors.no-units')}
        />
        {form.formState.errors.newUnitUuid?.message && (
          <p className="text-xs text-destructive">
            {t(form.formState.errors.newUnitUuid.message)}
          </p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="newPositionId">
          {t('dashboard:employees.transfer.new-position')}{' '}
          <span className="text-destructive">*</span>
        </Label>
        <Combobox
          id="newPositionId"
          options={positionOptions}
          value={newPositionId || null}
          onChange={(v) =>
            form.setValue('newPositionId', v, { shouldDirty: true, shouldValidate: true })
          }
          placeholder={
            selectedUnit
              ? t('dashboard:employees.transfer.new-position-placeholder')
              : t('dashboard:employees.transfer.new-position-disabled')
          }
          disabled={!selectedUnit}
          emptyMessage={t('dashboard:employees.wizard.errors.no-positions-for-unit')}
        />
        {form.formState.errors.newPositionId?.message && (
          <p className="text-xs text-destructive">
            {t(form.formState.errors.newPositionId.message)}
          </p>
        )}
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="startDate">
            {t('dashboard:employees.transfer.start-date')}{' '}
            <span className="text-destructive">*</span>
          </Label>
          <Input id="startDate" type="date" {...form.register('startDate')} />
          {form.formState.errors.startDate?.message && (
            <p className="text-xs text-destructive">
              {t(form.formState.errors.startDate.message)}
            </p>
          )}
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="workloadInput">{t('dashboard:employees.transfer.workload')}</Label>
            <span
              className={cn(
                'font-mono text-sm tabular-nums',
                overCap ? 'text-destructive' : 'text-primary-deep',
              )}
            >
              {t('dashboard:employees.transfer.workload-pct', { pct: workloadPercent })}
            </span>
          </div>
          <Slider
            value={[workloadPercent]}
            min={5}
            max={100}
            step={5}
            onValueChange={(values) =>
              form.setValue('workloadPercent', values[0] ?? 100, { shouldDirty: true })
            }
          />
          <Input
            id="workloadInput"
            type="number"
            min={1}
            max={100}
            value={workloadPercent}
            onChange={(e) => {
              const n = Number(e.target.value);
              if (!Number.isFinite(n)) return;
              const clamped = Math.max(1, Math.min(100, Math.round(n)));
              form.setValue('workloadPercent', clamped, { shouldDirty: true });
            }}
          />
          <p
            className={cn(
              'text-xs',
              overCap ? 'text-destructive' : 'text-muted-foreground',
            )}
          >
            {t('dashboard:employees.transfer.workload-current', {
              used: projectedTotal,
              cap: MAX_TOTAL_WORKLOAD_PERCENT,
            })}
          </p>
        </div>
      </div>

      <div className="space-y-2">
        <Label>
          {t('dashboard:employees.transfer.type')} <span className="text-destructive">*</span>
        </Label>
        <RadioGroup
          value={assignmentType}
          onValueChange={(v) =>
            form.setValue('type', v as AssignmentType, { shouldDirty: true })
          }
          className="grid grid-cols-2 gap-2 md:grid-cols-4"
        >
          {ASSIGNMENT_TYPES.map((kind) => (
            <label
              key={kind}
              htmlFor={`type-${kind}`}
              className={cn(
                'flex cursor-pointer items-center gap-2 rounded-lg border border-line bg-surface px-3 py-2.5 text-sm transition-colors',
                assignmentType === kind &&
                  'border-primary bg-brand-soft text-primary-deep',
              )}
            >
              <RadioGroupItem value={kind} id={`type-${kind}`} />
              <span>{t(`dashboard:employees.transfer.types.${kind}`)}</span>
            </label>
          ))}
        </RadioGroup>
        {assignmentType === 'PRIMARY' && existingActivePrimary && !closeOld && (
          <p className="text-xs text-warning">
            {t('dashboard:employees.transfer.primary-demote-note')}
          </p>
        )}
      </div>

      <div className="space-y-2 rounded-lg border border-line bg-surface p-4">
        <label className="flex cursor-pointer items-start gap-3">
          <Checkbox
            checked={closeOld}
            disabled={assignmentType === 'COMBINATION'}
            onCheckedChange={(checked) =>
              form.setValue('closeOldAssignment', checked === true, { shouldDirty: true })
            }
            className="mt-0.5"
          />
          <div className="min-w-0">
            <span className="text-sm font-medium text-ink">
              {t('dashboard:employees.transfer.close-old')}
            </span>
            <p className="text-xs text-muted-foreground">
              {assignmentType === 'COMBINATION'
                ? t('dashboard:employees.transfer.combine-note')
                : t('dashboard:employees.transfer.close-old-hint')}
            </p>
          </div>
        </label>
      </div>

      <div className="space-y-2">
        <Label htmlFor="reason">{t('dashboard:employees.transfer.reason')}</Label>
        <Textarea
          id="reason"
          {...form.register('reason')}
          placeholder={t('dashboard:employees.transfer.reason-placeholder')}
          rows={3}
        />
      </div>
    </form>
  );
}
