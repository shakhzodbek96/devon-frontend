import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { FileText } from 'lucide-react';

import Combobox, { type ComboboxOption } from '@/components/common/Combobox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import { formatBytes } from '@/lib/format';
import { listDocumentTemplates } from '@/lib/data/documents';
import { listEmployees } from '@/lib/data/employees';
import type { DocumentTemplate, Employee } from '@/types/domain';

import { renderTemplate } from '../renderTemplate';
import { buildStep2Schema, type Step2Values } from './document.schema';
import { useDocWizardStore } from './doc-wizard-store';

const FORM_ID = 'doc-wizard-step-2';

/** "ERI imzo talab qilinmaydi" sentinel inside the signer Combobox. */
const SIGNER_NONE = '__none__';

export default function Step2Content() {
  const data = useDocWizardStore((s) => s.data);

  const [template, setTemplate] = useState<DocumentTemplate | null>(null);
  const [employees, setEmployees] = useState<Employee[] | null>(null);

  // Resolve lookups before mounting the form — the dynamic zod schema is
  // built from the template's fields, so the resolver must not swap mid-form.
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const [templates, emps] = await Promise.all([
        data.source === 'TEMPLATE' ? listDocumentTemplates() : Promise.resolve([]),
        listEmployees(),
      ]);
      if (cancelled) return;
      setTemplate(templates.find((tpl) => tpl.uuid === data.templateUuid) ?? null);
      setEmployees(emps.filter((e) => e.status !== 'TERMINATED'));
    })();
    return () => {
      cancelled = true;
    };
  }, [data.source, data.templateUuid]);

  const ready = employees !== null && (data.source === 'UPLOAD' || template !== null);

  if (!ready) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-10 w-full rounded-lg" />
        ))}
      </div>
    );
  }

  return <Step2Form template={template} employees={employees} />;
}

