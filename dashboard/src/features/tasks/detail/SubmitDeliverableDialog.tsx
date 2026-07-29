import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';

import Combobox, { type ComboboxOption } from '@/components/common/Combobox';
import MetaFileField, { type FileMetaInput } from '@/components/common/MetaFileField';
import ResponsiveDialog from '@/components/common/ResponsiveDialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Textarea } from '@/components/ui/textarea';
import type { ActingContext } from '@/lib/acting';
import { listDocuments } from '@/lib/data/documents';
import { submitDeliverable, type TaskDetail } from '@/lib/data/tasks';
import type { FileMeta, TaskEntity } from '@/types/domain';

import { toastTaskError } from '../taskErrors';

type AttachmentKind = 'file' | 'document' | 'none';

const MIN_SUMMARY = 1;

export interface SubmitDeliverableDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  task: TaskEntity | TaskDetail;
  acting: ActingContext;
  onDone: () => void;
}

/**
 * BP-2 5 — the assignee submits a deliverable (summary + optional file OR one
 * of their own documents). Standalone (open/onOpenChange driven) so it's reused
 * by both the detail page (Task 12) and the board drop-to-UNDER_REVIEW (Task 14).
 * No-attachment submit is allowed but gated behind a two-step confirm.
 */
export default function SubmitDeliverableDialog({
  open,
  onOpenChange,
  task,
  acting,
  onDone,
}: SubmitDeliverableDialogProps) {
  const { t } = useTranslation(['dashboard', 'common']);

  const [summary, setSummary] = useState('');
  const [summaryError, setSummaryError] = useState(false);
  const [kind, setKind] = useState<AttachmentKind>('file');
  const [file, setFile] = useState<FileMetaInput | null>(null);
  const [fileErrorKey, setFileErrorKey] = useState<string | undefined>(undefined);
  const [docUuid, setDocUuid] = useState<string | null>(null);
  const [docOptions, setDocOptions] = useState<ComboboxOption[]>([]);
  const [noAttachmentConfirm, setNoAttachmentConfirm] = useState(false);
  const [busy, setBusy] = useState(false);

  // Fresh state per open (dialog-draft-reset idiom).
  useEffect(() => {
    if (!open) return;
    setSummary('');
    setSummaryError(false);
    setKind('file');
    setFile(null);
    setFileErrorKey(undefined);
    setDocUuid(null);
    setNoAttachmentConfirm(false);
    setBusy(false);
    let cancelled = false;
    void (async () => {
      // The assignee links one of their own documents as the deliverable.
      const docs = await listDocuments({ creatorUuid: acting.employee.uuid });
      if (cancelled) return;
      setDocOptions(docs.map((d) => ({ value: d.uuid, label: d.number, sublabel: d.title })));
    })();
    return () => {
      cancelled = true;
    };
  }, [open, acting.employee.uuid]);

  async function submit() {
    if (summary.trim().length < MIN_SUMMARY) {
      setSummaryError(true);
      return;
    }
    const hasAttachment = (kind === 'file' && file) || (kind === 'document' && docUuid);
    // Two-step confirm before submitting without any attachment.
    if (!hasAttachment && !noAttachmentConfirm) {
      setNoAttachmentConfirm(true);
      return;
    }

    setBusy(true);
    try {
      const fileMeta: FileMeta | undefined =
        kind === 'file' && file
          ? { ...file, uploadedAt: new Date().toISOString() }
          : undefined;
      await submitDeliverable(
        task.uuid,
        {
          summary: summary.trim(),
          file: fileMeta,
          documentUuid: kind === 'document' ? (docUuid ?? undefined) : undefined,
        },
        acting.employee.uuid,
      );
      toast.success(t('dashboard:tasks.dialogs.submit.success'));
      onOpenChange(false);
      onDone();
    } catch (err) {
      toastTaskError(t, err);
    } finally {
      setBusy(false);
    }
  }

  const noAttachment = !((kind === 'file' && file) || (kind === 'document' && docUuid));

  return (
    <ResponsiveDialog
      open={open}
      onOpenChange={onOpenChange}
      title={t('dashboard:tasks.dialogs.submit.title')}
      footer={
        <div className="flex w-full flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={busy}>
            {t('common:actions.cancel')}
          </Button>
          <Button type="button" onClick={submit} disabled={busy}>
            {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {noAttachmentConfirm && noAttachment
              ? t('dashboard:tasks.dialogs.submit.cta-confirm')
              : t('dashboard:tasks.dialogs.submit.cta')}
          </Button>
        </div>
      }
    >
      <div className="space-y-5">
        {/* Summary */}
        <div className="space-y-2">
          <Label htmlFor="submit-summary">
            {t('dashboard:tasks.dialogs.submit.summary')} <span className="text-destructive">*</span>
          </Label>
          <Textarea
            id="submit-summary"
            rows={4}
            value={summary}
            onChange={(e) => {
              setSummary(e.target.value);
              setSummaryError(false);
            }}
            placeholder={t('dashboard:tasks.dialogs.submit.summary-placeholder')}
          />
          {summaryError && (
            <p className="text-xs text-destructive">{t('dashboard:tasks.dialogs.submit.err-summary')}</p>
          )}
        </div>

        {/* Attachment kind */}
        <div className="space-y-2">
          <Label>{t('dashboard:tasks.dialogs.submit.attachment-kind')}</Label>
          <RadioGroup
            value={kind}
            onValueChange={(v) => {
              setKind(v as AttachmentKind);
              setNoAttachmentConfirm(false);
            }}
            className="flex flex-col gap-2 sm:flex-row"
          >
            {(['file', 'document', 'none'] as AttachmentKind[]).map((k) => (
              <Label
                key={k}
                htmlFor={`submit-kind-${k}`}
                className="flex flex-1 cursor-pointer items-center gap-2 rounded-lg border border-line bg-surface p-3 text-sm has-[[data-state=checked]]:border-primary has-[[data-state=checked]]:bg-brand-soft/30"
              >
                <RadioGroupItem id={`submit-kind-${k}`} value={k} />
                {t(`dashboard:tasks.dialogs.submit.kind-${k}`)}
              </Label>
            ))}
          </RadioGroup>
        </div>

        {kind === 'file' && (
          <MetaFileField
            id="submit-file"
            labelKey="dashboard:tasks.dialogs.submit.file-label"
            hintKey="dashboard:tasks.dialogs.submit.file-hint"
            value={file}
            onChange={(meta) => {
              setFile(meta);
              setNoAttachmentConfirm(false);
            }}
            onError={(key) => setFileErrorKey(key)}
            errorKey={fileErrorKey}
            required={false}
          />
        )}

        {kind === 'document' && (
          <div className="space-y-2">
            <Label>{t('dashboard:tasks.dialogs.submit.document-label')}</Label>
            <Combobox
              options={docOptions}
              value={docUuid}
              onChange={(v) => {
                setDocUuid(v);
                setNoAttachmentConfirm(false);
              }}
              placeholder={t('dashboard:tasks.dialogs.submit.document-placeholder')}
              emptyMessage={t('dashboard:tasks.dialogs.submit.no-documents')}
            />
          </div>
        )}

        {noAttachmentConfirm && noAttachment && (
          <p className="text-xs text-amber-600">
            {t('dashboard:tasks.dialogs.submit.no-attachment-confirm')}
          </p>
        )}
      </div>
    </ResponsiveDialog>
  );
}
