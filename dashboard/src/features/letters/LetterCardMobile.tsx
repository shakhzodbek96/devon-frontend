import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { AlertTriangle, ChevronRight } from 'lucide-react';

import StatusBadge from '@/components/common/StatusBadge';
import { formatDate } from '@/i18n/uz-locale';
import { isLetterOverdue } from '@/lib/data/letters';
import type { Letter } from '@/types/domain';

interface Props {
  rows: Letter[];
}

export default function LetterCardMobile({ rows }: Props) {
  const navigate = useNavigate();
  const { t } = useTranslation(['dashboard']);

  return (
    <ul className="space-y-2">
      {rows.map((letter) => {
        const overdue = isLetterOverdue(letter);
        return (
          <li key={letter.uuid}>
            <button
              type="button"
              onClick={() => navigate(`/letters/${letter.uuid}`)}
              aria-label={t('dashboard:letters.registry.open-letter', {
                number: letter.number,
              })}
              className="flex min-h-16 w-full items-center gap-3 rounded-lg border border-line bg-surface p-3 text-left transition-colors hover:bg-surface-2/30"
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="shrink-0 font-mono text-xs tabular-nums text-muted-foreground">
                    {letter.number}
                  </span>
                  <span className="truncate text-sm font-semibold text-ink">
                    {letter.externalOrg}
                  </span>
                </div>
                <p className="mt-0.5 line-clamp-2 text-sm text-body">{letter.subject}</p>
                <div className="mt-1.5 flex flex-wrap items-center gap-2">
                  <StatusBadge status={letter.status} />
                  {letter.deadline && (
                    <span
                      className={
                        overdue
                          ? 'flex items-center gap-1 text-xs font-medium text-destructive'
                          : 'text-xs tabular-nums text-muted-foreground'
                      }
                    >
                      {/* Icon + colour, never colour alone (a11y rule). */}
                      {overdue && <AlertTriangle className="h-3 w-3 shrink-0" aria-hidden />}
                      {formatDate(letter.deadline)}
                      {overdue && (
                        <span className="sr-only">
                          {t('dashboard:letters.registry.overdue')}
                        </span>
                      )}
                    </span>
                  )}
                </div>
              </div>
              <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
            </button>
          </li>
        );
      })}
    </ul>
  );
}
