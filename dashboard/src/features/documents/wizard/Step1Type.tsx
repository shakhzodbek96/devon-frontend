import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FileText, FileUp, Info, LayoutTemplate, Upload, X } from 'lucide-react';

import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { formatBytes } from '@/lib/format';
import { listDocumentTemplates } from '@/lib/data/documents';
import { cn } from '@/lib/utils';
import type { DocumentSource, DocumentTemplate } from '@/types/domain';

import {
  DOC_FILE_EXTENSIONS,
  DOC_FILE_MIME_TYPES,
  MAX_DOC_FILE_SIZE_BYTES,
} from './document.schema';
import { useDocWizardStore } from './doc-wizard-store';

const FORM_ID = 'doc-wizard-step-1';

function isAllowed(file: File): boolean {
  if ((DOC_FILE_MIME_TYPES as readonly string[]).includes(file.type)) return true;
  // Some browsers/OSes leave File.type empty — fall back to the extension.
  if (file.type === '') {
    const name = file.name.toLowerCase();
    return DOC_FILE_EXTENSIONS.some((ext) => name.endsWith(ext));
  }
  return false;
}

function mimeFor(file: File): string {
  if (file.type) return file.type;
  const name = file.name.toLowerCase();
  if (name.endsWith('.pdf')) return 'application/pdf';
  if (name.endsWith('.doc')) return 'application/msword';
  return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
}

