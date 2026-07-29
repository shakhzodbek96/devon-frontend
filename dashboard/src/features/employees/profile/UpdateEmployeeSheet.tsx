import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { z } from 'zod';

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
import {
  EmployeeValidationError,
  findUserByEmail,
  MockNetworkError,
  updateEmployee,
} from '@/lib/data/employees';
import { useAuthStore } from '@/stores/useAuthStore';
import type { Employee } from '@/types/domain';

/**
 * Re-uses the wizard's step-1 + step-2 schemas conceptually but drops PINFL
 * (locked post-creation per TZ §4.4) and skips the live PINFL/email dedup
 * pills — the edit form just validates on submit.
 */
const editSchema = z.object({
  lastName: z.string().min(1, 'common:errors.required').max(100),
  firstName: z.string().min(1, 'common:errors.required').max(100),
  middleName: z.string().max(100).optional(),
  gender: z.enum(['M', 'F']),
  birthDate: z.string().optional(),
  passportSeries: z.string().max(20).optional(),
  workPhone: z.string().max(30).optional(),
  internalExtension: z.string().max(10).optional(),
  mobilePhone: z
    .string()
    .regex(/^\+998\s?\d{2}\s?\d{3}\s?\d{2}\s?\d{2}$/, 'common:errors.invalid-phone'),
  corporateEmail: z
    .string()
    .email('common:errors.invalid-email')
    .regex(/@devon\.uz$/i, 'common:errors.email-must-be-corporate'),
  personalEmail: z
    .union([z.literal(''), z.string().email('common:errors.invalid-email')])
    .optional(),
});

type EditValues = z.infer<typeof editSchema>;

function formatUzPhone(raw: string): string {
  const digits = raw.replace(/\D/g, '').slice(0, 12);
  const body = digits.startsWith('998') ? digits.slice(3) : digits;
  if (body.length === 0) return '';
  let out = '+998';
  if (body.length > 0) out += ' ' + body.slice(0, 2);
  if (body.length > 2) out += ' ' + body.slice(2, 5);
  if (body.length > 5) out += ' ' + body.slice(5, 7);
  if (body.length > 7) out += ' ' + body.slice(7, 9);
  return out;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  employee: Employee;
  onSaved: (next: Employee) => void;
}

