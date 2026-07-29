import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { Loader2, Send, X } from 'lucide-react';

import WizardStepper from '@/components/common/WizardStepper';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useActingEmployee } from '@/lib/acting';
import {
  createDocument,
  DocumentValidationError,
  getDocument,
  MockNetworkError,
  submitDocumentForReview,
  updateDraftDocument,
  type CreateDocumentInput,
  type UpdateDraftDocumentInput,
} from '@/lib/data/documents';

import { type DocWizardData, TOTAL_STEPS, useDocWizardStore } from './doc-wizard-store';
import Step1Type, { STEP1_FORM_ID } from './Step1Type';
import Step2Content, { STEP2_FORM_ID } from './Step2Content';
import Step3Approvers, { STEP3_FORM_ID } from './Step3Approvers';
import Step4Review from './Step4Review';

const STEP_FORM_IDS: Record<number, string | null> = {
  0: STEP1_FORM_ID,
  1: STEP2_FORM_ID,
  2: STEP3_FORM_ID,
  3: null, // review — no inline form
};

const STEPS = [
  { key: '1', titleKey: 'dashboard:documents.wizard.step-1.title' },
  { key: '2', titleKey: 'dashboard:documents.wizard.step-2.title' },
  { key: '3', titleKey: 'dashboard:documents.wizard.step-3.title' },
  { key: 'r', titleKey: 'dashboard:documents.wizard.review.title' },
] as const;

function buildInput(data: DocWizardData): CreateDocumentInput {
  return {
    title: data.content.title,
    source: data.source,
    templateUuid: data.source === 'TEMPLATE' ? (data.templateUuid ?? undefined) : undefined,
    values: data.source === 'TEMPLATE' ? data.content.values : undefined,
    fileMeta: data.source === 'UPLOAD' && data.fileMeta ? data.fileMeta : undefined,
    confidentiality: data.content.confidentiality,
    recipientUuid: data.content.recipientUuid,
    signerUuid: data.content.signerUuid || undefined,
    requiresApproval: data.requiresApproval,
    participantUuids: data.requiresApproval ? data.participantUuids : undefined,
  };
}

/** Edit mode — source/template/requiresApproval are locked, the rest patches. */
function buildPatch(data: DocWizardData): UpdateDraftDocumentInput {
  return {
    title: data.content.title,
    values: data.source === 'TEMPLATE' ? data.content.values : undefined,
    fileMeta: data.source === 'UPLOAD' && data.fileMeta ? data.fileMeta : undefined,
    recipientUuid: data.content.recipientUuid,
    signerUuid: data.content.signerUuid || null,
    confidentiality: data.content.confidentiality,
    participantUuids: data.requiresApproval ? data.participantUuids : undefined,
  };
}

