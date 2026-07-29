import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pencil } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { formatBytes } from '@/lib/format';
import { listPositions } from '@/lib/data/positions';
import { listUnits } from '@/lib/data/units';
import type { Position, Unit } from '@/types/domain';

import { useWizardStore } from './wizard-store';

interface RowProps {
  label: string;
  value: string | undefined;
}

function Row({ label, value }: RowProps) {
  return (
    <div className="flex flex-col gap-0.5 sm:flex-row sm:items-baseline sm:justify-between sm:gap-4">
      <dt className="text-xs uppercase tracking-wider text-muted-foreground">{label}</dt>
      <dd className="text-sm text-ink sm:text-right">
        {value && value.trim() !== '' ? value : '—'}
      </dd>
    </div>
  );
}

interface SectionProps {
  title: string;
  stepIndex: number;
  children: React.ReactNode;
}

function Section({ title, stepIndex, children }: SectionProps) {
  const setCurrent = useWizardStore((s) => s.setCurrent);
  const { t } = useTranslation(['common']);
  return (
    <Card className="space-y-3 p-5">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-ink">{title}</h3>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => setCurrent(stepIndex)}
        >
          <Pencil className="mr-1.5 h-3.5 w-3.5" />
          {t('common:actions.edit')}
        </Button>
      </div>
      <dl className="space-y-2.5">{children}</dl>
    </Card>
  );
}

export default function ReviewScreen() {
  const { t } = useTranslation(['dashboard', 'common']);
  const data = useWizardStore((s) => s.data);

  const [units, setUnits] = useState<Unit[]>([]);
  const [positions, setPositions] = useState<Position[]>([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [u, p] = await Promise.all([listUnits(), listPositions()]);
      if (!cancelled) {
        setUnits(u);
        setPositions(p);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const unitName = units.find((u) => u.uuid === data.step3.primaryUnitUuid)?.nameUz;
  const positionName = positions.find((p) => p.id === data.step3.positionId)?.nameUz;
  const fullName = [data.step1.lastName, data.step1.firstName, data.step1.middleName]
    .filter(Boolean)
    .join(' ');

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-primary/20 bg-brand-soft/40 p-4 text-sm text-primary-deep">
        {t('dashboard:employees.wizard.review.intro', { name: fullName })}
      </div>

      <Section title={t('dashboard:employees.wizard.step-1.title')} stepIndex={0}>
        <Row
          label={t('dashboard:employees.wizard.fields.last-name')}
          value={data.step1.lastName}
        />
        <Row
          label={t('dashboard:employees.wizard.fields.first-name')}
          value={data.step1.firstName}
        />
        <Row
          label={t('dashboard:employees.wizard.fields.middle-name')}
          value={data.step1.middleName}
        />
        <Row
          label={t('dashboard:employees.wizard.fields.gender')}
          value={t(`common:genders.${data.step1.gender}`)}
        />
        <Row
          label={t('dashboard:employees.wizard.fields.birth-date')}
          value={data.step1.birthDate}
        />
        <Row
          label={t('dashboard:employees.wizard.fields.pinfl')}
          value={data.step1.pinfl}
        />
        <Row
          label={t('dashboard:employees.wizard.fields.passport')}
          value={data.step1.passportSeries}
        />
      </Section>

      <Section title={t('dashboard:employees.wizard.step-2.title')} stepIndex={1}>
        <Row
          label={t('dashboard:employees.wizard.fields.work-phone')}
          value={data.step2.workPhone}
        />
        <Row
          label={t('dashboard:employees.wizard.fields.extension')}
          value={data.step2.internalExtension}
        />
        <Row
          label={t('dashboard:employees.wizard.fields.mobile-phone')}
          value={data.step2.mobilePhone}
        />
        <Row
          label={t('dashboard:employees.wizard.fields.corporate-email')}
          value={data.step2.corporateEmail}
        />
        <Row
          label={t('dashboard:employees.wizard.fields.personal-email')}
          value={data.step2.personalEmail}
        />
      </Section>

      <Section title={t('dashboard:employees.wizard.step-3.title')} stepIndex={2}>
        <Row label={t('dashboard:employees.wizard.fields.unit')} value={unitName} />
        <Row
          label={t('dashboard:employees.wizard.fields.position')}
          value={positionName}
        />
        <Row
          label={t('dashboard:employees.wizard.fields.employment-type')}
          value={t(`common:employment-types.${data.step3.employmentType}`)}
        />
        <Row
          label={t('dashboard:employees.wizard.fields.hire-date')}
          value={data.step3.hireDate}
        />
        <Row
          label={t('dashboard:employees.wizard.fields.role')}
          value={t(`common:roles.${data.step3.role}`)}
        />
        <Row
          label={t('dashboard:employees.wizard.fields.order-extract')}
          value={
            data.step3.employmentOrderExtract
              ? `${data.step3.employmentOrderExtract.fileName} (${formatBytes(
                  data.step3.employmentOrderExtract.fileSize,
                )})`
              : undefined
          }
        />
        <Row
          label={t('dashboard:employees.wizard.fields.position-instruction')}
          value={
            data.step3.positionInstruction
              ? `${data.step3.positionInstruction.fileName} (${formatBytes(
                  data.step3.positionInstruction.fileSize,
                )})`
              : undefined
          }
        />
      </Section>

      <Section title={t('dashboard:employees.wizard.step-4.title')} stepIndex={3}>
        <Row
          label={t('dashboard:employees.wizard.fields.login')}
          value={data.step4.login}
        />
        <Row
          label={t('dashboard:employees.wizard.fields.password')}
          value={data.step4.password ? '••••••••' : undefined}
        />
        <Row
          label={t('dashboard:employees.wizard.fields.notify-sms')}
          value={t(`common:labels.${data.step4.notifySms ? 'yes' : 'no'}`)}
        />
        <Row
          label={t('dashboard:employees.wizard.fields.notify-email')}
          value={t(`common:labels.${data.step4.notifyEmail ? 'yes' : 'no'}`)}
        />
      </Section>
    </div>
  );
}
