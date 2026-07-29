import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Check, Loader2, X } from 'lucide-react';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { findUserByEmail } from '@/lib/data/employees';

import { step2Schema, type Step2Values } from './employee.schema';
import { useWizardStore } from './wizard-store';

const FORM_ID = 'wizard-step-2';

type EmailState = 'idle' | 'checking' | 'unique' | 'taken';

/**
 * Reformats raw input to the canonical Uzbek mobile-phone shape
 * `+998 XX XXX XX XX`. Strips non-digits, anchors on the 998 country code,
 * inserts spaces at known offsets. Accepts pasted strings with random
 * spacing / dashes — they normalise to the same shape.
 */
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

export default function Step2Contact() {
  const { t } = useTranslation(['dashboard', 'common']);
  const data = useWizardStore((s) => s.data.step2);
  const setStep2 = useWizardStore((s) => s.setStep2);
  const next = useWizardStore((s) => s.next);

  const form = useForm<Step2Values>({
    resolver: zodResolver(step2Schema),
    defaultValues: data,
    mode: 'onTouched',
  });

  const [emailCheck, setEmailCheck] = useState<EmailState>('idle');
  const corporateEmail = form.watch('corporateEmail');

  // Debounced email dedup. Only fires when the value matches both the email
  // regex AND the @devon.uz constraint — otherwise rely on zod errors first.
  useEffect(() => {
    if (!/^[^\s@]+@devon\.uz$/i.test(corporateEmail)) {
      setEmailCheck('idle');
      return;
    }
    setEmailCheck('checking');
    let cancelled = false;
    const id = setTimeout(async () => {
      const user = await findUserByEmail(corporateEmail.trim().toLowerCase());
      if (cancelled) return;
      setEmailCheck(user ? 'taken' : 'unique');
    }, 350);
    return () => {
      cancelled = true;
      clearTimeout(id);
    };
  }, [corporateEmail]);

  function onSubmit(values: Step2Values) {
    if (emailCheck === 'taken') {
      form.setError('corporateEmail', {
        type: 'manual',
        message: 'common:errors.email-taken',
      });
      return;
    }
    setStep2({
      ...values,
      workPhone: values.workPhone ?? '',
      internalExtension: values.internalExtension ?? '',
      personalEmail: values.personalEmail ?? '',
    });
    next();
  }

  const { errors } = form.formState;

  return (
    <form
      id={FORM_ID}
      onSubmit={form.handleSubmit(onSubmit)}
      className="space-y-5"
      noValidate
    >
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="workPhone">
            {t('dashboard:employees.wizard.fields.work-phone')}
          </Label>
          <Input
            id="workPhone"
            inputMode="tel"
            placeholder="+998 71 200 00 00"
            {...form.register('workPhone')}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="extension">
            {t('dashboard:employees.wizard.fields.extension')}
          </Label>
          <Input
            id="extension"
            inputMode="numeric"
            placeholder="1234"
            {...form.register('internalExtension')}
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="mobilePhone">
          {t('dashboard:employees.wizard.fields.mobile-phone')}{' '}
          <span className="text-destructive">*</span>
        </Label>
        <Input
          id="mobilePhone"
          inputMode="tel"
          placeholder="+998 90 123 45 67"
          value={form.watch('mobilePhone')}
          onChange={(e) =>
            form.setValue('mobilePhone', formatUzPhone(e.target.value), {
              shouldDirty: true,
              shouldValidate: !!form.formState.touchedFields.mobilePhone,
            })
          }
          onBlur={() => form.trigger('mobilePhone')}
        />
        {errors.mobilePhone?.message && (
          <p className="text-xs text-destructive">
            {t(errors.mobilePhone.message, { count: 12 })}
          </p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="corporateEmail">
          {t('dashboard:employees.wizard.fields.corporate-email')}{' '}
          <span className="text-destructive">*</span>
        </Label>
        <div className="relative">
          <Input
            id="corporateEmail"
            type="email"
            autoCapitalize="none"
            placeholder="ism.familiya@devon.uz"
            className="pr-10"
            {...form.register('corporateEmail')}
          />
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            {emailCheck === 'checking' && (
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            )}
            {emailCheck === 'unique' && <Check className="h-4 w-4 text-primary" />}
            {emailCheck === 'taken' && <X className="h-4 w-4 text-destructive" />}
          </div>
        </div>
        <p className="text-xs text-muted-foreground">
          {t('dashboard:employees.wizard.hints.corporate-email')}
        </p>
        {(emailCheck === 'taken' || errors.corporateEmail?.message) && (
          <p className="text-xs text-destructive">
            {t(
              emailCheck === 'taken'
                ? 'common:errors.email-taken'
                : (errors.corporateEmail?.message as string),
            )}
          </p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="personalEmail">
          {t('dashboard:employees.wizard.fields.personal-email')}
        </Label>
        <Input
          id="personalEmail"
          type="email"
          autoCapitalize="none"
          placeholder="ism@example.com"
          {...form.register('personalEmail')}
        />
        {errors.personalEmail?.message && (
          <p className="text-xs text-destructive">
            {t(errors.personalEmail.message as string)}
          </p>
        )}
      </div>
    </form>
  );
}

export { FORM_ID as STEP2_FORM_ID };
