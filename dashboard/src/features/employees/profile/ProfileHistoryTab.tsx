import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

import LoadingState from '@/components/common/LoadingState';
import { ACTION_ICON, DEFAULT_ACTION_ICON } from '@/lib/audit-icons';
import { formatRelative } from '@/i18n/uz-locale';
import { listAudit } from '@/lib/data/audit';
import { ApiError } from '@/lib/api/client';
import type { AuditEntry, Employee } from '@/types/domain';

interface Props {
  employee: Employee;
}

export default function ProfileHistoryTab({ employee }: Props) {
  const { t } = useTranslation(['dashboard']);
  const [rows, setRows] = useState<AuditEntry[] | null>(null);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const r = await listAudit({ resourceUuid: employee.uuid });
        if (!active) return;
        setRows(r);
      } catch (err) {
        // `audit.view` is gated to SUPER_ADMIN/HR_ADMIN/AUDITOR (unlike
        // `employees.view`, which every role holds) — a plain employee
        // browsing a profile page's History tab hits a 403 here. Degrade
        // to an empty timeline instead of an unhandled error.
        if (!active) return;
        if (err instanceof ApiError && err.status === 403) {
          setRows([]);
        } else {
          throw err;
        }
      }
    })();
    return () => {
      active = false;
    };
  }, [employee.uuid]);

  if (rows === null) return <LoadingState rows={5} />;

  return (
    <div className="space-y-4 pt-4">
      <h3 className="text-base font-semibold text-ink">
        {t('dashboard:employees.profile.history.heading')}
      </h3>

      {rows.length === 0 ? (
        <p className="rounded-lg border border-dashed border-line bg-surface-2/40 py-8 text-center text-sm text-muted-foreground">
          {t('dashboard:employees.profile.history.empty')}
        </p>
      ) : (
        <ul className="divide-y divide-line rounded-lg border border-line bg-surface px-4">
          {rows.map((r) => {
            const Icon = ACTION_ICON[r.action] ?? DEFAULT_ACTION_ICON;
            return (
              <li key={r.uuid} className="flex items-start gap-3 py-3">
                <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-surface-2 text-primary">
                  <Icon className="h-3.5 w-3.5" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm leading-snug text-ink">
                    <span className="font-medium">{r.actorName}</span>{' '}
                    <span className="text-muted-foreground">
                      {t(`dashboard:audit.actions.${r.action}`)}
                    </span>{' '}
                    <span className="text-ink">{r.resourceLabel}</span>
                  </p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {formatRelative(r.createdAt)}
                  </p>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
