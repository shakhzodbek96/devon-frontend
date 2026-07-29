import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';

import ResponsiveDialog from '@/components/common/ResponsiveDialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { ActingContext } from '@/lib/acting';
import { updateTask, type TaskDetail } from '@/lib/data/tasks';
import type { TaskEntity } from '@/types/domain';

import { todayIso } from '../task.schema';
import { toastTaskError } from '../taskErrors';

export interface ExtendDeadlineDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  task: TaskEntity | TaskDetail;
  acting: ActingContext;
  onDone: () => void;
}

/**
 * UC-08 deadline-only variant — the assigner extends the task deadline. Single
 * date input (min = today, default = current deadline). Standalone.
 */
export default function ExtendDeadlineDialog({
  open,
  onOpenChange,
  task,
  acting,
  onDone,
}: ExtendDeadlineDialogProps) {
  const { t } = useTranslation(['dashboard', 'common']);
  const [deadline, setDeadline] = useState(task.deadline.slice(0, 10));
  const [deadlineError, setDeadlineError] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (open) {
      setDeadline(task.deadline.slice(0, 10));
      setDeadlineError(false);
      setBusy(false);
    }
  }, [open, task.deadline]);

  async function submit() {
    if (!deadline) {
      setDeadlineError(true);
      return;
    }
    setBusy(true);
    try {
      await updateTask(task.uuid, { deadline }, acting.employee.uuid);
      toast.success(t('dashboard:tasks.dialogs.extend.success'));
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
      title={t('dashboard:tasks.dialogs.extend.title')}
      footer={
        <div className="flex w-full flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={busy}>
            {t('common:actions.cancel')}
          </Button>
          <Button type="button" onClick={submit} disabled={busy}>
            {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {t('dashboard:tasks.dialogs.extend.cta')}
          </Button>
        </div>
      }
    >
      <div className="space-y-2">
        <Label htmlFor="extend-deadline">
          {t('dashboard:tasks.dialogs.extend.deadline-label')}{' '}
          <span className="text-destructive">*</span>
        </Label>
        <Input
          id="extend-deadline"
          type="date"
          min={todayIso()}
          value={deadline}
          onChange={(e) => {
            setDeadline(e.target.value);
            setDeadlineError(false);
          }}
        />
        {deadlineError && (
          <p className="text-xs text-destructive">{t('dashboard:tasks.dialogs.extend.err-deadline')}</p>
        )}
      </div>
    </ResponsiveDialog>
  );
}