export default function DocumentWizardPage() {
  const { t } = useTranslation(['dashboard', 'common']);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const acting = useActingEmployee();
  const current = useDocWizardStore((s) => s.current);
  const data = useDocWizardStore((s) => s.data);
  const editing = useDocWizardStore((s) => s.editing);
  const prev = useDocWizardStore((s) => s.prev);
  const isDirty = useDocWizardStore((s) => s.isDirty);
  const hydrate = useDocWizardStore((s) => s.hydrate);
  const reset = useDocWizardStore((s) => s.reset);

  const [busy, setBusy] = useState<'draft' | 'review' | null>(null);
  // Survives a network flake between create and submit-for-review: the retry
  // must not create a second document. (Edit mode needs no guard — repeating
  // updateDraftDocument is harmless.)
  const [createdUuid, setCreatedUuid] = useState<string | null>(null);

  const editUuid = searchParams.get('edit');
  const actingUuid = acting?.employee.uuid;
  const hydrating = editUuid !== null && editing?.uuid !== editUuid;

  // `?edit=<uuid>` — hydrate the store from the existing document. Policy
  // mirror of updateDraftDocument: only the creator's own DRAFT/REJECTED.
  useEffect(() => {
    if (!actingUuid) return;
    if (!editUuid) {
      // Entering create mode with a stale edit session left in the store.
      if (useDocWizardStore.getState().editing) reset();
      return;
    }
    if (useDocWizardStore.getState().editing?.uuid === editUuid) return;
    let cancelled = false;
    void (async () => {
      try {
        const detail = await getDocument(editUuid);
        if (cancelled) return;
        const doc = detail?.document;
        if (
          !doc ||
          (doc.status !== 'DRAFT' && doc.status !== 'REJECTED') ||
          doc.creatorUuid !== actingUuid
        ) {
          toast.error(t('dashboard:documents.errors.not-editable'));
          navigate('/documents', { replace: true });
          return;
        }
        // The upcoming round's chain: for a DRAFT that's the current round;
        // after a rejection it's round+1 if already re-built, else the halted
        // round's order — exactly updateDraftDocument's semantics.
        const ofRound = (round: number) =>
          detail.steps
            .filter((s) => s.round === round)
            .sort((a, b) => a.order - b.order)
            .map((s) => s.employeeUuid);
        let participantUuids: string[] = [];
        if (doc.requiresApproval) {
          participantUuids =
            doc.status === 'DRAFT'
              ? ofRound(doc.round)
              : ofRound(doc.round + 1).length > 0
                ? ofRound(doc.round + 1)
                : ofRound(doc.round);
        }
        hydrate(
          {
            source: doc.source,
            templateUuid: doc.templateUuid ?? null,
            fileMeta: doc.fileMeta
              ? {
                  fileName: doc.fileMeta.fileName,
                  fileSize: doc.fileMeta.fileSize,
                  mimeType: doc.fileMeta.mimeType,
                }
              : null,
            content: {
              title: doc.title,
              recipientUuid: doc.recipientUuid,
              signerUuid: doc.signerUuid ?? '',
              confidentiality: doc.confidentiality,
              values: doc.values ?? {},
            },
            requiresApproval: doc.requiresApproval,
            participantUuids,
          },
          { uuid: doc.uuid, number: doc.number },
        );
      } catch {
        if (!cancelled) {
          toast.error(t('common:errors.network'));
          navigate('/documents', { replace: true });
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [editUuid, actingUuid, hydrate, reset, navigate, t]);

  function onClose() {
    if (isDirty() && !window.confirm(t('dashboard:documents.wizard.confirm-close'))) {
      return;
    }
    const target = editing ? `/documents/${editing.uuid}` : '/documents';
    reset();
    navigate(target);
  }

  function toastError(err: unknown) {
    if (err instanceof DocumentValidationError) {
      toast.error(t(`dashboard:documents.errors.${err.code}`));
    } else if (err instanceof MockNetworkError) {
      toast.error(t('common:errors.network'));
    } else {
      toast.error(t('common:errors.unknown'));
    }
  }

  async function onSaveDraft() {
    if (!acting) return;
    setBusy('draft');
    try {
      if (editing) {
        const doc = await updateDraftDocument(editing.uuid, buildPatch(data), acting.employee.uuid);
        toast.success(t('dashboard:documents.wizard.toast-updated', { number: doc.number }));
        reset();
        navigate(`/documents/${doc.uuid}`);
      } else {
        const doc = await createDocument(buildInput(data), acting.employee.uuid);
        toast.success(
          t('dashboard:documents.wizard.toast-draft-saved', { number: doc.number }),
        );
        reset();
        navigate('/documents');
      }
    } catch (err) {
      toastError(err);
    } finally {
      setBusy(null);
    }
  }

  async function onSubmitForReview() {
    if (!acting) return;
    setBusy('review');
    try {
      let uuid: string;
      if (editing) {
        await updateDraftDocument(editing.uuid, buildPatch(data), acting.employee.uuid);
        uuid = editing.uuid;
      } else {
        let created = createdUuid;
        if (!created) {
          const doc = await createDocument(buildInput(data), acting.employee.uuid);
          created = doc.uuid;
          setCreatedUuid(doc.uuid);
        }
        uuid = created;
      }
      const doc = await submitDocumentForReview(uuid, acting.employee.uuid);
      toast.success(
        t(
          data.requiresApproval
            ? 'dashboard:documents.wizard.toast-sent-for-review'
            : 'dashboard:documents.wizard.toast-submitted',
          { number: doc.number },
        ),
      );
      reset();
      setCreatedUuid(null);
      navigate(`/documents/${doc.uuid}`);
    } catch (err) {
      // Draft stays in the store (and `createdUuid` survives) — retryable.
      toastError(err);
    } finally {
      setBusy(null);
    }
  }

  const activeFormId = STEP_FORM_IDS[current];
  const isReview = current === TOTAL_STEPS - 1;
  const title = editing
    ? t('dashboard:documents.wizard.edit-title')
    : t('dashboard:documents.wizard.title');
  const subtitle = editing
    ? t('dashboard:documents.wizard.edit-subtitle', { number: editing.number })
    : t('dashboard:documents.wizard.subtitle');

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
        <h1 className="truncate text-base font-semibold text-ink">{title}</h1>
      </header>

      {/* Desktop header */}
      <header className="hidden items-center justify-between border-b border-line bg-surface px-6 py-4 md:flex">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-ink">{title}</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">{subtitle}</p>
        </div>
        <Button variant="ghost" onClick={onClose}>
          {t('common:actions.cancel')}
        </Button>
      </header>

      <div className="flex flex-1 flex-col md:px-6 md:py-8">
        <div className="flex w-full flex-1 flex-col md:rounded-xl md:border md:border-line md:bg-surface md:shadow-sm">
          <WizardStepper
            steps={STEPS}
            current={current}
            ariaLabelKey="dashboard:documents.wizard.stepper-label"
          />

          <div className="flex-1 overflow-y-auto px-4 py-6 md:px-8">
            {hydrating ? (
              <div className="space-y-4">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} className="h-10 w-full rounded-lg" />
                ))}
              </div>
            ) : (
              <>
                {current === 0 && <Step1Type />}
                {current === 1 && <Step2Content />}
                {current === 2 && <Step3Approvers />}
                {current === 3 && <Step4Review />}
              </>
            )}
          </div>

          <footer className="pb-safe sticky bottom-0 flex items-center justify-between gap-3 border-t border-line bg-surface px-4 pt-4 md:px-8">
            <Button
              type="button"
              variant="outline"
              onClick={prev}
              disabled={current === 0 || busy !== null}
            >
              {t('common:actions.previous')}
            </Button>
            {isReview ? (
              <div className="flex min-w-0 items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={onSaveDraft}
                  disabled={busy !== null || !acting || createdUuid !== null}
                >
                  {busy === 'draft' && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {editing
                    ? t('common:actions.save')
                    : t('dashboard:documents.wizard.submit-draft')}
                </Button>
                <Button
                  type="button"
                  onClick={onSubmitForReview}
                  disabled={busy !== null || !acting}
                >
                  {busy === 'review' ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="mr-2 h-4 w-4" />
                  )}
                  {t('dashboard:documents.wizard.submit-review')}
                </Button>
              </div>
            ) : activeFormId && !hydrating ? (
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
