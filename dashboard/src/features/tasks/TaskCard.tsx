import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { AlertTriangle, Calendar, User } from 'lucide-react';

import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import StatusBadge from '@/components/common/StatusBadge';
import { formatDate } from '@/i18n/uz-locale';
import { isTaskOverdue } from '@/lib/data/tasks';
import { cn } from '@/lib/utils';
import type { TaskEntity, TaskPriority } from '@/types/domain';

interface Props {
  task: TaskEntity;
  box: 'assigned-by-me' | 'assigned-to-me';
  counterpartName?: string;
}

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0] ?? '')
    .join('')
    .toUpperCase();
}

const PRIORITY_CLS: Record<TaskPriority, string> = {
  HIGH: 'bg-destructive/10 text-destructive border-transparent',
  MEDIUM: 'bg-warning-soft text-warning border-transparent',
  STANDARD: 'bg-muted text-muted-foreground border-transparent',
};

export default function TaskCard({ task, box, counterpartName }: Props) {
  const { t } = useTranslation(['dashboard']);
  const navigate = useNavigate();
  const overdue = isTaskOverdue(task);

  const counterpartLabel =
    box === 'assigned-by-me'
      ? t('dashboard:tasks.card.assignee')
      : t('dashboard:tasks.card.assigner');

  return (
    <Card
      onClick={() => navigate(`/tasks/${task.uuid}`)}
      className="cursor-pointer p-4 transition-shadow hover:shadow-sm"
    >
      <div className="flex flex-col gap-2">
        {/* Number + title */}
        <div>
          <p className="mb-0.5 text-[11px] font-medium tabular-nums text-muted-foreground">
            {task.number}
          </p>
          <p className="line-clamp-2 text-sm font-semibold text-ink">{task.title}</p>
        </div>

        {/* Priority chip */}
        <Badge
          variant="outline"
          className={cn('w-fit text-xs', PRIORITY_CLS[task.priority])}
        >
          {t(`dashboard:tasks.priority.${task.priority}`)}
        </Badge>

        {/* Deadline row */}
        <div
          className={cn(
            'flex items-center gap-1.5 text-xs tabular-nums',
            overdue ? 'text-destructive' : 'text-muted-foreground',
          )}
        >
          {overdue ? (
            <AlertTriangle className="h-3 w-3 shrink-0" aria-hidden />
          ) : (
            <Calendar className="h-3 w-3 shrink-0" aria-hidden />
          )}
          <span>
            {t('dashboard:tasks.card.deadline')}: {formatDate(task.deadline)}
          </span>
          {overdue && (
            <span className="sr-only">{t('dashboard:tasks.card.overdue')}</span>
          )}
        </div>

        {/* Counterpart avatar + name */}
        <div className="flex items-center gap-2">
          <Avatar className="h-6 w-6 shrink-0">
            <AvatarFallback className="bg-brand-soft text-[10px] font-semibold text-primary-deep">
              {counterpartName ? initials(counterpartName) : <User className="h-3 w-3" />}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <p className="truncate text-[11px] text-muted-foreground">{counterpartLabel}</p>
            <p className="truncate text-xs font-medium text-ink">
              {counterpartName ?? '—'}
            </p>
          </div>
        </div>

        {/* Status badge */}
        <div className="mt-1">
          <StatusBadge status={task.status} />
        </div>
      </div>
    </Card>
  );
}