export default function Step1Type() {
  const { t } = useTranslation(['dashboard', 'common']);
  const data = useDocWizardStore((s) => s.data);
  // Edit mode: the backend's updateDraftDocument cannot change source or
  // template, so both pickers are locked (the UPLOAD file stays replaceable).
  const locked = useDocWizardStore((s) => s.editing) !== null;
  const setSource = useDocWizardStore((s) => s.setSource);
  const setTemplate = useDocWizardStore((s) => s.setTemplate);
  const setFileMeta = useDocWizardStore((s) => s.setFileMeta);
  const next = useDocWizardStore((s) => s.next);

  const [templates, setTemplates] = useState<DocumentTemplate[] | null>(null);
  const [errorKey, setErrorKey] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const rows = await listDocumentTemplates();
      if (!cancelled) setTemplates(rows);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  function pickSource(source: DocumentSource) {
    setSource(source);
    setErrorKey(null);
  }

  function onPick(file: File | null) {
    if (!file) return;
    if (!isAllowed(file)) {
      setErrorKey('dashboard:documents.wizard.step-1.errors.file-format');
      return;
    }
    if (file.size > MAX_DOC_FILE_SIZE_BYTES) {
      setErrorKey('dashboard:documents.wizard.step-1.errors.file-too-large');
      return;
    }
    setErrorKey(null);
    // Metadata only — the File object is dropped here; the mock backend never
    // stores bytes (same convention as the employee wizard's order extract).
    setFileMeta({ fileName: file.name, fileSize: file.size, mimeType: mimeFor(file) });
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (data.source === 'TEMPLATE' && !data.templateUuid) {
      setErrorKey('dashboard:documents.wizard.step-1.errors.template-required');
      return;
    }
    if (data.source === 'UPLOAD' && !data.fileMeta) {
      setErrorKey('dashboard:documents.wizard.step-1.errors.file-required');
      return;
    }
    setErrorKey(null);
    next();
  }

  return (
    <form id={FORM_ID} onSubmit={onSubmit} className="space-y-6" noValidate>
      {locked && (
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>
            {t('dashboard:documents.wizard.step-1.edit-locked')}
          </AlertDescription>
        </Alert>
      )}

      {/* Source toggle — two large cards (BPMN 3.4 nodes 4–5) */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2" role="radiogroup">
        <SourceCard
          icon={LayoutTemplate}
          selected={data.source === 'TEMPLATE'}
          disabled={locked}
          label={t('dashboard:documents.wizard.step-1.source-template')}
          hint={t('dashboard:documents.wizard.step-1.source-template-hint')}
          onSelect={() => pickSource('TEMPLATE')}
        />
        <SourceCard
          icon={FileUp}
          selected={data.source === 'UPLOAD'}
          disabled={locked}
          label={t('dashboard:documents.wizard.step-1.source-upload')}
          hint={t('dashboard:documents.wizard.step-1.source-upload-hint')}
          onSelect={() => pickSource('UPLOAD')}
        />
      </div>

      {data.source === 'TEMPLATE' && (
        <div className="space-y-2">
          <Label>{t('dashboard:documents.wizard.step-1.template-label')}</Label>
          {!templates && (
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-24 w-full rounded-lg" />
              ))}
            </div>
          )}
          {templates && (
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              {templates.map((tpl) => (
                <button
                  key={tpl.uuid}
                  type="button"
                  disabled={locked}
                  onClick={() => {
                    setTemplate(tpl.uuid);
                    setErrorKey(null);
                  }}
                  aria-pressed={data.templateUuid === tpl.uuid}
                  className={cn(
                    'min-h-16 rounded-lg border p-4 text-left transition-colors',
                    data.templateUuid === tpl.uuid
                      ? 'border-primary bg-brand-soft/40 ring-1 ring-primary'
                      : 'border-line bg-surface hover:bg-surface-2/30',
                    locked && data.templateUuid !== tpl.uuid && 'opacity-50',
                    locked && 'cursor-not-allowed hover:bg-surface',
                  )}
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm font-semibold text-ink">{tpl.nameUz}</p>
                    <Badge variant="secondary" className="shrink-0 text-xs">
                      {t('dashboard:documents.wizard.step-1.fields-count', {
                        n: tpl.fields.length,
                      })}
                    </Badge>
                  </div>
                  <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                    {tpl.descriptionUz}
                  </p>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {data.source === 'UPLOAD' && (
        <div className="space-y-2">
          <Label htmlFor="docFile">
            {t('dashboard:documents.wizard.step-1.file-label')}{' '}
            <span className="text-destructive">*</span>
          </Label>
          <input
            ref={inputRef}
            id="docFile"
            type="file"
            accept=".pdf,.doc,.docx"
            className="hidden"
            onChange={(e) => {
              onPick(e.target.files?.[0] ?? null);
              // Re-picking the same file must re-fire onChange.
              e.target.value = '';
            }}
          />
          {data.fileMeta ? (
            <div className="flex items-center gap-3 rounded-lg border border-line bg-surface px-3 py-2.5">
              <FileText className="h-4 w-4 shrink-0 text-primary" />
              <span className="min-w-0 flex-1 truncate text-sm text-ink">
                {data.fileMeta.fileName}{' '}
                <span className="text-muted-foreground">
                  ({formatBytes(data.fileMeta.fileSize)})
                </span>
              </span>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => inputRef.current?.click()}
              >
                {t('dashboard:documents.wizard.step-1.replace-file')}
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                onClick={() => setFileMeta(null)}
                aria-label={t('dashboard:documents.wizard.step-1.remove-file')}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            <Button type="button" variant="outline" onClick={() => inputRef.current?.click()}>
              <Upload className="mr-2 h-4 w-4" />
              {t('dashboard:documents.wizard.step-1.choose-file')}
            </Button>
          )}
          <p className="text-xs text-muted-foreground">
            {t('dashboard:documents.wizard.step-1.file-hint')}
          </p>
        </div>
      )}

      {errorKey && <p className="text-xs text-destructive">{t(errorKey)}</p>}
    </form>
  );
}

interface SourceCardProps {
  icon: typeof FileText;
  selected: boolean;
  disabled?: boolean;
  label: string;
  hint: string;
  onSelect: () => void;
}

function SourceCard({ icon: Icon, selected, disabled, label, hint, onSelect }: SourceCardProps) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      disabled={disabled}
      onClick={onSelect}
      className={cn(
        'flex min-h-22 items-start gap-3 rounded-lg border p-4 text-left transition-colors',
        selected
          ? 'border-primary bg-brand-soft/40 ring-1 ring-primary'
          : 'border-line bg-surface hover:bg-surface-2/30',
        disabled && !selected && 'opacity-50',
        disabled && 'cursor-not-allowed hover:bg-surface',
      )}
    >
      <span
        className={cn(
          'flex h-10 w-10 shrink-0 items-center justify-center rounded-md',
          selected ? 'bg-primary text-canvas' : 'bg-surface-2 text-primary',
        )}
      >
        <Icon className="h-5 w-5" />
      </span>
      <span className="min-w-0">
        <span className="block text-sm font-semibold text-ink">{label}</span>
        <span className="mt-0.5 block text-xs leading-relaxed text-muted-foreground">{hint}</span>
      </span>
    </button>
  );
}

export { FORM_ID as STEP1_FORM_ID };
