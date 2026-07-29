import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { AlertTriangle } from 'lucide-react';

import StatusBadge from '@/components/common/StatusBadge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { formatDate } from '@/i18n/uz-locale';
import { isLetterOverdue } from '@/lib/data/letters';
import { cn } from '@/lib/utils';
import type { Letter } from '@/types/domain';

interface Props {
  rows: Letter[];
  /** Unit uuid → nameUz (routedToUnitUuid resolution). */
  unitNames: Map<string, string>;
  /** Employee uuid → FIO (assignedEmployeeUuid resolution). */
  employeeNames: Map<string, string>;
}

export default function LettersTable({ rows, unitNames, employeeNames }: Props) {
  const navigate = useNavigate();
  const { t } = useTranslation(['dashboard']);

  return (
    <div className="overflow-hidden rounded-lg border border-line bg-surface">
      <Table>
        <TableHeader className="bg-surface-2/40">
          <TableRow>
            <TableHead>{t('dashboard:letters.registry.col-number')}</TableHead>
            <TableHead>{t('dashboard:letters.registry.col-org')}</TableHead>
            <TableHead>{t('dashboard:letters.registry.col-subject')}</TableHead>
            <TableHead>{t('dashboard:letters.registry.col-assignee')}</TableHead>
            <TableHead>{t('dashboard:letters.registry.col-deadline')}</TableHead>
            <TableHead>{t('dashboard:letters.registry.col-status')}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((letter) => {
            const overdue = isLetterOverdue(letter);
            const unitName = letter.routedToUnitUuid
              ? (unitNames.get(letter.routedToUnitUuid) ?? '—')
              : '—';
            const executor = letter.assignedEmployeeUuid
              ? employeeNames.get(letter.assignedEmployeeUuid)
              : undefined;
            return (
              <TableRow
                key={letter.uuid}
                className="cursor-pointer hover:bg-surface-2/30"
                onClick={() => navigate(`/letters/${letter.uuid}`)}
              >
                <TableCell className="font-mono text-xs tabular-nums text-muted-foreground">
                  {letter.number}
                </TableCell>
                <TableCell>
                  <span className="block max-w-[24ch] truncate text-sm font-medium text-ink">
                    {letter.externalOrg}
                  </span>
                </TableCell>
                <TableCell className="text-sm text-body">
                  <span className="block max-w-[32ch] truncate">{letter.subject}</span>
                </TableCell>
                <TableCell className="text-sm text-body">
                  <span className="block max-w-[22ch] truncate">{unitName}</span>
                  {executor && (
                    <span className="block max-w-[22ch] truncate text-xs text-muted-foreground">
                      {executor}
                    </span>
                  )}
                </TableCell>
                <TableCell>
                  {letter.deadline ? (
                    <span
                      className={cn(
                        'flex items-center gap-1.5 text-sm tabular-nums',
                        overdue ? 'font-medium text-destructive' : 'text-muted-foreground',
                      )}
                    >
                      {/* Icon + colour, never colour alone (a11y rule). */}
                      {overdue && <AlertTriangle className="h-3.5 w-3.5 shrink-0" aria-hidden />}
                      {formatDate(letter.deadline)}
                      {overdue && (
                        <span className="sr-only">{t('dashboard:letters.registry.overdue')}</span>
                      )}
                    </span>
                  ) : (
                    <span className="text-sm text-muted-foreground">
                      {t('dashboard:letters.registry.no-deadline')}
                    </span>
                  )}
                </TableCell>
                <TableCell>
                  <StatusBadge status={letter.status} />
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
