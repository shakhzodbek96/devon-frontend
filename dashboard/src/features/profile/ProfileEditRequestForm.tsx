import { useTranslation } from 'react-i18next';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { z } from 'zod';

import ResponsiveDialog from '@/components/common/ResponsiveDialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { MockNetworkError, updateEmployee } from '@/lib/data/employees';
import { submitProfileChangeRequest } from '@/lib/data/profileRequests';
import { useAuthStore } from '@/stores/useAuthStore';
import type { Employee } from '@/types/domain';

const FORM_ID = 'profile-edit-request-form';

const schema = z.object({
  mobilePhone: z
    .string()
    .min(1, 'common:errors.required')
    .regex(
      /^\+998 \d{2} \d{3} \d{2} \d{2}$/,
      'common:errors.invalid-phone',
    ),
  personalEmail: z
    .string()
    .email('common:errors.invalid-email')
    .or(z.literal(''))
    .optional(),
});

type Values = z.infer<typeof schema>;

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  employee: Employee;
  /** Whether the current user can apply edits directly (HR_ADMIN) or files a request. */
  canEditDirectly: boolean;
  onSaved: (next: Employee) => void;
}

export default function ProfileEditRequestForm({
  open,
  onOpenChange,
  employee,
  canEditDirectly,
  onSaved,
}: Props) {
  const { t } = useTranslation(['dashboard', 'common']);
  const actor = useAuthStore((s) => s.user?.uuid ?? '');

  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: {
      mobilePhone: employee.mobilePhone,
      personalEmail: employee.personalEmail ?? '',
    },
    mode: 'onTouched',
  });

  // Reset defaults whenever the dialog opens for a different snapshot of the
  // employee — keeps the dialog idempotent if the parent re-renders.
  if (
    open &&
    !form.formState.isDirty &&
    (form.getValues('mobilePhone') !== employee.mobilePhone ||
      (form.getValues('personalEmail') ?? '') !== (employee.personalEmail ?? ''))
  ) {
    form.reset({
      mobilePhone: employee.mobilePhone,
      personalEmail: employee.personalEmail ?? '',
    });
  }

  async function onSubmit(values: Values) {
    const personalEmail = values.personalEmail?.trim() ?? '';
    const fields: Record<string, { from: unknown; to: unknown }> = {};
    if (values.mobilePhone !== employee.mobilePhone) {
      fields.mobilePhone = { from: employee.mobilePhone, to: values.mobilePhone };
    }
    if (personalEmail !== (employee.personalEmail ?? '')) {
      fields.personalEmail = {
        from: employee.personalEmail ?? null,
        to: personalEmail || null,
      };
    }
    if (Object.keys(fields).length === 0) {
      onOpenChange(false);
      return;
    }

    try {
      if (canEditDirectly) {
        const next = await updateEmployee(
          employee.uuid,
          {
            mobilePhone: values.mobilePhone,
            personalEmail: personalEmail || undefined,
          },
          actor,
        );
        toast.success(t('dashboard:profile.info.save-success-direct'));
        onSaved(next);
      } else {
        await submitProfileChangeRequest(
          { employeeUuid: employee.uuid, fields },
          actor,
        );
        toast.success(t('dashboard:profile.info.save-success-request'));
      }
      onOpenChange(false);
    } catch (err) {
      if (err instanceof MockNetworkError) {
        toast.error(t('common:errors.network'));
      } else {
        toast.error(t('common:errors.unknown'));
      }
    }
  }

  const mobileError = form.formState.errors.mobilePhone?.message;
  const personalEmailError = form.formState.errors.personalEmail?.message;

  return (
    <ResponsiveDialog
      open={open}
      onOpenChange={onOpenChange}
      title={t('dashboard:profile.edit-form.title')}
      description={t('dashboard:profile.edit-form.description')}
      footer={
        <>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={form.formState.isSubmitting}
          >
            {t('dashboard:profile.edit-form.cancel')}
          </Button>
          <Button form={FORM_ID} type="submit" disabled={form.formState.isSubmitting}>
            {t('dashboard:profile.edit-form.submit')}
          </Button>
        </>
      }
    >
      <form
        id={FORM_ID}
        onSubmit={form.handleSubmit(onSubmit)}
        className="space-y-4"
      >
        <div className="space-y-2">
          <Label htmlFor="edit-mobile">
            {t('dashboard:profile.edit-form.mobile-phone')}
          </Label>
          <Input
            id="edit-mobile"
            inputMode="tel"
            placeholder="+998 90 123 45 67"
            {...form.register('mobilePhone')}
          />
          {mobileError && <p className="text-xs text-destructive">{t(mobileError)}</p>}
        </div>

        <div className="space-y-2">
          <Label htmlFor="edit-personal-email">
            {t('dashboard:profile.edit-form.personal-email')}
          </Label>
          <Input
            id="edit-personal-email"
            type="email"
            placeholder="ism@example.com"
            {...form.register('personalEmail')}
          />
          {personalEmailError && (
            <p className="text-xs text-destructive">{t(personalEmailError)}</p>
          )}
        </div>

        <p className="text-xs text-muted-foreground">
          {canEditDirectly
            ? t('dashboard:profile.info.edit-direct-hint')
            : t('dashboard:profile.info.edit-request-hint')}
        </p>
      </form>
    </ResponsiveDialog>
  );
}
