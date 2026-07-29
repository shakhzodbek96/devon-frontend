import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { Info, Loader2 } from 'lucide-react';

import ResponsiveDialog from '@/components/common/ResponsiveDialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Textarea } from '@/components/ui/textarea';
import { decideApproval, DocumentValidationError, MockNetworkError } from '@/lib/data/documents';
import type { ApprovalDecision } from '@/types/domain';

export type Decision = Exclude<ApprovalDecision, 'PENDING'>;

const DECISIONS: Decision[] = ['APPROVED', 'APPROVED_WITH_COMMENT', 'REJECTED'];

/** RejectDialog convention from step 12. */
const MIN_REJECT_COMMENT = 5;

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  documentUuid: string;
  actorUuid: string;
  /** Which action button opened the dialog — preselected, still changeable. */
  initialDecision: Decision;
  onDone: () => void;
}

export default function DecideDialog({
  open,
  onOpenChange,
  documentUuid,
  actorUuid,
  initialDecision,
  onDone,
}: Props) {
  const { t } = useTranslation(['dashboard', 'common']);
  const [decision, setDecision] = useState<Decision>(initialDecision);
  const [comment, setComment] = useState('');
  const [commentError, setCommentError] = useState(false);
  const [busy, setBusy] = useState(false);

  // Fresh state per opening (and per originating button).
  useEffect(() => {
    if (open) {
      setDecision(initialDecision);
      setComment('');
      setCommentError(false);
    }
  }, [open, initialDecision]);

  async function submit() {
    if (decision === 'REJECTED' && comment.trim().length < MIN_REJECT_COMMENT) {
      setCommentError(true);
      return;
    }
    setCommentError(false);
    setBusy(true);
    try {
      await decideApproval(documentUuid, actorUuid, decision, comment.trim() || undefined);
      toast.success(
        t(
          decision === 'REJECTED'
            ? 'dashboard:documents.detail.toast.rejected'
            : 'dashboard:documents.detail.toast.approved',
        ),
      );
      onOpenChange(false);
      onDone();
    } catch (err) {
      if (err instanceof DocumentValidationError) {
        toast.error(t(`dashboard:documents.errors.${err.code}`));
        // Policy errors (out-of-order, already-decided) won't clear on retry —
        // close so the refetched page shows the real state.
        onOpenChange(false);
        onDone();
      } else if (err instanceof MockNetworkError) {
        toast.error(t('common:errors.network'));
      } else {
        toast.error(t('common:errors.unknown'));
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <ResponsiveDialog
      open={open}
      onOpenChange={onOpenChange}
      title={t('dashboard:documents.detail.decide.title')}
      description={t('dashboard:documents.detail.decide.description')}
      footer={
        <>
          <Button variant="outline" disabled={busy} onClick={() => onOpenChange(false)}>
            {t('common:actions.cancel')}
          </Button>
          <Button disabled={busy} onClick={submit}>
            {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {t('dashboard:documents.detail.decide.cta')}
          </Button>
        </>
      }
    >
      <div className="space-y-5">
        <RadioGroup
          value={decision}
          onValueChange={(v) => {
            setDecision(v as Decision);
            setCommentError(false);
          }}
          className="space-y-2"
        >
          {DECISIONS.map((d) => (
            <Label
              key={d}
              htmlFor={`decision-${d}`}
              className="flex cursor-pointer items-start gap-3 rounded-lg border border-line bg-surface p-3 has-[[data-state=checked]]:border-primary has-[[data-state=checked]]:bg-brand-soft/30"
            >
              <RadioGroupItem id={`decision-${d}`} value={d} className="mt-0.5" />
              <span className="min-w-0">
                <span className="block text-sm font-medium text-ink">
                  {t(`dashboard:documents.detail.decide.option.${d}`)}
                </span>
                <span className="mt-0.5 block text-xs leading-relaxed font-normal text-muted-foreground">
                  {t(`dashboard:documents.detail.decide.option-hint.${d}`)}
                </span>
              </span>
            </Label>
          ))}
        </RadioGroup>

        <div className="space-y-2">
          <Label htmlFor="decide-comment">
            {t('dashboard:documents.detail.decide.comment-label')}{' '}
            {decision === 'REJECTED' && <span className="text-destructive">*</span>}
          </Label>
          <Textarea
            id="decide-comment"
            rows={3}
            value={comment}
            onChange={(e) => {
              setComment(e.target.value);
              setCommentError(false);
            }}
            placeholder={t('dashboard:documents.detail.decide.comment-placeholder')}
          />
          {commentError && (
            <p className="text-xs text-destructive">
              {t('dashboard:documents.detail.decide.comment-required')}
            </p>
          )}
        </div>

        {decision === 'REJECTED' && (
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              {t('dashboard:documents.detail.decide.reject-consequence')}
            </AlertDescription>
          </Alert>
        )}
      </div>
    </ResponsiveDialog>
  );
}
