import { useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';

import ResponsiveDialog from '@/components/common/ResponsiveDialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';

import { createUnit, updateUnit, UnitValidationError } from '@/lib/data/units';
import { useAuthStore } from '@/stores/useAuthStore';
import type { Unit, UnitType } from '@/types/domain';

import { unitFormSchema, type UnitFormValues } from './unit.schema';

// TZ §3.3 child-type rules — keeps the type dropdown honest.
const ALLOWED_CHILDREN: Record<UnitType, UnitType[]> = {
  DEPARTMENT: ['DIRECTORATE', 'DIVISION', 'OTHER'],
  DIRECTORATE: ['DIVISION', 'DEPARTMENT_SUB', 'SECTION', 'OTHER'],
  DIVISION: ['DEPARTMENT_SUB', 'SECTION', 'OTHER'],
  DEPARTMENT_SUB: ['SECTION', 'OTHER'],
  SECTION: ['OTHER'],
  OTHER: ['OTHER'],
};
const ROOT_ALLOWED: UnitType[] = ['DEPARTMENT', 'OTHER'];

const ROOT_SENTINEL = '__root__';

function autoCode(): string {
  return Math.random().toString(36).slice(2, 8).toUpperCase();
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  unit: Unit | null;
  allUnits: Unit[];
  defaultParentUuid?: string | null;
  onSaved: () => void;
}

function defaultValuesFor(unit: Unit | null, defaultParentUuid?: string | null): UnitFormValues {
  return {
    nameUz: unit?.nameUz ?? '',
    shortName: unit?.shortName ?? '',
    code: unit?.code ?? '',
    type: unit?.type ?? 'DIVISION',
    parentUuid: unit ? unit.parentUuid : defaultParentUuid ?? null,
    description: unit?.description ?? '',
  };
}

export default function UnitFormSheet({
  open,
  onOpenChange,
  unit,
  allUnits,
  defaultParentUuid,
  onSaved,
}: Props) {
  const { t } = useTranslation(['dashboard', 'common']);
  const actor = useAuthStore((s) => s.user?.uuid ?? '');
  const isEdit = !!unit;

  const form = useForm<UnitFormValues>({
    resolver: zodResolver(unitFormSchema),
    defaultValues: defaultValuesFor(unit, defaultParentUuid),
  });

  useEffect(() => {
    if (open) form.reset(defaultValuesFor(unit, defaultParentUuid));
  }, [open, unit, defaultParentUuid, form]);

  // Parent dropdown excludes self + descendants when editing (would create a cycle).
  const parentOptions = useMemo(() => {
    if (!unit) return allUnits.filter((u) => u.status === 'ACTIVE');
    const selfPath = `/${unit.uuid}/`;
    return allUnits.filter(
      (u) =>
        u.status === 'ACTIVE' &&
        u.uuid !== unit.uuid &&
        !u.path.includes(selfPath),
    );
  }, [allUnits, unit]);

  const parentUuid = form.watch('parentUuid');
  const parent = useMemo(
    () => allUnits.find((u) => u.uuid === parentUuid) ?? null,
    [allUnits, parentUuid],
  );
  const allowedTypes = parent ? ALLOWED_CHILDREN[parent.type] : ROOT_ALLOWED;

  // Re-validate the type when the parent changes so the user can't submit a type
  // the new parent disallows.
  useEffect(() => {
    const current = form.getValues('type');
    if (!allowedTypes.includes(current)) {
      form.setValue('type', allowedTypes[0]!, { shouldValidate: false });
    }
  }, [allowedTypes, form]);

  async function onSubmit(values: UnitFormValues) {
    const payload = {
      nameUz: values.nameUz.trim(),
      shortName: values.shortName?.trim() || undefined,
      code: values.code?.trim() || autoCode(),
      type: values.type,
      parentUuid: values.parentUuid,
      description: values.description?.trim() || undefined,
    };

    try {
      if (isEdit) {
        await updateUnit(unit.uuid, payload, actor);
        toast.success(t('dashboard:units.toast.updated'));
      } else {
        await createUnit(payload, actor);
        toast.success(t('dashboard:units.toast.created'));
      }
      onSaved();
      onOpenChange(false);
    } catch (err) {
      if (err instanceof UnitValidationError) {
        toast.error(t(`dashboard:units.errors.${err.code}`));
      } else {
        toast.error(t('common:errors.network'));
      }
    }
  }

  const { errors, isSubmitting } = form.formState;

  return (
    <ResponsiveDialog
      open={open}
      onOpenChange={onOpenChange}
      title={t(isEdit ? 'dashboard:units.form.edit-title' : 'dashboard:units.form.create-title')}
      description={t('dashboard:units.form.description')}
      footer={
        <div className="flex w-full gap-2 md:w-auto">
          <Button
            variant="outline"
            type="button"
            className="flex-1 md:flex-none"
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
          >
            {t('common:actions.cancel')}
          </Button>
          <Button
            form="unit-form"
            type="submit"
            className="flex-1 md:flex-none"
            disabled={isSubmitting}
          >
            {t('common:actions.save')}
          </Button>
        </div>
      }
    >
      <form id="unit-form" onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="nameUz">
            {t('dashboard:units.form.name')} <span className="text-destructive">*</span>
          </Label>
          <Input id="nameUz" {...form.register('nameUz')} autoFocus />
          {errors.nameUz?.message && (
            <p className="text-xs text-destructive">
              {t(errors.nameUz.message, { count: 3 })}
            </p>
          )}
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="shortName">{t('dashboard:units.form.short-name')}</Label>
            <Input id="shortName" {...form.register('shortName')} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="code">{t('dashboard:units.form.code')}</Label>
            <Input
              id="code"
              {...form.register('code')}
              placeholder={t('dashboard:units.form.code-placeholder')}
            />
            {errors.code?.message && (
              <p className="text-xs text-destructive">{t(errors.code.message)}</p>
            )}
          </div>
        </div>

        <div className="space-y-2">
          <Label>{t('dashboard:units.form.parent')}</Label>
          <Select
            value={parentUuid ?? ROOT_SENTINEL}
            onValueChange={(v) =>
              form.setValue('parentUuid', v === ROOT_SENTINEL ? null : v, { shouldDirty: true })
            }
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ROOT_SENTINEL}>{t('dashboard:units.form.root')}</SelectItem>
              {parentOptions.map((u) => (
                <SelectItem key={u.uuid} value={u.uuid}>
                  {u.nameUz}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>
            {t('dashboard:units.form.type')} <span className="text-destructive">*</span>
          </Label>
          <Select
            value={form.watch('type')}
            onValueChange={(v) => form.setValue('type', v as UnitType, { shouldDirty: true })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {allowedTypes.map((typ) => (
                <SelectItem key={typ} value={typ}>
                  {t(`common:unit-types.${typ}`)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">{t('dashboard:units.form.type-hint')}</p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="description">{t('dashboard:units.form.description-label')}</Label>
          <Textarea id="description" {...form.register('description')} rows={3} />
        </div>
      </form>
    </ResponsiveDialog>
  );
}
