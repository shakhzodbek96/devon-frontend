import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FileText, Upload, X } from 'lucide-react';
import { toast } from 'sonner';

import Combobox, { type ComboboxOption } from '@/components/common/Combobox';
import ResponsiveDialog from '@/components/common/ResponsiveDialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Textarea } from '@/components/ui/textarea';
import { formatBytes } from '@/lib/format';
import { listDocuments } from '@/lib/data/documents';
import { submitLetterExecution } from '@/lib/data/letters';

import { toastLetterError } from './letterErrors';

const MIN_COMMENT = 10;
const MAX_RESPONSE_BYTES = 10 * 1024 * 1024;
const RESPONSE_MIME = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
];
const RESPONSE_EXT = ['.pdf', '.doc', '.docx'];

interface ResponseFile {
  fileName: string;
  fileSize: number;
  mimeType: string;
}

function fileAllowed(file: File): boolean {
  if (RESPONSE_MIME.includes(file.type)) return true;
  if (file.type === '') {
    const name = file.name.toLowerCase();
    return RESPONSE_EXT.some((ext) => name.endsWith(ext));
  }
  return false;
}

function fileMime(file: File): string {
  if (file.type) return file.type;
  return file.name.toLowerCase().endsWith('.pdf') ? 'application/pdf' : 'application/msword';
}

type Mode = 'comment' | 'response';
type ResponseKind = 'file' | 'document';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  letterUuid: string;
  /** Acting employee (the assigned executor) — policy re-validates. */
  actorUuid: string;
  onDone: () => void;
}

/**
 * BPMN 3.3 node 7 gate — "Ijro yuzasidan hujjat biriktirish talab etiladimi?"
 * Comment-only (7.1) closes the letter without a reply; a response (7.2) is
 * either an uploaded file or one of the executor's own finished documents,
 * linked as `responseDocumentUuid`.
 */
