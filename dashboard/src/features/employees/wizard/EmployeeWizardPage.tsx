import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { Loader2, X } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  createEmployeeFull,
  EmployeeValidationError,
  MockNetworkError,
} from '@/lib/data/employees';
import { useAuthStore } from '@/stores/useAuthStore';

import ReviewScreen from './ReviewScreen';
import Step1Personal, { STEP1_FORM_ID } from './Step1Personal';
import Step2Contact, { STEP2_FORM_ID } from './Step2Contact';
import Step3Work, { STEP3_FORM_ID } from './Step3Work';
import Step4Login, { STEP4_FORM_ID } from './Step4Login';
import WizardStepper from './WizardStepper';
import { TOTAL_STEPS, useWizardStore } from './wizard-store';

const STEP_FORM_IDS: Record<number, string | null> = {
  0: STEP1_FORM_ID,
  1: STEP2_FORM_ID,
  2: STEP3_FORM_ID,
  3: STEP4_FORM_ID,
  4: null, // review — no inline form
};

export default function EmployeeWizardPage() {
  const { t } = useTranslation(['dashboard', 'common']);
  const navigate = useNavigate();
  const actor = useAuthStore((s) => s.user?.uuid ?? '');
  const current = useWizardStore((s) => s.current);
  const data = useWizardStore((s) => s.data);
  const setCurrent = useWizardStore((s) => s.setCurrent);
  const prev = useWizardStore((s) => s.prev);
  const isDirty = useWizardStore((s) => s.isDirty);
  const reset = useWizardStore((s) => s.reset);

  const [busy, setBusy] = useState(false);

  function onClose() {
    if (isDirty() && !window.confirm(t('dashboard:employees.wizard.confirm-close'))) {
      return;
    }
    reset();
    navigate('/employees');
  }

  async function onSubmit() {
    const orderExtract = data.step3.employmentOrderExtract;
    const positionInstruction = data.step3.positionInstruction;
    // Step 3's zod gate makes these unreachable in practice; if the store is
    // ever in a bad state, bounce back instead of failing the create.
    if (!orderExtract) {
      toast.error(t('common:errors.order-extract-missing'));
      setCurrent(2);
      return;
    }
    if (!positionInstruction) {
      toast.error(t('common:errors.position-instruction-missing'));
      setCurrent(2);
      return;
    }
    setBusy(true);
    try {
      const result = await createEmployeeFull(
        {
          employee: {
            lastName: data.step1.lastName,
            firstName: data.step1.firstName,
            middleName: data.step1.middleName || undefined,
            gender: data.step1.gender,
            birthDate: data.step1.birthDate || undefined,
            pinfl: data.step1.pinfl,
            passportSeries: data.step1.passportSeries || undefined,
            workPhone: data.step2.workPhone || undefined,
            internalExtension: data.step2.internalExtension || undefined,
            mobilePhone: data.step2.mobilePhone,
            corporateEmail: data.step2.corporateEmail,
            personalEmail: data.step2.personalEmail || undefined,
            primaryUnitUuid: data.step3.primaryUnitUuid,
            positionId: data.step3.positionId,
            employmentType: data.step3.employmentType,
            hireDate: data.step3.hireDate,
          },
          orderExtract,
          positionInstruction,
          password: data.step4.password,
          role: data.step3.role,
        },
        actor,
      );
      toast.success(
        t('dashboard:employees.wizard.success', {
          name: result.employee.fullNameGenerated,
        }),
      );
      reset();
      navigate(`/employees/${result.employee.uuid}`);
    } catch (err) {
      if (err instanceof EmployeeValidationError) {
        toast.error(t(`common:errors.${err.code}`));
      } else if (err instanceof MockNetworkError) {
        toast.error(t('common:errors.network'));
      } else {
        toast.error(t('common:errors.unknown'));
      }
    } finally {
      setBusy(false);
    }
  }

  const activeFormId = STEP_FORM_IDS[current];
  const isReview = current === TOTAL_STEPS - 1;

  return (
    <div className="flex min-h-svh flex-col bg-background">
      {/* Mobile-only top bar (replaces AppShell chrome for this route) */}
      <header className="flex h-14 shrink-0 items-center gap-3 border-b border-line bg-surface px-4 md:hidden">
        <Button
          variant="ghost"
          size="icon"
          onClick={onClose}
          aria-label={t('common:actions.close')}
        >
          <X className="h-5 w-5" />
        </Button>
        <h1 className="truncate text-base font-semibold text-ink">
          {t('dashboard:employees.wizard.title')}
        </h1>
      </header>

      {/* Desktop header */}
      <header className="hidden items-center justify-between border-b border-line bg-surface px-6 py-4 md:flex">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-ink">
            {t('dashboard:employees.wizard.title')}
          </h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            {t('dashboard:employees.wizard.subtitle')}
          </p>
        </div>
        <Button variant="ghost" onClick={onClose}>
          {t('common:actions.cancel')}
        </Button>
      </header>

      <div className="flex flex-1 flex-col md:px-6 md:py-8">
        <div className="flex w-full flex-1 flex-col md:rounded-xl md:border md:border-line md:bg-surface md:shadow-sm">
          <WizardStepper current={current} />

          <div className="flex-1 overflow-y-auto px-4 py-6 md:px-8">
            {current === 0 && <Step1Personal />}
            {current === 1 && <Step2Contact />}
            {current === 2 && <Step3Work />}
            {current === 3 && <Step4Login />}
            {current === 4 && <ReviewScreen />}
          </div>

          <footer className="pb-safe sticky bottom-0 flex items-center justify-between gap-3 border-t border-line bg-surface px-4 pt-4 md:px-8">
            <Button
              type="button"
              variant="outline"
              onClick={prev}
              disabled={current === 0 || busy}
            >
              {t('common:actions.previous')}
            </Button>
            {isReview ? (
              <Button type="button" onClick={onSubmit} disabled={busy}>
                {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {t('dashboard:employees.wizard.submit-cta')}
              </Button>
            ) : activeFormId ? (
              <Button form={activeFormId} type="submit">
                {t('common:actions.next')}
              </Button>
            ) : null}
          </footer>
        </div>
      </div>
    </div>
  );
}
