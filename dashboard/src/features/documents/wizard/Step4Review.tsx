import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pencil } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { formatBytes } from '@/lib/format';
import { listDocumentTemplates } from '@/lib/data/documents';
import { listEmployees } from '@/lib/data/employees';
import type { DocumentTemplate, Employee } from '@/types/domain';

import { useDocWizardStore } from './doc-wizard-store';

export default function Step4Review() {
  const { t } = useTranslation(['dashboard', 'common']);
  const data = useDocWizardStore((s) => s.data);

  const [employees, setEmployees] = useState<Employee[]>([]);
  const [templates, setTemplates] = useState<DocumentTemplate[]>([]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const [emps, tpls] = await Promise.all([listEmployees(), listDocumentTemplates()]);
      if (!cancelled) {
        setEmployees(emps);
        setTemplates(tpls);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const namesByUuid = useMemo(
    () => new Map(employees.map((e) => [e.uuid, e.fullNameGenerated])),
    [employees],
  );
  const templateName = templates.find((tpl) => tpl.uuid === data.templateUuid)?.nameUz;

  return (
    <div className="space-y-4">
      <Section
        title={t('dashboard:documents.wizard.review.card-content')}
        stepIndex={0}
      >
        <Row
          label={t('dashboard:documents.wizard.review.label-source')}
          value={t(
            data.source === 'TEMPLATE'
              ? 'dashboard:documents.wizard.step-1.source-template'
              : 'dashboard:documents.wizard.step-1.source-upload',
          )}
        />
        {data.source === 'TEMPLATE' ? (
          <Row
            label={t('dashboard:documents.wizard.review.label-template')}
            value={templateName}
          />
        ) : (
          <Row
            label={t('dashboard:documents.wizard.review.label-file')}
            value={
              data.fileMeta
                ? `${data.fileMeta.fileName} (${formatBytes(data.fileMeta.fileSize)})`
                : undefined
            }
          />
        )}
        <Row
          label={t('dashboard:documents.wizard.review.label-title')}
          value={data.content.title}
        />
        <Row
          label={t('dashboard:documents.wizard.review.label-confidentiality')}
          value={t(
            `dashboard:documents.wizard.step-2.confidentiality-${data.content.confidentiality}`,
          )}
        />
      </Section>

      <Section
        title={t('dashboard:documents.wizard.review.card-routing')}
        stepIndex={1}
      >
        <Row
          label={t('dashboard:documents.wizard.review.label-recipient')}
          value={namesByUuid.get(data.content.recipientUuid)}
        />
        <Row
          label={t('dashboard:documents.wizard.review.label-signer')}
          value={
            data.content.signerUuid
              ? namesByUuid.get(data.content.signerUuid)
              : t('dashboard:documents.wizard.step-2.signer-none')
          }
        />
      </Section>

      <Section
        title={t('dashboard:documents.wizard.review.card-participants')}
        stepIndex={2}
      >
        {data.requiresApproval && data.participantUuids.length > 0 ? (
          <ol className="space-y-1.5">
            {data.participantUuids.map((uuid, i) => (
              <li key={uuid} className="flex items-center gap-2 text-sm text-ink">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-brand-soft text-[10px] font-semibold tabular-nums text-primary-deep">
                  {i + 1}
                </span>
                {namesByUuid.get(uuid) ?? '—'}
              </li>
            ))}
          </ol>
        ) : (
          <p className="text-sm text-muted-foreground">
            {t('dashboard:documents.wizard.review.no-approval')}
          </p>
        )}
      </Section>
    </div>
  );
}

interface SectionProps {
  title: string;
  stepIndex: number;
  children: React.ReactNode;
}

function Section({ title, stepIndex, children }: SectionProps) {
  const setCurrent = useDocWizardStore((s) => s.setCurrent);
  const { t } = useTranslation(['common']);
  return (
    <Card className="space-y-3 p-5">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-ink">{title}</h3>
        <Button type="button" variant="ghost" size="sm" onClick={() => setCurrent(stepIndex)}>
          <Pencil className="mr-1.5 h-3.5 w-3.5" />
          {t('common:actions.edit')}
        </Button>
      </div>
      <dl className="space-y-2.5">{children}</dl>
    </Card>
  );
}

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