export default function UpdateEmployeeSheet({ open, onOpenChange, employee, onSaved }: Props) {
  const { t } = useTranslation(['dashboard', 'common']);
  const actor = useAuthStore((s) => s.user?.uuid ?? '');

  const form = useForm<EditValues>({
    resolver: zodResolver(editSchema),
    defaultValues: {
      lastName: employee.lastName,
      firstName: employee.firstName,
      middleName: employee.middleName ?? '',
      gender: employee.gender,
      birthDate: employee.birthDate ?? '',
      passportSeries: employee.passportSeries ?? '',
      workPhone: employee.workPhone ?? '',
      internalExtension: employee.internalExtension ?? '',
      mobilePhone: employee.mobilePhone,
      corporateEmail: employee.corporateEmail,
      personalEmail: employee.personalEmail ?? '',
    },
  });

  // When the sheet re-opens, reset the form so a discarded edit doesn't leak
  // into the next session and a fresh employee record is picked up.
  useEffect(() => {
    if (open) {
      form.reset({
        lastName: employee.lastName,
        firstName: employee.firstName,
        middleName: employee.middleName ?? '',
        gender: employee.gender,
        birthDate: employee.birthDate ?? '',
        passportSeries: employee.passportSeries ?? '',
        workPhone: employee.workPhone ?? '',
        internalExtension: employee.internalExtension ?? '',
        mobilePhone: employee.mobilePhone,
        corporateEmail: employee.corporateEmail,
        personalEmail: employee.personalEmail ?? '',
      });
    }
  }, [open, employee, form]);

  async function onSubmit(values: EditValues) {
    // Email dedup runs only when the address changed — re-checking the same
    // value would always self-collide.
    if (values.corporateEmail.toLowerCase() !== employee.corporateEmail.toLowerCase()) {
      const existing = await findUserByEmail(values.corporateEmail);
      if (existing && existing.employeeUuid !== employee.uuid) {
        form.setError('corporateEmail', { type: 'manual', message: 'common:errors.email-taken' });
        return;
      }
    }

    try {
      const next = await updateEmployee(
        employee.uuid,
        {
          lastName: values.lastName,
          firstName: values.firstName,
          middleName: values.middleName || undefined,
          gender: values.gender,
          birthDate: values.birthDate || undefined,
          passportSeries: values.passportSeries || undefined,
          workPhone: values.workPhone || undefined,
          internalExtension: values.internalExtension || undefined,
          mobilePhone: values.mobilePhone,
          corporateEmail: values.corporateEmail,
          personalEmail: values.personalEmail || undefined,
        },
        actor,
      );
      toast.success(t('dashboard:employees.profile.info.save-success'));
      onSaved(next);
      onOpenChange(false);
    } catch (err) {
      if (err instanceof EmployeeValidationError) {
        toast.error(t(`common:errors.${err.code}`));
      } else if (err instanceof MockNetworkError) {
        toast.error(t('common:errors.network'));
      } else {
        toast.error(t('common:errors.unknown'));
      }
    }
  }

  const formId = 'update-employee-form';

  return (
    <ResponsiveDialog
      open={open}
      onOpenChange={onOpenChange}
      title={t('dashboard:employees.profile.info.edit-sheet-title')}
      description={t('dashboard:employees.profile.info.edit-sheet-body')}
      size="sm:max-w-2xl"
      footer={
        <div className="flex w-full flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            {t('dashboard:employees.profile.info.cancel')}
          </Button>
          <Button type="submit" form={formId} disabled={form.formState.isSubmitting}>
            {t('dashboard:employees.profile.info.save')}
          </Button>
        </div>
      }
    >
      <form id={formId} onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Field
            label={t('dashboard:employees.profile.info.fields.full-name') + ' — ' + t('dashboard:employees.wizard.fields.last-name')}
            error={form.formState.errors.lastName?.message}
            errorT={t}
          >
            <Input {...form.register('lastName')} />
          </Field>
          <Field
            label={t('dashboard:employees.wizard.fields.first-name')}
            error={form.formState.errors.firstName?.message}
            errorT={t}
          >
            <Input {...form.register('firstName')} />
          </Field>
          <Field label={t('dashboard:employees.wizard.fields.middle-name')}>
            <Input {...form.register('middleName')} />
          </Field>
          <Field label={t('dashboard:employees.profile.info.fields.gender')}>
            <Select
              value={form.watch('gender')}
              onValueChange={(v) => form.setValue('gender', v as 'M' | 'F', { shouldValidate: true })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="M">{t('dashboard:employees.profile.info.gender.M')}</SelectItem>
                <SelectItem value="F">{t('dashboard:employees.profile.info.gender.F')}</SelectItem>
              </SelectContent>
            </Select>
          </Field>
          <Field
            label={t('dashboard:employees.profile.info.fields.birth-date')}
            error={form.formState.errors.birthDate?.message}
            errorT={t}
          >
            <Input type="date" {...form.register('birthDate')} />
          </Field>
          <Field label={t('dashboard:employees.profile.info.fields.passport')}>
            <Input {...form.register('passportSeries')} placeholder="AA 1234567" />
          </Field>
        </div>

        <div className="border-t border-line pt-5">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <Field label={t('dashboard:employees.profile.info.fields.work-phone')}>
              <Input
                {...form.register('workPhone')}
                onChange={(e) =>
                  form.setValue('workPhone', formatUzPhone(e.target.value), { shouldValidate: true })
                }
                placeholder="+998 71 ..."
              />
            </Field>
            <Field label={t('dashboard:employees.profile.info.fields.extension')}>
              <Input {...form.register('internalExtension')} placeholder="1234" />
            </Field>
            <Field
              label={t('dashboard:employees.profile.info.fields.mobile-phone')}
              error={form.formState.errors.mobilePhone?.message}
              errorT={t}
            >
              <Input
                {...form.register('mobilePhone')}
                onChange={(e) =>
                  form.setValue('mobilePhone', formatUzPhone(e.target.value), { shouldValidate: true })
                }
                placeholder="+998 90 123 45 67"
              />
            </Field>
            <Field
              label={t('dashboard:employees.profile.info.fields.corporate-email')}
              error={form.formState.errors.corporateEmail?.message}
              errorT={t}
            >
              <Input {...form.register('corporateEmail')} type="email" />
            </Field>
            <Field
              label={t('dashboard:employees.profile.info.fields.personal-email')}
              error={form.formState.errors.personalEmail?.message}
              errorT={t}
            >
              <Input {...form.register('personalEmail')} type="email" />
            </Field>
          </div>
        </div>
      </form>
    </ResponsiveDialog>
  );
}

function Field({
  label,
  error,
  errorT,
  children,
}: {
  label: string;
  error?: string;
  errorT?: ReturnType<typeof useTranslation>['0'];
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-medium text-body">{label}</Label>
      {children}
      {error && errorT && <p className="text-xs text-destructive">{errorT(error)}</p>}
    </div>
  );
}
