import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Check, Loader2, X } from 'lucide-react';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { listEmployees } from '@/lib/data/employees';
import { cn } from '@/lib/utils';

import { step1Schema, type Step1Values } from './employee.schema';
import { useWizardStore } from './wizard-store';

const FORM_ID = 'wizard-step-1';

type PinflState = 'idle' | 'checking' | 'unique' | 'taken';

export default function Step1Personal() {
  const { t } = useTranslation(['dashboard', 'common']);
  const data = useWizardStore((s) => s.data.step1);
  const setStep1 = useWizardStore((s) => s.setStep1);
  const next = useWizardStore((s) => s.next);

  const form = useForm<Step1Values>({
    resolver: zodResolver(step1Schema),
    defaultValues: data,
    mode: 'onTouched',
  });

  const [pinflSet, setPinflSet] = useState<Set<string> | null>(null);
  const [pinflCheck, setPinflCheck] = useState<PinflState>('idle');

  // Cache existing PINFLs once on mount so we can check synchronously as the
  // user types. Active employees only — a freed PINFL from a TERMINATED row
  // shouldn't block re-use.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const all = await listEmployees();
      if (cancelled) return;
      setPinflSet(
        new Set(all.filter((e) => e.status !== 'TERMINATED').map((e) => e.pinfl)),
      );
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Live PINFL state. Debounced 250 ms so the ✓ doesn't flicker as the user
  // types each digit; only fires when the regex matches 14 digits.
  const pinflValue = form.watch('pinfl');
  useEffect(() => {
    if (!/^[1-6]\d{13}$/.test(pinflValue)) {
      setPinflCheck('idle');
      return;
    }
    if (!pinflSet) {
      setPinflCheck('checking');
      return;
    }
    setPinflCheck('checking');
    const id = setTimeout(() => {
      setPinflCheck(pinflSet.has(pinflValue) ? 'taken' : 'unique');
    }, 250);
    return () => clearTimeout(id);
  }, [pinflValue, pinflSet]);

  function onSubmit(values: Step1Values) {
    if (pinflCheck === 'taken') {
      form.setError('pinfl', { type: 'manual', message: 'common:errors.pinfl-taken' });
      return;
    }
    // Normalize optional zod fields back to non-optional strings the store keeps.
    setStep1({
      ...values,
      middleName: values.middleName ?? '',
      birthDate: values.birthDate ?? '',
      passportSeries: values.passportSeries ?? '',
    });
    next();
  }

  const { errors } = form.formState;
  const gender = form.watch('gender');

  return (
    <form
      id={FORM_ID}
      onSubmit={form.handleSubmit(onSubmit)}
      className="space-y-5"
      noValidate
    >
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <Field
          id="lastName"
          label={t('dashboard:employees.wizard.fields.last-name')}
          required
          error={errors.lastName?.message}
          t={t}
        >
          <Input id="lastName" autoCapitalize="words" {...form.register('lastName')} />
        </Field>
        <Field
          id="firstName"
          label={t('dashboard:employees.wizard.fields.first-name')}
          required
          error={errors.firstName?.message}
          t={t}
        >
          <Input id="firstName" autoCapitalize="words" {...form.register('firstName')} />
        </Field>
        <Field
          id="middleName"
          label={t('dashboard:employees.wizard.fields.middle-name')}
          error={errors.middleName?.message}
          t={t}
        >
          <Input id="middleName" autoCapitalize="words" {...form.register('middleName')} />
        </Field>
      </div>

      <div className="space-y-2">
        <Label>
          {t('dashboard:employees.wizard.fields.gender')}{' '}
          <span className="text-destructive">*</span>
        </Label>
        <RadioGroup
          value={gender}
          onValueChange={(v) =>
            form.setValue('gender', v as 'M' | 'F', { shouldDirty: true })
          }
          className="flex gap-6 pt-1"
        >
          <label htmlFor="g-m" className="flex cursor-pointer items-center gap-2">
            <RadioGroupItem value="M" id="g-m" />
            <span>{t('common:genders.M')}</span>
          </label>
          <label htmlFor="g-f" className="flex cursor-pointer items-center gap-2">
            <RadioGroupItem value="F" id="g-f" />
            <span>{t('common:genders.F')}</span>
          </label>
        </RadioGroup>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Field
          id="birthDate"
          label={t('dashboard:employees.wizard.fields.birth-date')}
          error={errors.birthDate?.message}
          t={t}
        >
          <Input id="birthDate" type="date" {...form.register('birthDate')} />
        </Field>
        <Field
          id="pinfl"
          label={t('dashboard:employees.wizard.fields.pinfl')}
          required
          error={pinflCheck === 'taken' ? 'common:errors.pinfl-taken' : errors.pinfl?.message}
          t={t}
        >
          <div className="relative">
            <Input
              id="pinfl"
              {...form.register('pinfl')}
              inputMode="numeric"
              maxLength={14}
              placeholder={t('dashboard:employees.wizard.placeholders.pinfl')}
              className={cn('pr-10 font-mono tabular-nums')}
            />
            <div className="absolute right-3 top-1/2 -translate-y-1/2">
              {pinflCheck === 'checking' && (
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              )}
              {pinflCheck === 'unique' && <Check className="h-4 w-4 text-primary" />}
              {pinflCheck === 'taken' && <X className="h-4 w-4 text-destructive" />}
            </div>
          </div>
        </Field>
      </div>

      <Field
        id="passportSeries"
        label={t('dashboard:employees.wizard.fields.passport')}
        error={errors.passportSeries?.message}
        t={t}
      >
        <Input
          id="passportSeries"
          placeholder="AA1234567"
          {...form.register('passportSeries')}
        />
      </Field>
    </form>
  );
}

interface FieldProps {
  id: string;
  label: string;
  required?: boolean;
  error?: string;
  t: (key: string, options?: Record<string, unknown>) => string;
  children: React.ReactNode;
}

function Field({ id, label, required, error, t, children }: FieldProps) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>
        {label} {required && <span className="text-destructive">*</span>}
      </Label>
      {children}
      {error && <p className="text-xs text-destructive">{t(error, { count: 3 })}</p>}
    </div>
  );
}

export { FORM_ID as STEP1_FORM_ID };