function Step2Form({
  template,
  employees,
}: {
  template: DocumentTemplate | null;
  employees: Employee[];
}) {
  const { t } = useTranslation(['dashboard', 'common']);
  const data = useDocWizardStore((s) => s.data);
  const setContent = useDocWizardStore((s) => s.setContent);
  const next = useDocWizardStore((s) => s.next);

  const schema = useMemo(() => buildStep2Schema(template), [template]);

  const form = useForm<Step2Values>({
    resolver: zodResolver(schema),
    defaultValues: {
      title: data.content.title,
      recipientUuid: data.content.recipientUuid,
      signerUuid: data.content.signerUuid,
      confidentiality: data.content.confidentiality,
      values: {
        ...Object.fromEntries((template?.fields ?? []).map((f) => [f.key, ''])),
        ...data.content.values,
      },
    },
    mode: 'onTouched',
  });

  const employeeOptions: ComboboxOption[] = useMemo(
    () =>
      employees.map((e) => ({
        value: e.uuid,
        label: e.fullNameGenerated,
        sublabel: e.corporateEmail,
      })),
    [employees],
  );
  const signerOptions: ComboboxOption[] = useMemo(
    () => [
      { value: SIGNER_NONE, label: t('dashboard:documents.wizard.step-2.signer-none') },
      ...employeeOptions,
    ],
    [employeeOptions, t],
  );
  const namesByUuid = useMemo(
    () => new Map(employees.map((e) => [e.uuid, e.fullNameGenerated])),
    [employees],
  );

  const { errors } = form.formState;
  const watchedValues = form.watch('values');
  const watchedTitle = form.watch('title');
  const recipientUuid = form.watch('recipientUuid');
  const signerUuid = form.watch('signerUuid');
  const confidentiality = form.watch('confidentiality');

  // Live preview — employee-kind fields hold uuids; resolve to FIO exactly
  // like the backend's resolveTemplateValues so preview and stored body match.
  const previewBody = useMemo(() => {
    if (!template) return '';
    const resolved: Record<string, string> = { ...watchedValues };
    for (const field of template.fields) {
      if (field.kind !== 'employee') continue;
      const raw = resolved[field.key];
      if (raw) resolved[field.key] = namesByUuid.get(raw) ?? raw;
    }
    return renderTemplate(template.bodyTemplate, resolved);
  }, [template, watchedValues, namesByUuid]);

  function onSubmit(values: Step2Values) {
    setContent({
      title: values.title,
      recipientUuid: values.recipientUuid,
      signerUuid: values.signerUuid === SIGNER_NONE ? '' : values.signerUuid,
      confidentiality: values.confidentiality,
      values: values.values,
    });
    next();
  }

  const formFields = (
    <div className="space-y-5">
      <Field
        id="title"
        label={t('dashboard:documents.wizard.step-2.field-title')}
        required
        error={errors.title?.message}
        t={t}
      >
        <Input id="title" {...form.register('title')} />
      </Field>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Field
          id="recipientUuid"
          label={t('dashboard:documents.wizard.step-2.field-recipient')}
          required
          error={errors.recipientUuid?.message}
          t={t}
        >
          <Combobox
            id="recipientUuid"
            options={employeeOptions}
            value={recipientUuid || null}
            onChange={(v) =>
              form.setValue('recipientUuid', v, { shouldDirty: true, shouldValidate: true })
            }
          />
        </Field>
        <Field
          id="signerUuid"
          label={t('dashboard:documents.wizard.step-2.field-signer')}
          error={errors.signerUuid?.message}
          t={t}
        >
          <Combobox
            id="signerUuid"
            options={signerOptions}
            value={signerUuid || SIGNER_NONE}
            onChange={(v) => form.setValue('signerUuid', v, { shouldDirty: true })}
          />
        </Field>
      </div>

      <Field
        id="confidentiality"
        label={t('dashboard:documents.wizard.step-2.field-confidentiality')}
        t={t}
      >
        <Select
          value={confidentiality}
          onValueChange={(v) =>
            form.setValue('confidentiality', v as 'ODDIY' | 'MAXFIY', { shouldDirty: true })
          }
        >
          <SelectTrigger id="confidentiality" className="w-full md:w-64">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ODDIY">
              {t('dashboard:documents.wizard.step-2.confidentiality-ODDIY')}
            </SelectItem>
            <SelectItem value="MAXFIY">
              {t('dashboard:documents.wizard.step-2.confidentiality-MAXFIY')}
            </SelectItem>
          </SelectContent>
        </Select>
      </Field>

      {data.source === 'UPLOAD' && data.fileMeta && (
        <div className="flex items-center gap-3 rounded-lg border border-line bg-surface px-3 py-2.5">
          <FileText className="h-4 w-4 shrink-0 text-primary" />
          <span className="min-w-0 flex-1 truncate text-sm text-ink">
            {data.fileMeta.fileName}{' '}
            <span className="text-muted-foreground">
              ({formatBytes(data.fileMeta.fileSize)})
            </span>
          </span>
        </div>
      )}

      {template && template.fields.length > 0 && (
        <fieldset className="space-y-4 border-t border-line pt-4">
          <legend className="sr-only">
            {t('dashboard:documents.wizard.step-2.template-fields-heading')}
          </legend>
          <h3 className="text-sm font-semibold text-ink">
            {t('dashboard:documents.wizard.step-2.template-fields-heading')}
          </h3>
          {template.fields.map((field) => {
            const name = `values.${field.key}` as const;
            const error = errors.values?.[field.key]?.message;
            return (
              <Field
                key={field.key}
                id={name}
                label={t(field.labelKey)}
                required={field.required}
                error={typeof error === 'string' ? error : undefined}
                t={t}
              >
                {field.kind === 'textarea' ? (
                  <Textarea id={name} rows={3} {...form.register(name)} />
                ) : field.kind === 'date' ? (
                  <Input id={name} type="date" {...form.register(name)} />
                ) : field.kind === 'employee' ? (
                  <Combobox
                    id={name}
                    options={employeeOptions}
                    value={form.watch(name) || null}
                    onChange={(v) =>
                      form.setValue(name, v, { shouldDirty: true, shouldValidate: true })
                    }
                  />
                ) : (
                  <Input id={name} {...form.register(name)} />
                )}
              </Field>
            );
          })}
        </fieldset>
      )}
    </div>
  );

  return (
    <form id={FORM_ID} onSubmit={form.handleSubmit(onSubmit)} noValidate>
      {template ? (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {formFields}
          {/* Live A4 preview — re-renders per keystroke via the watch above */}
          <div className="space-y-2">
            <h3 className="text-sm font-semibold text-ink">
              {t('dashboard:documents.wizard.step-2.preview-title')}
            </h3>
            <div className="rounded-lg border border-line bg-white p-6 shadow-sm md:p-8">
              <p className="text-center text-sm font-semibold text-ink">
                {watchedTitle || '«—»'}
              </p>
              <p className="mt-4 whitespace-pre-wrap text-sm leading-relaxed text-ink">
                {previewBody}
              </p>
            </div>
            <p className="text-xs text-muted-foreground">
              {t('dashboard:documents.wizard.step-2.preview-hint')}
            </p>
          </div>
        </div>
      ) : (
        formFields
      )}
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
      {error && <p className="text-xs text-destructive">{t(error)}</p>}
    </div>
  );
}

export { FORM_ID as STEP2_FORM_ID };