export default function ExecuteDialog({
  open,
  onOpenChange,
  letterUuid,
  actorUuid,
  onDone,
}: Props) {
  const { t } = useTranslation(['dashboard', 'common']);
  const fileRef = useRef<HTMLInputElement>(null);

  const [mode, setMode] = useState<Mode>('response');
  const [comment, setComment] = useState('');
  const [commentError, setCommentError] = useState(false);
  const [responseKind, setResponseKind] = useState<ResponseKind>('file');
  const [file, setFile] = useState<ResponseFile | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [docUuid, setDocUuid] = useState<string | null>(null);
  const [docOptions, setDocOptions] = useState<ComboboxOption[]>([]);
  const [responseError, setResponseError] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    setMode('response');
    setComment('');
    setCommentError(false);
    setResponseKind('file');
    setFile(null);
    setFileError(null);
    setDocUuid(null);
    setResponseError(false);
    setBusy(false);
    let cancelled = false;
    void (async () => {
      // The executor links one of their own finished documents as the reply.
      const docs = await listDocuments({ creatorUuid: actorUuid });
      if (cancelled) return;
      setDocOptions(
        docs
          .filter((d) => d.status === 'SIGNED' || d.status === 'CLOSED')
          .map((d) => ({ value: d.uuid, label: d.number, sublabel: d.title })),
      );
    })();
    return () => {
      cancelled = true;
    };
  }, [open, actorUuid]);

  function onPickFile(picked: File | null) {
    if (!picked) return;
    if (!fileAllowed(picked)) {
      setFileError(t('dashboard:letters.detail.execute.file-format'));
      return;
    }
    if (picked.size > MAX_RESPONSE_BYTES) {
      setFileError(t('dashboard:letters.detail.execute.file-too-large'));
      return;
    }
    setFileError(null);
    setResponseError(false);
    // Metadata only (order-extract convention) — the File object is dropped.
    setFile({ fileName: picked.name, fileSize: picked.size, mimeType: fileMime(picked) });
  }

  async function submit() {
    if (mode === 'comment') {
      if (comment.trim().length < MIN_COMMENT) {
        setCommentError(true);
        return;
      }
    } else if (responseKind === 'file' && !file) {
      setResponseError(true);
      return;
    } else if (responseKind === 'document' && !docUuid) {
      setResponseError(true);
      return;
    }

    setBusy(true);
    try {
      await submitLetterExecution(
        letterUuid,
        mode === 'comment'
          ? { executionComment: comment.trim() }
          : responseKind === 'file'
            ? { responseFileMeta: file ?? undefined }
            : { responseDocumentUuid: docUuid ?? undefined },
        actorUuid,
      );
      toast.success(t('dashboard:letters.detail.execute.success'));
      onOpenChange(false);
      onDone();
    } catch (err) {
      toastLetterError(t, err);
    } finally {
      setBusy(false);
    }
  }

  return (
    <ResponsiveDialog
      open={open}
      onOpenChange={onOpenChange}
      title={t('dashboard:letters.detail.execute.title')}
      description={t('dashboard:letters.detail.execute.gate-question')}
      footer={
        <div className="flex w-full flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={busy}>
            {t('common:actions.cancel')}
          </Button>
          <Button type="button" onClick={submit} disabled={busy}>
            {t('dashboard:letters.detail.execute.cta')}
          </Button>
        </div>
      }
    >
      <div className="space-y-5">
        <RadioGroup
          value={mode}
          onValueChange={(v) => {
            setMode(v as Mode);
            setCommentError(false);
            setResponseError(false);
          }}
          className="space-y-2"
        >
          {(['response', 'comment'] as Mode[]).map((m) => (
            <Label
              key={m}
              htmlFor={`mode-${m}`}
              className="flex cursor-pointer items-start gap-3 rounded-lg border border-line bg-surface p-3 has-[[data-state=checked]]:border-primary has-[[data-state=checked]]:bg-brand-soft/30"
            >
              <RadioGroupItem id={`mode-${m}`} value={m} className="mt-0.5" />
              <span className="min-w-0">
                <span className="block text-sm font-medium text-ink">
                  {t(`dashboard:letters.detail.execute.mode-${m}`)}
                </span>
                <span className="mt-0.5 block text-xs font-normal text-muted-foreground">
                  {t(`dashboard:letters.detail.execute.mode-${m}-hint`)}
                </span>
              </span>
            </Label>
          ))}
        </RadioGroup>

        {mode === 'comment' ? (
          <div className="space-y-2">
            <Label htmlFor="execute-comment">
              {t('dashboard:letters.detail.execute.comment-label')}{' '}
              <span className="text-destructive">*</span>
            </Label>
            <Textarea
              id="execute-comment"
              rows={4}
              value={comment}
              onChange={(e) => {
                setComment(e.target.value);
                setCommentError(false);
              }}
              placeholder={t('dashboard:letters.detail.execute.comment-placeholder')}
            />
            {commentError && (
              <p className="text-xs text-destructive">
                {t('dashboard:letters.detail.execute.comment-required')}
              </p>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            <RadioGroup
              value={responseKind}
              onValueChange={(v) => {
                setResponseKind(v as ResponseKind);
                setResponseError(false);
              }}
              className="flex flex-col gap-2 sm:flex-row"
            >
              {(['file', 'document'] as ResponseKind[]).map((k) => (
                <Label
                  key={k}
                  htmlFor={`kind-${k}`}
                  className="flex flex-1 cursor-pointer items-center gap-2 rounded-lg border border-line bg-surface p-3 text-sm has-[[data-state=checked]]:border-primary has-[[data-state=checked]]:bg-brand-soft/30"
                >
                  <RadioGroupItem id={`kind-${k}`} value={k} />
                  {t(`dashboard:letters.detail.execute.kind-${k}`)}
                </Label>
              ))}
            </RadioGroup>

            {responseKind === 'file' ? (
              <div className="space-y-2">
                <input
                  ref={fileRef}
                  type="file"
                  accept=".pdf,.doc,.docx"
                  className="hidden"
                  onChange={(e) => {
                    onPickFile(e.target.files?.[0] ?? null);
                    e.target.value = '';
                  }}
                />
                {file ? (
                  <div className="flex items-center gap-3 rounded-lg border border-line bg-surface px-3 py-2.5">
                    <FileText className="h-4 w-4 shrink-0 text-primary" />
                    <span className="min-w-0 flex-1 truncate text-sm text-ink">
                      {file.fileName}{' '}
                      <span className="text-muted-foreground">({formatBytes(file.fileSize)})</span>
                    </span>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => fileRef.current?.click()}
                    >
                      {t('dashboard:letters.detail.execute.replace-file')}
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => setFile(null)}
                      aria-label={t('dashboard:letters.detail.execute.remove-file')}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ) : (
                  <Button type="button" variant="outline" onClick={() => fileRef.current?.click()}>
                    <Upload className="mr-2 h-4 w-4" />
                    {t('dashboard:letters.detail.execute.choose-file')}
                  </Button>
                )}
                <p className="text-xs text-muted-foreground">
                  {t('dashboard:letters.detail.execute.file-hint')}
                </p>
                {fileError && <p className="text-xs text-destructive">{fileError}</p>}
              </div>
            ) : (
              <div className="space-y-2">
                <Label>{t('dashboard:letters.detail.execute.field-document')}</Label>
                <Combobox
                  options={docOptions}
                  value={docUuid}
                  onChange={(v) => {
                    setDocUuid(v);
                    setResponseError(false);
                  }}
                  placeholder={t('dashboard:letters.detail.execute.document-placeholder')}
                  emptyMessage={t('dashboard:letters.detail.execute.no-documents')}
                />
              </div>
            )}

            {responseError && (
              <p className="text-xs text-destructive">
                {t('dashboard:letters.detail.execute.response-required')}
              </p>
            )}
          </div>
        )}
      </div>
    </ResponsiveDialog>
  );
}
