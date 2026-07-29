import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';

import Combobox, { type ComboboxOption } from '@/components/common/Combobox';
import MetaFileField, { type FileMetaInput } from '@/components/common/MetaFileField';
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
import { listEmployees } from '@/lib/data/employees';
import { createTask } from '@/lib/data/tasks';
import { listUnits } from '@/lib/data/units';
import type { Employee } from '@/types/domain';

import {
  createTaskFormSchema,
  makeCreateTaskDefaults,
  todayIso,
  type CreateTaskForm as CreateTaskFormValues,
} from './task.schema';
import { toastTaskError } from './taskErrors';

const PRIORITIES = ['HIGH', 'MEDIUM', 'STANDARD'] as const;

interface AssigneeOption extends ComboboxOption {
  status: Employee['status'];
}

interface Props {
  /** Stable id so the page's external "Create" button can submit via `form`. */
  formId: string;
  acting: ActingContext;
  /** Toggle the submitting flag so the page can disable its footer CTA. */
  onSubmittingChange?: (submitting: boolean) => void;
}

export default function CreateTaskForm({ formId, acting, onSubmittingChange }: Props) {
  const { t } = useTranslation(['dashboard', 'common']);
  const navigate = useNavigate();

  const [assigneeOptions, setAssigneeOptions] = useState<AssigneeOption[]>([]);
  const [attachedFile, setAttachedFile] = useState<FileMetaInput | null>(null);
  const [fileErrorKey, setFileErrorKey] = useState<string | undefined>(undefined);
  const [pastDeadlineConfirmed, setPastDeadlineConfirmed] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<CreateTaskFormValues>({
    resolver: zodResolver(createTaskFormSchema),
    defaultValues: makeCreateTaskDefaults(),
  });

  useEffect(() => {
    onSubmittingChange?.(isSubmitting);
  }, [isSubmitting, onSubmittingChange]);

  // Load in-scope assignee options on mount / when acting changes. Uses
  // `employee.primaryUnitUuid` directly (kept in lockstep with the
  // authoritative primary Assignment row by `EmployeeService::transfer` /
  // `EmployeesSeeder` — see PLAN_PHASE_H.md §5) rather than a dedicated
  // assignments listing — there is no org-wide `/assignments` endpoint
  // against the real backend, only the per-employee
  // `GET /employees/{uuid}/assignments` (`src/lib/api/assignments.ts`).
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const [units, employees] = await Promise.all([listUnits(), listEmployees()]);
      if (cancelled) return;

      // Build a unit path map for subtree membership test.
      const unitPath = new Map(units.map((u) => [u.uuid, u.path]));

      // Collect paths of all units the acting employee heads.
      const headedPaths = acting.headedUnitUuids
        .map((uuid) => unitPath.get(uuid))
        .filter((p): p is string => Boolean(p));

      if (headedPaths.length === 0) {
        setAssigneeOptions([]);
        return;
      }

      const inSubtree = (unitUuid: string) => {
        const path = unitPath.get(unitUuid);
        if (!path) return false;
        return headedPaths.some((headPath) => path.startsWith(headPath));
      };

      // Only consider employees whose primary unit is within the assigner's
      // subtree. Also exclude the acting employee (no self-assign). No status
      // filter — ON_LEAVE employees are still offered but will trigger a
      // warning (UC-07 A3).
      const options: AssigneeOption[] = employees
        .filter(
          (e) =>
            e.uuid !== acting.employee.uuid &&
            e.status !== 'TERMINATED' &&
            e.status !== 'DRAFT' &&
            inSubtree(e.primaryUnitUuid),
        )
        .map((e) => ({
          value: e.uuid,
          label: e.fullNameGenerated,
          sublabel: units.find((u) => u.uuid === e.primaryUnitUuid)?.nameUz ?? '',
          status: e.status,
        }));

      setAssigneeOptions(options);
    })();
    return () => {
      cancelled = true;
    };
  }, [acting.employee.uuid, acting.headedUnitUuids]);

  const assigneeUuid = watch('assigneeUuid');
  const deadline = watch('deadline');
  const priority = watch('priority');

  const selectedAssignee = assigneeOptions.find((o) => o.value === assigneeUuid);
  const assigneeOnLeave = selectedAssignee?.status === 'ON_LEAVE';

  const deadlineIsPast = Boolean(deadline && deadline < todayIso());

  async function onValid(values: CreateTaskFormValues) {
    // UC-07 A2: warn before submitting a past deadline.
    if (deadlineIsPast && !pastDeadlineConfirmed) {
      setPastDeadlineConfirmed(true);
      return;
    }

    try {
      const task = await createTask(
        {
          title: values.title.trim(),
          description: values.description.trim(),
          priority: values.priority,
          assigneeUuid: values.assigneeUuid,
          deadline: values.deadline,
          attachedFile: attachedFile
            ? { ...attachedFile, uploadedAt: new Date().toISOString() }
            : undefined,
        },
        acting.employee.uuid,
      );
      toast.success(t('dashboard:tasks.create.success', { number: task.number }));
      navigate('/tasks', { replace: true });
    } catch (err) {
      toastTaskError(t, err);
    }
  }

  return (
    <form id={formId} onSubmit={handleSubmit(onValid)} className="space-y-4" noValidate>
      {/* Title */}
      <div className="space-y-2">
        <Label htmlFor="task-title">
          {t('dashboard:tasks.create.label-title')}{' '}
          <span className="text-destructive">*</span>
        </Label>
        <Input
          id="task-title"
          {...register('title')}
          placeholder={t('dashboard:tasks.create.label-title')}
        />
        {errors.title?.message && (
          <p className="text-xs text-destructive">{t(errors.title.message)}</p>
        )}
      </div>

      {/* Description */}
      <div className="space-y-2">
        <Label htmlFor="task-description">
          {t('dashboard:tasks.create.label-description')}{' '}
          <span className="text-destructive">*</span>
        </Label>
        <Textarea
          id="task-description"
          rows={3}
          {...register('description')}
          placeholder={t('dashboard:tasks.create.label-description')}
        />
        {errors.description?.message && (
          <p className="text-xs text-destructive">{t(errors.description.message)}</p>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {/* Priority */}
        <div className="space-y-2">
          <Label>
            {t('dashboard:tasks.create.label-priority')}{' '}
            <span className="text-destructive">*</span>
          </Label>
          <Select
            value={priority}
            onValueChange={(v) =>
              setValue('priority', v as CreateTaskFormValues['priority'], { shouldValidate: true })
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
          <Label htmlFor="task-deadline">
            {t('dashboard:tasks.create.label-deadline')}{' '}
            <span className="text-destructive">*</span>
          </Label>
          <Input
            id="task-deadline"
            type="date"
            min={todayIso()}
            {...register('deadline')}
          />
          {errors.deadline?.message && (
            <p className="text-xs text-destructive">{t(errors.deadline.message)}</p>
          )}
          {/* UC-07 A2: past-deadline confirmation prompt */}
          {deadlineIsPast && pastDeadlineConfirmed && (
            <p className="text-xs text-amber-600">
              {t('dashboard:tasks.create.past-deadline-confirm')}
            </p>
          )}
        </div>
      </div>

      {/* Assignee */}
      <div className="space-y-2">
        <Label>
          {t('dashboard:tasks.create.label-assignee')}{' '}
          <span className="text-destructive">*</span>
        </Label>
        <Combobox
          options={assigneeOptions}
          value={assigneeUuid || null}
          onChange={(v) => setValue('assigneeUuid', v, { shouldValidate: true })}
          placeholder={t('dashboard:tasks.create.label-assignee')}
          emptyMessage={t('dashboard:tasks.create.assignee-empty')}
        />
        {errors.assigneeUuid?.message && (
          <p className="text-xs text-destructive">{t(errors.assigneeUuid.message)}</p>
        )}
        {/* UC-07 A3: on-leave warning — shown but submit is still allowed */}
        {assigneeOnLeave && selectedAssignee && (
          <div className="flex items-center gap-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
            <AlertTriangle className="h-4 w-4 shrink-0" aria-hidden />
            <span>
              {t('dashboard:tasks.create.on-leave-warning', {
                name: selectedAssignee.label,
              })}
            </span>
          </div>
        )}
      </div>

      {/* Optional file attachment — reuses MetaFileField (same primitive as SubmitDeliverableDialog) */}
      <MetaFileField
        id="task-attachment"
        labelKey="dashboard:tasks.create.label-attachment"
        hintKey="dashboard:tasks.create.file-hint"
        value={attachedFile}
        onChange={setAttachedFile}
        onError={(key) => setFileErrorKey(key)}
        errorKey={fileErrorKey}
        required={false}
      />
    </form>
  );
}
