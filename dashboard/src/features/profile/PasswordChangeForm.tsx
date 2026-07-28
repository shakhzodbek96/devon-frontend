import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { Eye, EyeOff, KeyRound } from 'lucide-react';
import { z } from 'zod';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { passwordStrength } from '@/features/employees/wizard/employee.schema';
import { formatRelative } from '@/i18n/uz-locale';
import { changePassword } from '@/lib/api/auth';
import { ApiError } from '@/lib/api/client';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/stores/useAuthStore';

const schema = z
  .object({
    current: z.string().min(1, 'common:errors.required'),
    next: z
      .string()
      .min(8, 'dashboard:profile.password.errors.weak')
      .regex(/[A-Z]/, 'dashboard:profile.password.errors.weak')
      .regex(/[a-z]/, 'dashboard:profile.password.errors.weak')
      .regex(/\d/, 'dashboard:profile.password.errors.weak')
      .regex(/[^A-Za-z0-9]/, 'dashboard:profile.password.errors.weak'),
    confirm: z.string(),
  })
  .refine((d) => d.next === d.confirm, {
    message: 'common:errors.passwords-dont-match',
    path: ['confirm'],
  })
  .refine((d) => d.next !== d.current, {
    message: 'dashboard:profile.password.errors.same-as-old',
    path: ['next'],
  });

type Values = z.infer<typeof schema>;

interface Props {
  lastChangedAt?: string;
  mustChange?: boolean;
  /** Called after a successful change — the forced first-login gate uses this to navigate away. */
  onSuccess?: () => void;
}

export default function PasswordChangeForm({ lastChangedAt, mustChange, onSuccess }: Props) {
  const { t } = useTranslation(['dashboard', 'common']);
  const clearMustChangePassword = useAuthStore((s) => s.clearMustChangePassword);
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNext, setShowNext] = useState(false);

  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { current: '', next: '', confirm: '' },
    mode: 'onTouched',
  });

  const nextValue = form.watch('next');
  const strength = passwordStrength(nextValue);
  const strengthPct = (strength / 4) * 100;

  async function onSubmit(values: Values) {
    try {
      await changePassword(values.current, values.next);
      clearMustChangePassword();
      toast.success(t('dashboard:profile.password.toast.changed'));
      form.reset({ current: '', next: '', confirm: '' });
      onSuccess?.();
    } catch (err) {
      if (err instanceof ApiError && err.status === 422) {
        form.setError('current', {
          type: 'manual',
          message: 'dashboard:profile.password.errors.current-wrong',
        });
        return;
      }
      if (err instanceof ApiError && err.status === 0) {
        toast.error(t('common:errors.network'));
        return;
      }
      toast.error(t('common:errors.unknown'));
    }
  }

  const currentError = form.formState.errors.current?.message;
  const nextError = form.formState.errors.next?.message;
  const confirmError = form.formState.errors.confirm?.message;

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5 pt-4">
      <div className="flex flex-col gap-1.5">
        <h3 className="text-base font-semibold text-ink">
          {t('dashboard:profile.password.heading')}
        </h3>
        <p className="text-sm text-muted-foreground">
          {t('dashboard:profile.password.hint')}
        </p>
      </div>

      {mustChange && (
        <div className="rounded-lg border border-warning/30 bg-warning/10 px-4 py-3 text-sm text-ink">
          {t('dashboard:profile.password.must-change-banner')}
        </div>
      )}

      <div className="space-y-4 rounded-lg border border-line bg-surface p-5">
        <div className="space-y-2">
          <Label htmlFor="current-password">
            {t('dashboard:profile.password.current-label')}
          </Label>
          <div className="relative">
            <Input
              id="current-password"
              type={showCurrent ? 'text' : 'password'}
              autoComplete="current-password"
              placeholder={t('dashboard:profile.password.current-placeholder')}
              {...form.register('current')}
              className="pr-10"
            />
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              onClick={() => setShowCurrent((v) => !v)}
              aria-label={t(
                showCurrent
                  ? 'dashboard:profile.password.hide'
                  : 'dashboard:profile.password.show',
              )}
              className="absolute right-1 top-1/2 -translate-y-1/2"
            >
              {showCurrent ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </Button>
          </div>
          {currentError && (
            <p className="text-xs text-destructive">{t(currentError)}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="next-password">
            {t('dashboard:profile.password.next-label')}
          </Label>
          <div className="relative">
            <Input
              id="next-password"
              type={showNext ? 'text' : 'password'}
              autoComplete="new-password"
              placeholder={t('dashboard:profile.password.next-placeholder')}
              {...form.register('next')}
              className="pr-10"
            />
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              onClick={() => setShowNext((v) => !v)}
              aria-label={t(
                showNext
                  ? 'dashboard:profile.password.hide'
                  : 'dashboard:profile.password.show',
              )}
              className="absolute right-1 top-1/2 -translate-y-1/2"
            >
              {showNext ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </Button>
          </div>
          {nextValue && (
            <div className="flex items-center gap-3">
              <Progress
                value={strengthPct}
                className={cn(
                  'h-1.5 flex-1',
                  strength <= 1 && '[&>div]:bg-destructive',
                  strength === 2 && '[&>div]:bg-warning',
                  strength >= 3 && '[&>div]:bg-primary',
                )}
              />
              <span className="text-xs tabular-nums text-muted-foreground">
                {t(`dashboard:employees.wizard.password-strength.${strength}`)}
              </span>
            </div>
          )}
          {nextError && <p className="text-xs text-destructive">{t(nextError)}</p>}
        </div>

        <div className="space-y-2">
          <Label htmlFor="confirm-password">
            {t('dashboard:profile.password.confirm-label')}
          </Label>
          <Input
            id="confirm-password"
            type={showNext ? 'text' : 'password'}
            autoComplete="new-password"
            placeholder={t('dashboard:profile.password.confirm-placeholder')}
            {...form.register('confirm')}
          />
          {confirmError && (
            <p className="text-xs text-destructive">{t(confirmError)}</p>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs text-muted-foreground">
          {lastChangedAt
            ? t('dashboard:profile.password.last-changed', {
                when: formatRelative(lastChangedAt),
              })
            : t('dashboard:profile.password.never-changed')}
        </p>
        <Button type="submit" disabled={form.formState.isSubmitting} className="sm:w-auto">
          <KeyRound className="mr-2 h-4 w-4" />
          {t('dashboard:profile.password.submit')}
        </Button>
      </div>
    </form>
  );
}
