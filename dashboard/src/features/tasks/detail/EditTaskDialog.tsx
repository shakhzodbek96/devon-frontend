import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';

import ResponsiveDialog from '@/components/common/ResponsiveDialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import type { ActingContext } from '@/lib/acting';
import { updateTask, type TaskDetail } from '@/lib/data/tasks';
import type { TaskEntity } from '@/types/domain';

import { editTaskFormSchema, todayIso, type EditTaskForm } from '../task.schema';
import { toastTaskError } from '../taskErrors';

const FORM_ID = 'edit-task-form';
const PRIORITIES = ['HIGH', 'MEDIUM', 'STANDARD'] as const;

export interface EditTaskDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  task: TaskEntity | TaskDetail;
  acting: ActingContext;
  onDone: () => void;
}

/**
 * UC-08 — the assigner edits title / description / priority / deadline while the
 * task is non-terminal. Assignee is never reassigned (omitted from the schema).
 * Standalone (open/onOpenChange driven).
 */
export default function EditTaskDialog({
  open,
  onOpenChange,
  task,
  acting,
  onDone,
}: EditTaskDialogProps) {
  const { t } = useTranslation(['dashboard', 'common']);

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<EditTaskForm>({
    resolver: zodResolver(editTaskFormSchema),
    defaultValues: {
      title: task.title,
      description: task.description,
      priority: task.priority,
      deadline: task.deadline.slice(0, 10),
    },
  });

  // Re-prefill from the current task on each open (dialog-draft-reset idiom).
  useEffect(() => {
    if (open) {
      reset({
        title: task.title,
        description: task.description,
        priority: task.priority,
        deadline: task.deadline.slice(0, 10),
      });
    }
  }, [open, reset, task.title, task.description, task.priority, task.deadline]);

  const priority = watch('priority');

  async function onValid(values: EditTaskForm) {
    try {
      await updateTask(
        task.uuid,
        {
          title: values.title.trim(),
          description: values.description.trim(),
          priority: values.priority,
          deadline: values.deadline,
        },
        acting.employee.uuid,
      );
      toast.success(t('dashboard:tasks.dialogs.edit.success'));
      onOpenChange(false);
      onDone();
    } catch (err) {
      toastTaskError(t, err);
    }
  }

  return (
    <ResponsiveDialog
      open={open}
      onOpenChange={onOpenChange}
      title={t('dashboard:tasks.dialogs.edit.title')}
      footer={
        <div className="flex w-full flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
            {t('common:actions.cancel')}
          </Button>
          <Button type="submit" form={FORM_ID} disabled={isSubmitting}>
            {t('dashboard:tasks.dialogs.edit.cta')}
          </Button>
        </div>
      }
    >
      <form id={FORM_ID} onSubmit={handleSubmit(onValid)} className="space-y-4" noValidate>
        {/* Title */}
        <div className="space-y-2">
          <Label htmlFor="edit-title">
            {t('dashboard:tasks.create.label-title')} <span className="text-destructive">*</span>
          </Label>
          <Input id="edit-title" {...register('title')} />
          {errors.title?.message && (
            <p className="text-xs text-destructive">{t(errors.title.message)}</p>
          )}
        </div>

        {/* Description */}
        <div className="space-y-2">
          <Label htmlFor="edit-description">
            {t('dashboard:tasks.create.label-description')} <span className="text-destructive">*</span>
          </Label>
          <Textarea id="edit-description" rows={3} {...register('description')} />
          {errors.description?.message && (
            <p className="text-xs text-destructive">{t(errors.description.message)}</p>
          )}
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          {/* Priority */}
          <div className="space-y-2">
            <Label>
              {t('dashboard:tasks.create.label-priority')} <span className="text-destructive">*</span>
            </Label>
            <Select
              value={priority}
              onValueChange={(v) =>
                setValue('priority', v as EditTaskForm['priority'], { shouldValidate: true })
              }
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PRIORITIES.map((p) => (
                  <SelectItem key={p} value={p}>
                    {t(`dashboard:tasks.priority.${p}`)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Deadline */}
          <div className="space-y-2">
            <Label htmlFor="edit-deadline">
              {t('dashboard:tasks.create.label-deadline')} <span className="text-destructive">*</span>
            </Label>
            <Input id="edit-deadline" type="date" min={todayIso()} {...register('deadline')} />
            {errors.deadline?.message && (
              <p className="text-xs text-destructive">{t(errors.deadline.message)}</p>
            )}
          </div>
        </div>
      </form>
    </ResponsiveDialog>
  );
}
