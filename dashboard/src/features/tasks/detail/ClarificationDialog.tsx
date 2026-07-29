import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';

import ResponsiveDialog from '@/components/common/ResponsiveDialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import type { ActingContext } from '@/lib/acting';
import { answerClarification, requestClarification, type TaskDetail } from '@/lib/data/tasks';
import type { TaskEntity } from '@/types/domain';

import { toastTaskError } from '../taskErrors';

export type ClarificationMode = 'request' | 'reply';

export interface ClarificationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  task: TaskEntity | TaskDetail;
  acting: ActingContext;
  /** request = assignee asks; reply = assigner answers. */
  mode: ClarificationMode;
  onDone: () => void;
}

/**
 * BP-2 clarification thread (does NOT change task status). Assignee requests a
 * clarification (mode=request); assigner answers it (mode=reply). One required
 * free-text body. Standalone (open/onOpenChange driven).
 */
export default function ClarificationDialog({
  open,
  onOpenChange,
  task,
  acting,
  mode,
  onDone,
}: ClarificationDialogProps) {
  const { t } = useTranslation(['dashboard', 'common']);
  const [body, setBody] = useState('');
  const [bodyError, setBodyError] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (open) {
      setBody('');
      setBodyError(false);
      setBusy(false);
    }
  }, [open]);

  async function submit() {
    if (!body.trim()) {
      setBodyError(true);
      return;
    }
    setBusy(true);
    try {
      if (mode === 'request') {
        await requestClarification(task.uuid, body.trim(), acting.employee.uuid);
        toast.success(t('dashboard:tasks.dialogs.clarification.request-success'));
      } else {
        await answerClarification(task.uuid, body.trim(), acting.employee.uuid);
        toast.success(t('dashboard:tasks.dialogs.clarification.reply-success'));
      }
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
      title={t(
        mode === 'request'
          ? 'dashboard:tasks.dialogs.clarification.request-title'
          : 'dashboard:tasks.dialogs.clarification.reply-title',
      )}
      footer={
        <div className="flex w-full flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={busy}>
            {t('common:actions.cancel')}
          </Button>
          <Button type="button" onClick={submit} disabled={busy}>
            {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {t(
              mode === 'request'
                ? 'dashboard:tasks.dialogs.clarification.request-cta'
                : 'dashboard:tasks.dialogs.clarification.reply-cta',
            )}
          </Button>
        </div>
      }
    >
      <div className="space-y-2">
        <Label htmlFor="clarification-body">
          {t('dashboard:tasks.dialogs.clarification.body-label')}{' '}
          <span className="text-destructive">*</span>
        </Label>
        <Textarea
          id="clarification-body"
          rows={4}
          value={body}
          onChange={(e) => {
            setBody(e.target.value);
            setBodyError(false);
          }}
          placeholder={t(
            mode === 'request'
              ? 'dashboard:tasks.dialogs.clarification.request-placeholder'
              : 'dashboard:tasks.dialogs.clarification.reply-placeholder',
          )}
        />
        {bodyError && (
          <p className="text-xs text-destructive">
            {t('dashboard:tasks.dialogs.clarification.err-body')}
          </p>
        )}
      </div>
    </ResponsiveDialog>
  );
}
