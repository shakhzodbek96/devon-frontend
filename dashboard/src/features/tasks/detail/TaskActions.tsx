import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import {
  Check,
  CheckCheck,
  Clock,
  Info,
  Loader2,
  MessageSquarePlus,
  MessageSquareReply,
  PenLine,
  Play,
  RotateCcw,
  Send,
  X,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import type { ActingContext } from '@/lib/acting';
import { startTask, type TaskDetail } from '@/lib/data/tasks';

import { toastTaskError } from '../taskErrors';
import ClarificationDialog from './ClarificationDialog';
import EditTaskDialog from './EditTaskDialog';
import ExtendDeadlineDialog from './ExtendDeadlineDialog';
import ReviewDialog, { type ReviewDecision } from './ReviewDialog';
import SubmitDeliverableDialog from './SubmitDeliverableDialog';

interface Props {
  task: TaskDetail;
  acting: ActingContext;
  /** Refetch the detail after any state-changing action. */
  onChanged: () => void;
}

/**
 * Status- and persona-aware action bar (BP-2). Renders only what the policy
 * layer would allow — the backend re-validates every call, so this is a
 * convenience, not the gate (CLAUDE.md: never rely on UI hiding alone). Clones
 * DocumentActions; hosts all 5 lifecycle dialogs locally.
 */
export default function TaskActions({ task, acting, onChanged }: Props) {
  const { t } = useTranslation(['dashboard', 'common']);

  const [busy, setBusy] = useState(false);
  const [submitOpen, setSubmitOpen] = useState(false);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [reviewInitial, setReviewInitial] = useState<ReviewDecision>('ACCEPT');
  const [requestOpen, setRequestOpen] = useState(false);
  const [replyOpen, setReplyOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [extendOpen, setExtendOpen] = useState(false);

  const isAssignee = acting.employee.uuid === task.assigneeUuid;
  const isAssigner = acting.employee.uuid === task.assignerUuid;
  const isTerminal = task.status === 'DONE' || task.status === 'REJECTED';

  // hasOpenClarification: the last CLARIFICATION_REQUEST has no later REPLY.
  const lastRequestIdx = task.comments.reduce(
    (acc, c, i) => (c.kind === 'CLARIFICATION_REQUEST' ? i : acc),
    -1,
  );
  const lastReplyIdx = task.comments.reduce(
    (acc, c, i) => (c.kind === 'CLARIFICATION_REPLY' ? i : acc),
    -1,
  );
  const hasOpenClarification = lastRequestIdx > -1 && lastRequestIdx > lastReplyIdx;

  async function onStart() {
    setBusy(true);
    try {
      await startTask(task.uuid, acting.employee.uuid);
      toast.success(t('dashboard:tasks.actions.start-success'));
      onChanged();
    } catch (err) {
      toastTaskError(t, err);
    } finally {
      setBusy(false);
    }
  }

  function openReview(initial: ReviewDecision) {
    setReviewInitial(initial);
    setReviewOpen(true);
  }

  // Persona × state action availability.
  const canStart = isAssignee && task.status === 'NEW';
  const canSubmit = isAssignee && task.status === 'IN_PROGRESS';
  const canRequestClarification = isAssignee && task.status === 'IN_PROGRESS';
  const canReview = isAssigner && task.status === 'UNDER_REVIEW';
  const canEdit = isAssigner && !isTerminal;
  const canReply = isAssigner && hasOpenClarification && !isTerminal;

  // Non-actor waiting party: assignee for NEW/IN_PROGRESS, assigner for UNDER_REVIEW.
  const waitingName =
    task.status === 'UNDER_REVIEW' ? task.assignerName : task.assigneeName;
  const showWaitingHint = !isTerminal && !canStart && !canSubmit && !canReview && !canReply && !canEdit;

  const hasActions =
    canStart || canSubmit || canRequestClarification || canReview || canEdit || canReply;

  return (
    <div className="flex flex-col gap-3">
      {hasActions && (
        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
          {/* Assignee · NEW → Boshlash (inline) */}
          {canStart && (
            <Button onClick={onStart} disabled={busy} className="w-full sm:w-auto">
              {busy ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Play className="mr-2 h-4 w-4" />
              )}
              {t('dashboard:tasks.actions.start')}
            </Button>
          )}

          {/* Assignee · IN_PROGRESS → Topshirish + Izoh so'rash */}
          {canSubmit && (
            <Button onClick={() => setSubmitOpen(true)} className="w-full sm:w-auto">
              <Send className="mr-2 h-4 w-4" />
              {t('dashboard:tasks.actions.submit')}
            </Button>
          )}
          {canRequestClarification && (
            <Button
              variant="outline"
              onClick={() => setRequestOpen(true)}
              className="w-full sm:w-auto"
            >
              <MessageSquarePlus className="mr-2 h-4 w-4" />
              {t('dashboard:tasks.actions.request-clarification')}
            </Button>
          )}

          {/* Assigner · UNDER_REVIEW → 4 review decisions */}
          {canReview && (
            <>
              <Button onClick={() => openReview('ACCEPT')} className="w-full sm:w-auto">
                <Check className="mr-2 h-4 w-4" />
                {t('dashboard:tasks.actions.accept')}
              </Button>
              <Button
                variant="outline"
                onClick={() => openReview('ACCEPT_WITH_NOTE')}
                className="w-full sm:w-auto"
              >
                <CheckCheck className="mr-2 h-4 w-4" />
                {t('dashboard:tasks.actions.accept-note')}
              </Button>
              <Button
                variant="outline"
                onClick={() => openReview('RETURN')}
                className="w-full sm:w-auto"
              >
                <RotateCcw className="mr-2 h-4 w-4" />
                {t('dashboard:tasks.actions.return')}
              </Button>
              <Button
                variant="outline"
                onClick={() => openReview('REJECT')}
                className="w-full text-destructive hover:text-destructive sm:w-auto"
              >
                <X className="mr-2 h-4 w-4" />
                {t('dashboard:tasks.actions.reject')}
              </Button>
            </>
          )}

          {/* Assigner · open clarification → Javob berish */}
          {canReply && (
            <Button
              variant="outline"
              onClick={() => setReplyOpen(true)}
              className="w-full sm:w-auto"
            >
              <MessageSquareReply className="mr-2 h-4 w-4" />
              {t('dashboard:tasks.actions.answer')}
            </Button>
          )}

          {/* Assigner · non-terminal → Tahrirlash + Muddatni uzaytirish */}
          {canEdit && (
            <>
              <Button
                variant="outline"
                onClick={() => setEditOpen(true)}
                className="w-full sm:w-auto"
              >
                <PenLine className="mr-2 h-4 w-4" />
                {t('dashboard:tasks.actions.edit')}
              </Button>
              <Button
                variant="outline"
                onClick={() => setExtendOpen(true)}
                className="w-full sm:w-auto"
              >
                <Clock className="mr-2 h-4 w-4" />
                {t('dashboard:tasks.actions.extend')}
              </Button>
            </>
          )}
        </div>
      )}

      {/* Non-actor waiting hint */}
      {showWaitingHint && (
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          <Info className="h-4 w-4 shrink-0" aria-hidden />
          {t('dashboard:tasks.actions.waiting', { name: waitingName })}
        </p>
      )}

      {/* Terminal closing line */}
      {isTerminal && (
        <p className="text-sm text-muted-foreground">
          {t(
            task.status === 'DONE'
              ? 'dashboard:tasks.actions.done-closed'
              : 'dashboard:tasks.actions.rejected-closed',
          )}
        </p>
      )}

      <SubmitDeliverableDialog
        open={submitOpen}
        onOpenChange={setSubmitOpen}
        task={task}
        acting={acting}
        onDone={onChanged}
      />
      <ReviewDialog
        open={reviewOpen}
        onOpenChange={setReviewOpen}
        task={task}
        acting={acting}
        initialDecision={reviewInitial}
        onDone={onChanged}
      />
      <ClarificationDialog
        open={requestOpen}
        onOpenChange={setRequestOpen}
        task={task}
        acting={acting}
        mode="request"
        onDone={onChanged}
      />
      <ClarificationDialog
        open={replyOpen}
        onOpenChange={setReplyOpen}
        task={task}
        acting={acting}
        mode="reply"
        onDone={onChanged}
      />
      <EditTaskDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        task={task}
        acting={acting}
        onDone={onChanged}
      />
      <ExtendDeadlineDialog
        open={extendOpen}
        onOpenChange={setExtendOpen}
        task={task}
        acting={acting}
        onDone={onChanged}
      />
    </div>
  );
}
