import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, Loader2, X } from 'lucide-react';

import LoadingState from '@/components/common/LoadingState';
import { Button } from '@/components/ui/button';
import { getEmployee } from '@/lib/data/employees';
import type { Employee } from '@/types/domain';

import TransferForm from './TransferForm';

const FORM_ID = 'employee-transfer-form';

export default function EmployeeTransferPage() {
  const { t } = useTranslation(['dashboard', 'common']);
  const { uuid } = useParams<{ uuid: string }>();
  const navigate = useNavigate();
  const [emp, setEmp] = useState<Employee | null | undefined>(undefined);
  const [submitting, setSubmitting] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!uuid) return;
    let active = true;
    (async () => {
      const result = await getEmployee(uuid);
      if (active) setEmp(result);
    })();
    return () => {
      active = false;
    };
  }, [uuid]);

  if (emp === undefined) {
    return (
      <div className="flex min-h-svh items-center justify-center bg-background p-6">
        <LoadingState rows={4} />
      </div>
    );
  }

  if (emp === null) {
    return (
      <div className="flex min-h-svh flex-col items-center justify-center gap-4 bg-background p-6">
        <p className="text-muted-foreground">{t('dashboard:employees.profile.not-found')}</p>
        <Button asChild variant="outline">
          <Link to="/employees">{t('common:actions.back')}</Link>
        </Button>
      </div>
    );
  }

  function onClose() {
    if (!emp) return;
    navigate(`/employees/${emp.uuid}`);
  }

  return (
    <div className="flex min-h-svh flex-col bg-background">
      {/* Mobile-only top bar — wizard parity */}
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
          {t('dashboard:employees.transfer.title')}
        </h1>
      </header>

      {/* Desktop header */}
      <header className="hidden items-center justify-between border-b border-line bg-surface px-6 py-4 md:flex">
        <div>
          <Button asChild variant="ghost" size="sm" className="-ml-2 mb-1">
            <Link to={`/employees/${emp.uuid}`}>
              <ArrowLeft className="mr-1 h-4 w-4" />
              {t('dashboard:employees.transfer.back')}
            </Link>
          </Button>
          <h1 className="text-xl font-bold tracking-tight text-ink">
            {t('dashboard:employees.transfer.title')}
          </h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            {t('dashboard:employees.transfer.subtitle', { name: emp.fullNameGenerated })}
          </p>
        </div>
        <Button variant="ghost" onClick={onClose}>
          {t('common:actions.cancel')}
        </Button>
      </header>

      <div className="flex flex-1 flex-col md:items-center md:py-8">
        <div className="flex w-full flex-1 flex-col md:max-w-3xl md:rounded-xl md:border md:border-line md:bg-surface md:shadow-sm">
          <div className="flex-1 overflow-y-auto px-4 py-6 md:px-8">
            <TransferForm
              employee={emp}
              formId={FORM_ID}
              onReadyChange={setReady}
              onSubmittingChange={setSubmitting}
            />
          </div>

          <footer className="pb-safe sticky bottom-0 flex items-center justify-between gap-3 border-t border-line bg-surface px-4 pt-4 md:px-8">
            <Button type="button" variant="outline" onClick={onClose} disabled={submitting}>
              {t('dashboard:employees.transfer.cancel')}
            </Button>
            <Button form={FORM_ID} type="submit" disabled={!ready || submitting}>
              {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {t('dashboard:employees.transfer.submit')}
            </Button>
          </footer>
        </div>
      </div>
    </div>
  );
}
