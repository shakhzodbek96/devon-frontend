import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ChevronDown, ChevronUp } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { getTaskStats, type TaskStats } from '@/lib/data/tasks';
import { cn } from '@/lib/utils';

// ─── Props ────────────────────────────────────────────────────────────────────

interface Props {
  actingUuid: string;
  /** Bump this number to trigger a re-fetch (e.g. after create / onChanged). */
  version?: number;
}

// ─── Chip ─────────────────────────────────────────────────────────────────────

function Chip({
  label,
  count,
  variant = 'default',
}: {
  label: string;
  count: number;
  variant?: 'default' | 'destructive' | 'muted';
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium',
        variant === 'destructive' &&
          'bg-destructive/10 text-destructive',
        variant === 'muted' &&
          'bg-muted text-muted-foreground',
        variant === 'default' &&
          'bg-surface-2 text-ink-soft',
      )}
    >
      <span className="tabular-nums font-semibold">{count}</span>
      {label}
    </span>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

/**
 * A collapsible band of task-stats chips for the manager's "assigned-by-me"
 * view. Shows status counts, an overdue count, and per-assignee open load.
 * Renders nothing when there are zero assigned tasks.
 */
export default function TaskStatsBand({ actingUuid, version }: Props) {
  const { t } = useTranslation(['dashboard']);
  const [stats, setStats] = useState<TaskStats | null>(null);
  const [open, setOpen] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setStats(null);
    void (async () => {
      try {
        const s = await getTaskStats(actingUuid);
        if (!cancelled) setStats(s);
      } catch {
        // silently swallow — stats are non-critical
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [actingUuid, version]);

  if (!stats) return null;

  const totalAssigned = Object.values(stats.byStatus).reduce((a, b) => a + b, 0);
  if (totalAssigned === 0) return null;

  return (
    <div className="rounded-lg border border-line bg-surface p-3">
      {/* Header row */}
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          {t('dashboard:tasks.stats.heading')}
        </span>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-6 w-6"
          onClick={() => setOpen((o) => !o)}
          aria-label={open ? t('common:actions.show-less') : t('common:actions.show-more')}
        >
          {open ? (
            <ChevronUp className="h-4 w-4" aria-hidden />
          ) : (
            <ChevronDown className="h-4 w-4" aria-hidden />
          )}
        </Button>
      </div>

      {open && (
        <div className="mt-3 space-y-2.5">
          {/* Status counts */}
          <div className="flex flex-wrap gap-1.5">
            <Chip label={t('dashboard:tasks.board.col-new')} count={stats.byStatus.NEW} />
            <Chip label={t('dashboard:tasks.board.col-in-progress')} count={stats.byStatus.IN_PROGRESS} />
            <Chip label={t('dashboard:tasks.board.col-under-review')} count={stats.byStatus.UNDER_REVIEW} />
            <Chip label={t('dashboard:tasks.board.col-done')} count={stats.byStatus.DONE} />
            <Chip label={t('dashboard:tasks.stats.rejected')} count={stats.byStatus.REJECTED} variant="muted" />
          </div>

          {/* Overdue count — destructive tint when > 0 */}
          {stats.overdueCount > 0 && (
            <div className="flex flex-wrap gap-1.5">
              <Chip
                label={t('dashboard:tasks.stats.overdue')}
                count={stats.overdueCount}
                variant="destructive"
              />
            </div>
          )}

          {/* Per-assignee load */}
          {stats.loadPerAssignee.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              <span className="self-center text-xs text-muted-foreground">
                {t('dashboard:tasks.stats.load')}:
              </span>
              {stats.loadPerAssignee.map((row) => (
                <Chip
                  key={row.assigneeUuid}
                  label={row.assigneeName}
                  count={row.openCount}
                  variant="muted"
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
