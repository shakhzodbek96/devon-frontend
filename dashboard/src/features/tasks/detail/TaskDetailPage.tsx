import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { AlertTriangle, ArrowLeft, FileText, Link2, ListTodo } from 'lucide-react';

import EmptyState from '@/components/common/EmptyState';
import ErrorState from '@/components/common/ErrorState';
import LoadingState from '@/components/common/LoadingState';
import StatusBadge from '@/components/common/StatusBadge';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { formatBytes } from '@/lib/format';
import { formatDate, formatDateTime } from '@/i18n/uz-locale';
import { useActingEmployee } from '@/lib/acting';
import { getTask, isTaskOverdue, type TaskDetail } from '@/lib/data/tasks';
import { cn } from '@/lib/utils';
import type { TaskPriority } from '@/types/domain';

import TaskActions from './TaskActions';
import TaskCommentThread from './TaskCommentThread';

const PRIORITY_CLS: Record<TaskPriority, string> = {
  HIGH: 'bg-destructive/10 text-destructive border-transparent',
  MEDIUM: 'bg-warning-soft text-warning border-transparent',
  STANDARD: 'bg-muted text-muted-foreground border-transparent',
};

export default function TaskDetailPage() {
  const { t } = useTranslation(['dashboard', 'common']);
  const { uuid } = useParams<{ uuid: string }>();
  const acting = useActingEmployee();
  const actingUuid = acting?.employee.uuid;

  // `undefined` = loading, `null` = not found.
  const [detail, setDetail] = useState<TaskDetail | null | undefined>(undefined);
  const [error, setError] = useState(false);
  const [retryKey, setRetryKey] = useState(0);

  // Re-resolve on POV switch (acting uuid) and on explicit retry.
  useEffect(() => {
    if (!uuid || !actingUuid) return;
    let cancelled = false;
    setDetail(undefined);
    setError(false);
    void (async () => {
      try {
        const result = await getTask(uuid);
        if (cancelled) return;
        setDetail(result);
      } catch {
        if (!cancelled) setError(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [uuid, actingUuid, retryKey]);

  function refetch() {
    setRetryKey((k) => k + 1);
  }

  if (error) {
    return <ErrorState onRetry={refetch} />;
  }
  if (!acting || detail === undefined) {
    return <LoadingState rows={6} />;
  }
  if (detail === null) {
    return (
      <EmptyState
        icon={ListTodo}
        title={t('dashboard:tasks.detail.not-found')}
        action={
          <Button asChild variant="outline">
            <Link to="/tasks">{t('dashboard:tasks.detail.back')}</Link>
          </Button>
        }
      />
    );
  }

  const overdue = isTaskOverdue(detail);
  const isTerminal = detail.status === 'DONE' || detail.status === 'REJECTED';

  // Find the REJECT_REASON comment body for the outcome card.
  const rejectComment = detail.comments.find((c) => c.kind === 'REJECT_REASON');

  return (
    <div className="space-y-5 md:space-y-6">
      {/* Back link */}
      <Button asChild variant="ghost" size="sm" className="-ml-2">
        <Link to="/tasks">
          <ArrowLeft className="mr-1 h-4 w-4" />
          {t('dashboard:tasks.detail.back')}
        </Link>
      </Button>

      {/* Hero band */}
      <section className="rounded-xl border border-line bg-surface-2 p-5 md:p-7">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-mono text-xs tabular-nums text-muted-foreground">
            {detail.number}
          </span>
          {/* Priority badge */}
          <Badge
            variant="outline"
            className={cn('text-xs font-medium', PRIORITY_CLS[detail.priority])}
          >
            {t(`dashboard:tasks.priority.${detail.priority}`)}
          </Badge>
        </div>

        <h1 className="mt-2 text-xl font-bold leading-tight tracking-tight text-ink md:text-2xl">
          {detail.title}
        </h1>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <StatusBadge status={detail.status} />
          {overdue && !isTerminal && (
            <span
              className="flex items-center gap-1 text-sm font-medium text-destructive"
              aria-live="polite"
            >
              <AlertTriangle className="h-3.5 w-3.5 shrink-0" aria-hidden />
              {t('dashboard:tasks.card.overdue')}
            </span>
          )}
        </div>

        {/* Deadline hero row */}
        <dl className="mt-4 text-sm">
          <div className="flex items-baseline gap-3">
            <dt className="shrink-0 text-xs text-muted-foreground">
              {t('dashboard:tasks.detail.meta.deadline')}
            </dt>
            <dd
              className={cn(
                'flex items-center gap-1.5 tabular-nums',
                overdue && !isTerminal ? 'font-medium text-destructive' : 'text-body',
              )}
            >
              {overdue && !isTerminal && (
                <AlertTriangle className="h-3.5 w-3.5 shrink-0" aria-hidden />
              )}
              {formatDate(detail.deadline)}
            </dd>
          </div>
        </dl>
      </section>

      {/* Action bar */}
      <TaskActions task={detail} acting={acting} onChanged={refetch} />

      {/* Main 3-column grid */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        {/* ── LEFT (2/3) ── */}
        <div className="space-y-5 lg:col-span-2">
          {/* Description card */}
          <section className="rounded-xl border border-line bg-surface p-4 md:p-5">
            <h2 className="mb-3 text-sm font-semibold text-ink">
              {t('dashboard:tasks.detail.description-heading')}
            </h2>
            <p className="whitespace-pre-wrap text-sm text-body">{detail.description}</p>
          </section>

          {/* Deliverable card */}
          <section className="rounded-xl border border-line bg-surface p-4 md:p-5">
            <h2 className="mb-3 text-sm font-semibold text-ink">
              {t('dashboard:tasks.detail.deliverable-heading')}
            </h2>
            {detail.deliverable ? (
              <div className="space-y-3">
                {/* Summary */}
                <p className="text-sm text-body">{detail.deliverable.summary}</p>

                {/* Submitted at + late badge */}
                <p className="flex items-center gap-2 text-xs tabular-nums text-muted-foreground">
                  {formatDateTime(detail.deliverable.submittedAt)}
                  {detail.lateSubmission && (
                    <Badge
                      variant="outline"
                      className="border-transparent bg-destructive/10 text-destructive"
                    >
                      {t('dashboard:tasks.detail.deliverable-late')}
                    </Badge>
                  )}
                </p>

                {/* Attached file chip */}
                {detail.deliverable.file && (
                  <div className="flex items-center gap-3 rounded-lg border border-line bg-background/60 px-3 py-2.5">
                    <FileText className="h-4 w-4 shrink-0 text-primary" aria-hidden />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm text-ink">
                        {detail.deliverable.file.fileName}{' '}
                        <span className="text-muted-foreground">
                          ({formatBytes(detail.deliverable.file.fileSize)})
                        </span>
                      </span>
                    </span>
                  </div>
                )}

                {/* Linked document */}
                {detail.deliverable.documentUuid && (
                  <Link
                    to={`/documents/${detail.deliverable.documentUuid}`}
                    className="flex items-center gap-2 rounded-lg border border-line bg-background/60 px-3 py-2.5 text-sm text-primary hover:bg-surface-2/30"
                  >
                    <Link2 className="h-4 w-4 shrink-0" aria-hidden />
                    {detail.deliverableDocumentNumber
                      ? `${detail.deliverableDocumentNumber}`
                      : t('dashboard:tasks.detail.deliverable-heading')}
                  </Link>
                )}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                {t('dashboard:tasks.detail.deliverable-empty')}
              </p>
            )}
          </section>

          {/* Comment thread */}
          <section className="rounded-xl border border-line bg-surface p-4 md:p-5">
            <h2 className="mb-3 text-sm font-semibold text-ink">
              {t('dashboard:tasks.detail.comments-heading')}
            </h2>
            <TaskCommentThread
              comments={detail.comments}
              authors={detail.commentAuthors}
            />
          </section>
        </div>

        {/* ── RIGHT (1/3) ── */}
        <div className="space-y-5">
          {/* Metadata card */}
          <section className="rounded-xl border border-line bg-surface p-4 md:p-5">
            <h2 className="mb-4 text-sm font-semibold text-ink">
              {t('dashboard:tasks.detail.meta.heading')}
            </h2>
            <dl className="space-y-2.5 text-sm">
              <MetaRow
                label={t('dashboard:tasks.detail.meta.assigner')}
                value={detail.assignerName}
              />
              <MetaRow
                label={t('dashboard:tasks.detail.meta.assignee')}
                value={
                  detail.assigneePositionUz
                    ? `${detail.assigneeName} · ${detail.assigneePositionUz}`
                    : detail.assigneeName
                }
              />
              {detail.assigneeUnitNameUz && (
                <MetaRow
                  label={t('dashboard:tasks.detail.meta.unit')}
                  value={detail.assigneeUnitNameUz}
                />
              )}
              <MetaRow
                label={t('dashboard:tasks.detail.meta.deadline')}
                value={formatDate(detail.deadline)}
                destructive={overdue && !isTerminal}
              />
              <MetaRow
                label={t('dashboard:tasks.detail.meta.priority')}
                value={t(`dashboard:tasks.priority.${detail.priority}`)}
              />
              <MetaRow
                label={t('dashboard:tasks.detail.meta.round')}
                value={String(detail.round)}
              />
              {detail.lateSubmission && (
                <div className="flex items-baseline justify-between gap-3">
                  <dt className="shrink-0 text-xs text-muted-foreground">
                    {t('dashboard:tasks.detail.meta.late')}
                  </dt>
                  <dd className="min-w-0 text-right font-medium wrap-break-word text-destructive">
                    {t('dashboard:tasks.detail.deliverable-late')}
                  </dd>
                </div>
              )}
              <MetaRow
                label={t('dashboard:tasks.detail.meta.created')}
                value={formatDateTime(detail.createdAt)}
              />
            </dl>
          </section>

          {/* Attached document card */}
          {detail.attachedDocumentUuid && (
            <section className="rounded-xl border border-line bg-surface p-4 md:p-5">
              <h2 className="mb-3 text-sm font-semibold text-ink">
                {t('dashboard:tasks.detail.attached-heading')}
              </h2>
              {detail.attachedDocumentNumber ? (
                <Link
                  to={`/documents/${detail.attachedDocumentUuid}`}
                  className="flex items-center gap-2 rounded-lg border border-line bg-background/60 px-3 py-2.5 text-sm text-primary hover:bg-surface-2/30"
                >
                  <Link2 className="h-4 w-4 shrink-0" aria-hidden />
                  <span className="min-w-0">
                    <span className="block font-mono text-xs tabular-nums">
                      {detail.attachedDocumentNumber}
                    </span>
                    {detail.attachedDocumentTitle && (
                      <span className="block truncate text-sm text-ink">
                        {detail.attachedDocumentTitle}
                      </span>
                    )}
                  </span>
                </Link>
              ) : (
                <p className="text-sm text-muted-foreground">
                  {t('dashboard:tasks.detail.attached-empty')}
                </p>
              )}
            </section>
          )}

          {/* Review-outcome card */}
          {isTerminal && (detail.reviewNote || rejectComment) && (
            <section className="rounded-xl border border-line bg-surface p-4 md:p-5">
              <h2 className="mb-3 text-sm font-semibold text-ink">
                {t('dashboard:tasks.detail.outcome-heading')}
              </h2>
              {detail.status === 'DONE' && detail.reviewNote && (
                <div>
                  <p className="mb-1 text-xs text-muted-foreground">
                    {t('dashboard:tasks.detail.outcome-note')}
                  </p>
                  <p className="text-sm text-body">{detail.reviewNote}</p>
                </div>
              )}
              {detail.status === 'REJECTED' && rejectComment && (
                <div>
                  <p className="mb-1 text-xs text-muted-foreground">
                    {t('dashboard:tasks.detail.outcome-rejected')}
                  </p>
                  <p className="text-sm text-destructive">{rejectComment.body}</p>
                </div>
              )}
            </section>
          )}
        </div>
      </div>
    </div>
  );
}

function MetaRow({
  label,
  value,
  destructive,
}: {
  label: string;
  value: string;
  destructive?: boolean;
}) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <dt className="shrink-0 text-xs text-muted-foreground">{label}</dt>
      <dd
        className={cn(
          'min-w-0 text-right font-medium wrap-break-word',
          destructive ? 'text-destructive' : 'text-ink',
        )}
      >
        {value}
      </dd>
    </div>
  );
}
