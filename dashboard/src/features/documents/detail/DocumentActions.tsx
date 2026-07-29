import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import {
  Check,
  CheckCheck,
  Info,
  Loader2,
  Mail,
  MessageSquarePlus,
  PenLine,
  Printer,
  Send,
  Trash2,
  X,
} from 'lucide-react';

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import {
  acceptDocument,
  deleteDocument,
  DocumentValidationError,
  MockNetworkError,
  submitDocumentForReview,
  type DocumentDetail,
} from '@/lib/data/documents';
import type { Employee } from '@/types/domain';

import DecideDialog, { type Decision } from './DecideDialog';
import EmailDialog from './EmailDialog';

interface Props {
  detail: DocumentDetail;
  /** Acting employee uuid — all mutations run as this persona. */
  actorUuid: string;
  employees: Map<string, Employee>;
  /** Refetch the detail + bump the approvals-queue badge. */
  onChanged: () => void;
}

/**
 * Status- and persona-aware action bar. Renders only what the step-17 policy
 * layer would allow — the backend re-validates every call, so this is a
 * convenience, not the gate (CLAUDE.md: never rely on UI hiding alone).
 */
export default function DocumentActions({ detail, actorUuid, employees, onChanged }: Props) {
  const { t } = useTranslation(['dashboard', 'common']);
  const navigate = useNavigate();
  const doc = detail.document;

  const [busy, setBusy] = useState<'submit' | 'delete' | 'accept' | null>(null);
  const [decideOpen, setDecideOpen] = useState(false);
  const [decideInitial, setDecideInitial] = useState<Decision>('APPROVED');
  const [emailOpen, setEmailOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [acceptOpen, setAcceptOpen] = useState(false);

  const isCreator = doc.creatorUuid === actorUuid;
  const isRecipient = doc.recipientUuid === actorUuid;
  // Strictly-sequential chain: the single actionable step is the first
  // PENDING of the current round.
  const currentStep =
    doc.status === 'IN_REVIEW'
      ? detail.steps
          .filter((s) => s.round === doc.round)
          .find((s) => s.decision === 'PENDING')
      : undefined;

  const canRework = (doc.status === 'DRAFT' || doc.status === 'REJECTED') && isCreator;
  const canDelete = doc.status === 'DRAFT' && isCreator;
  const canDecide = doc.status === 'IN_REVIEW' && currentStep?.employeeUuid === actorUuid;
  // ERI signing (APPROVED -> SIGNED) is milestone F2 — deliberately never
  // true here. A document with a signer simply parks at APPROVED awaiting
  // signature; PLAN_PHASE_F1.md §2/§5: hide the action, never fake a
  // signature. `SignDialog` stays untouched (still mock) but is no longer
  // reachable from this page until F2 wires a real `signDocument`.
  const canSign = false;
  const canAccept = doc.status === 'APPROVED' && !doc.signerUuid && isRecipient;
  const canExport =
    (doc.status === 'SIGNED' || doc.status === 'CLOSED') && (isCreator || isRecipient);

  function toastError(err: unknown) {
    if (err instanceof DocumentValidationError) {
      toast.error(t(`dashboard:documents.errors.${err.code}`));
    } else if (err instanceof MockNetworkError) {
      toast.error(t('common:errors.network'));
    } else {
      toast.error(t('common:errors.unknown'));
    }
  }

  async function submitForReview() {
    setBusy('submit');
    try {
      const next = await submitDocumentForReview(doc.uuid, actorUuid);
      toast.success(
        t(
          next.requiresApproval
            ? 'dashboard:documents.wizard.toast-sent-for-review'
            : 'dashboard:documents.wizard.toast-submitted',
          { number: next.number },
        ),
      );
      onChanged();
    } catch (err) {
      toastError(err);
    } finally {
      setBusy(null);
    }
  }

  async function confirmDelete() {
    setBusy('delete');
    try {
      await deleteDocument(doc.uuid, actorUuid);
      toast.success(t('dashboard:documents.detail.toast.deleted', { number: doc.number }));
      setDeleteOpen(false);
      navigate('/documents');
    } catch (err) {
      toastError(err);
      setBusy(null);
    }
  }

  async function confirmAccept() {
    setBusy('accept');
    try {
      await acceptDocument(doc.uuid, actorUuid);
      toast.success(t('dashboard:documents.detail.toast.accepted'));
      setAcceptOpen(false);
      onChanged();
    } catch (err) {
      toastError(err);
    } finally {
      setBusy(null);
    }
  }

  function openDecide(initial: Decision) {
    setDecideInitial(initial);
    setDecideOpen(true);
  }

  const waitingName = currentStep
    ? (employees.get(currentStep.employeeUuid)?.fullNameGenerated ?? '—')
    : null;

  const showHint = doc.status === 'IN_REVIEW' && !canDecide && waitingName !== null;
  const hasActions =
    canRework || canDecide || canSign || canAccept || canExport;

  if (!hasActions && !showHint) return null;

  return (
    <div className="flex flex-col gap-3 print:hidden">
      {showHint && (
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          <Info className="h-4 w-4 shrink-0" aria-hidden />
          {t('dashboard:documents.detail.turn-hint', { name: waitingName })}
        </p>
      )}

      {hasActions && (
        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
          {canRework && (
            <>
              <Button
                onClick={submitForReview}
                disabled={busy !== null}
                className="w-full sm:w-auto"
              >
                {busy === 'submit' ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Send className="mr-2 h-4 w-4" />
                )}
                {t('dashboard:documents.wizard.submit-review')}
              </Button>
              <Button
                variant="outline"
                disabled={busy !== null}
                onClick={() => navigate(`/documents/new?edit=${doc.uuid}`)}
                className="w-full sm:w-auto"
              >
                <PenLine className="mr-2 h-4 w-4" />
                {t('common:actions.edit')}
              </Button>
            </>
          )}
          {canDelete && (
            <Button
              variant="outline"
              disabled={busy !== null}
              onClick={() => setDeleteOpen(true)}
              className="w-full text-destructive hover:text-destructive sm:w-auto"
            >
              <Trash2 className="mr-2 h-4 w-4" />
              {t('common:actions.delete')}
            </Button>
          )}

          {canDecide && (
            <>
              <Button onClick={() => openDecide('APPROVED')} className="w-full sm:w-auto">
                <Check className="mr-2 h-4 w-4" />
                {t('dashboard:documents.detail.actions.approve')}
              </Button>
              <Button
                variant="outline"
                onClick={() => openDecide('APPROVED_WITH_COMMENT')}
                className="w-full sm:w-auto"
              >
                <MessageSquarePlus className="mr-2 h-4 w-4" />
                {t('dashboard:documents.detail.actions.approve-with-comment')}
              </Button>
              <Button
                variant="outline"
                onClick={() => openDecide('REJECTED')}
                className="w-full text-destructive hover:text-destructive sm:w-auto"
              >
                <X className="mr-2 h-4 w-4" />
                {t('common:actions.reject')}
              </Button>
            </>
          )}

          {canAccept && (
            <Button
              onClick={() => setAcceptOpen(true)}
              disabled={busy !== null}
              className="w-full sm:w-auto"
            >
              <CheckCheck className="mr-2 h-4 w-4" />
              {t('dashboard:documents.detail.actions.accept')}
            </Button>
          )}

          {canExport && (
            <>
              <Button
                variant="outline"
                onClick={() => setEmailOpen(true)}
                className="w-full sm:w-auto"
              >
                <Mail className="mr-2 h-4 w-4" />
                {t('dashboard:documents.detail.actions.email')}
              </Button>
              {doc.source === 'TEMPLATE' && (
                <Button
                  variant="outline"
                  onClick={() => window.print()}
                  className="w-full sm:w-auto"
                >
                  <Printer className="mr-2 h-4 w-4" />
                  {t('dashboard:documents.detail.actions.print')}
                </Button>
              )}
            </>
          )}
        </div>
      )}

      <DecideDialog
        open={decideOpen}
        onOpenChange={setDecideOpen}
        documentUuid={doc.uuid}
        actorUuid={actorUuid}
        initialDecision={decideInitial}
        onDone={onChanged}
      />
      <EmailDialog
        open={emailOpen}
        onOpenChange={setEmailOpen}
        documentUuid={doc.uuid}
        actorUuid={actorUuid}
        onDone={onChanged}
      />

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {t('dashboard:documents.detail.delete.title')}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {t('dashboard:documents.detail.delete.body', { number: doc.number })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={busy !== null}>
              {t('common:actions.cancel')}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                void confirmDelete();
              }}
              disabled={busy !== null}
              className="bg-destructive text-white hover:bg-destructive/90"
            >
              {t('common:actions.delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={acceptOpen} onOpenChange={setAcceptOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {t('dashboard:documents.detail.accept.title')}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {t('dashboard:documents.detail.accept.body', { number: doc.number })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={busy !== null}>
              {t('common:actions.cancel')}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                void confirmAccept();
              }}
              disabled={busy !== null}
            >
              {t('dashboard:documents.detail.actions.accept')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
