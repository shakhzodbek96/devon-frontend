import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Info, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

import ResponsiveDialog from '@/components/common/ResponsiveDialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Textarea } from '@/components/ui/textarea';
import type { ActingContext } from '@/lib/acting';
import { reviewTask, type TaskDetail, type TaskReviewDecision } from '@/lib/data/tasks';
import type { TaskEntity } from '@/types/domain';

import { toastTaskError } from '../taskErrors';

export type ReviewDecision = TaskReviewDecision;

const DECISIONS: ReviewDecision[] = ['ACCEPT', 'ACCEPT_WITH_NOTE', 'RETURN', 'REJECT'];

/** RETURN / REJECT require a reason; same convention as DecideDialog. */
const MIN_REASON = 5;

export interface ReviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  task: TaskEntity | TaskDetail;
  acting: ActingContext;
  /** Which action button opened the dialog — preselected, still changeable. */
  initialDecision?: ReviewDecision;
  onDone: () => void;
}

/**
 * BP-2 6 — the assigner reviews an UNDER_REVIEW deliverable. ACCEPT / ACCEPT_WITH_NOTE
 * close it DONE; RETURN bounces it back to IN_PROGRESS (round++); REJECT terminates it.
 * Standalone so the board (Task 14) can host it on drop-to-DONE / drop-to-REJECTED.
 */
export default function ReviewDialog({
  open,
  onOpenChange,
  task,
  acting,
  initialDecision = 'ACCEPT',
  onDone,
}: ReviewDialogProps) {
  const { t } = useTranslation(['dashboard', 'common']);
  const [decision, setDecision] = useState<ReviewDecision>(initialDecision);
  const [text, setText] = useState('');
  const [textError, setTextError] = useState(false);
  const [busy, setBusy] = useState(false);

  // Fresh state per opening (and per originating button).
  useEffect(() => {
    if (open) {
      setDecision(initialDecision);
      setText('');
      setTextError(false);
      setBusy(false);
    }
  }, [open, initialDecision]);

  const requiresReason = decision === 'RETURN' || decision === 'REJECT';

  async function submit() {
    if (requiresReason && text.trim().length < MIN_REASON) {
      setTextError(true);
      return;
    }
    setTextError(false);
    setBusy(true);
    try {
      await reviewTask(
        task.uuid,
        { decision, text: text.trim() || undefined },
        acting.employee.uuid,
      );
      toast.success(
        t(
          decision === 'RETURN'
            ? 'dashboard:tasks.dialogs.review.success-return'
            : decision === 'REJECT'
              ? 'dashboard:tasks.dialogs.review.success-reject'
              : 'dashboard:tasks.dialogs.review.success-accept',
        ),
      );
      onOpenChange(false);
      onDone();
    } catch (err) {
      toastTaskError(t, err);
    } finally {
      setBusy(false);
    }
  }

  return (
    <ResponsiveDialog
      open={open}
      onOpenChange={onOpenChange}
      title={t('dashboard:tasks.dialogs.review.title')}
      description={t('dashboard:tasks.dialogs.review.description')}
      footer={
        <div className="flex w-full flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button type="button" variant="outline" disabled={busy} onClick={() => onOpenChange(false)}>
            {t('common:actions.cancel')}
          </Button>
          <Button type="button" disabled={busy} onClick={submit}>
            {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {t('dashboard:tasks.dialogs.review.cta')}
          </Button>
        </div>
      }
    >
      <div className="space-y-5">
        <RadioGroup
          value={decision}
          onValueChange={(v) => {
            setDecision(v as ReviewDecision);
            setTextError(false);
          }}
          className="space-y-2"
        >
          {DECISIONS.map((d) => (
            <Label
              key={d}
              htmlFor={`review-${d}`}
              className="flex cursor-pointer items-start gap-3 rounded-lg border border-line bg-surface p-3 has-[[data-state=checked]]:border-primary has-[[data-state=checked]]:bg-brand-soft/30"
            >
              <RadioGroupItem id={`review-${d}`} value={d} className="mt-0.5" />
              <span className="min-w-0">
                <span className="block text-sm font-medium text-ink">
                  {t(`dashboard:tasks.dialogs.review.option.${d}`)}
                </span>
                <span className="mt-0.5 block text-xs leading-relaxed font-normal text-muted-foreground">
                  {t(`dashboard:tasks.dialogs.review.option-hint.${d}`)}
                </span>
              </span>
            </Label>
          ))}
        </RadioGroup>

        {decision === 'ACCEPT_WITH_NOTE' && (
          <div className="space-y-2">
            <Label htmlFor="review-note">{t('dashboard:tasks.dialogs.review.note-label')}</Label>
            <Textarea
              id="review-note"
              rows={3}
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder={t('dashboard:tasks.dialogs.review.note-placeholder')}
            />
          </div>
        )}

        {requiresReason && (
          <>
            <div className="space-y-2">
              <Label htmlFor="review-reason">
                {t('dashboard:tasks.dialogs.review.reason-label')}{' '}
                <span className="text-destructive">*</span>
              </Label>
              <Textarea
                id="review-reason"
                rows={3}
                value={text}
                onChange={(e) => {
                  setText(e.target.value);
                  setTextError(false);
                }}
                placeholder={t('dashboard:tasks.dialogs.review.reason-placeholder')}
              />
              {textError && (
                <p className="text-xs text-destructive">
                  {t('dashboard:tasks.dialogs.review.reason-required')}
                </p>
              )}
            </div>
            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>
                {t(`dashboard:tasks.dialogs.review.consequence-${decision}`)}
              </AlertDescription>
            </Alert>
          </>
        )}
      </div>
    </ResponsiveDialog>
  );
}
