import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { CheckCheck, ChevronRight, ListChecks, PenLine, Sparkles, type LucideIcon } from 'lucide-react';

import EmptyState from '@/components/common/EmptyState';
import ErrorState from '@/components/common/ErrorState';
import LoadingState from '@/components/common/LoadingState';
import PageHeader from '@/components/common/PageHeader';
import { formatRelative } from '@/i18n/uz-locale';
import { useActingEmployee } from '@/lib/acting';
import { listMyApprovals, type ApprovalQueueItem } from '@/lib/data/documents';
import { listEmployees } from '@/lib/data/employees';
import { useQueueStore } from '@/stores/useQueueStore';

type QueueKind = ApprovalQueueItem['kind'];

const GROUPS: { kind: QueueKind; icon: LucideIcon; titleKey: string }[] = [
  { kind: 'decision', icon: ListChecks, titleKey: 'dashboard:approvals.group-decision' },
  { kind: 'signature', icon: PenLine, titleKey: 'dashboard:approvals.group-signature' },
  { kind: 'acceptance', icon: CheckCheck, titleKey: 'dashboard:approvals.group-acceptance' },
];

/**
 * `/approvals` — everything waiting on the acting persona, straight from
 * `listMyApprovals` (the same feed the sidebar badge counts). POV switch
 * refetches; the result is pushed into the queue store so the badge agrees
 * without a second fetch.
 */
export default function ApprovalsQueuePage() {
  const { t } = useTranslation(['dashboard']);
  const acting = useActingEmployee();
  const actingUuid = acting?.employee.uuid;
  const setCount = useQueueStore((s) => s.setCount);

  const [items, setItems] = useState<ApprovalQueueItem[] | null>(null);
  const [employeeNames, setEmployeeNames] = useState<Map<string, string>>(new Map());
  const [error, setError] = useState(false);
  const [retryKey, setRetryKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const employees = await listEmployees();
      if (!cancelled) {
        setEmployeeNames(new Map(employees.map((e) => [e.uuid, e.fullNameGenerated])));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!actingUuid) return;
    let cancelled = false;
    setItems(null);
    setError(false);
    void (async () => {
      try {
        const rows = await listMyApprovals(actingUuid);
        if (cancelled) return;
        setItems(rows);
        setCount(rows.length);
      } catch {
        if (!cancelled) setError(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [actingUuid, retryKey, setCount]);

  const grouped = useMemo(() => {
    const map = new Map<QueueKind, ApprovalQueueItem[]>();
    for (const item of items ?? []) {
      const bucket = map.get(item.kind);
      if (bucket) bucket.push(item);
      else map.set(item.kind, [item]);
    }
    return map;
  }, [items]);

  return (
    <div className="space-y-4 md:space-y-6">
      <PageHeader
        title={t('dashboard:approvals.title')}
        subtitle={t('dashboard:approvals.subtitle')}
      />

      {error && <ErrorState onRetry={() => setRetryKey((k) => k + 1)} />}

      {!error && items === null && <LoadingState rows={5} />}

      {!error && items !== null && items.length === 0 && (
        <EmptyState
          icon={Sparkles}
          title={t('dashboard:approvals.empty-title')}
          body={t('dashboard:approvals.empty-body')}
        />
      )}

      {!error && items !== null && items.length > 0 && (
        <div className="space-y-6">
          {GROUPS.filter((g) => grouped.has(g.kind)).map((group) => {
            const rows = grouped.get(group.kind)!;
            return (
              <section key={group.kind} className="space-y-2">
                <h2 className="flex items-center gap-2 text-sm font-semibold text-ink">
                  <group.icon className="h-4 w-4 text-primary" aria-hidden />
                  {t(group.titleKey)}
                  <span className="tabular-nums text-muted-foreground">({rows.length})</span>
                </h2>
                <ul className="space-y-2">
                  {rows.map((item) => {
                    const doc = item.document;
                    const waitingSince =
                      item.kind === 'decision'
                        ? (doc.sentForReviewAt ?? doc.createdAt)
                        : (doc.approvedAt ?? doc.sentForReviewAt ?? doc.createdAt);
                    return (
                      <li key={`${item.kind}-${doc.uuid}`}>
                        <Link
                          to={`/documents/${doc.uuid}`}
                          className="group flex min-h-16 items-center gap-3 rounded-xl border border-line bg-surface px-4 py-3 transition-colors hover:border-primary/40 hover:bg-surface-2/30"
                        >
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-medium text-ink">
                              <span className="mr-2 font-mono text-xs tabular-nums text-muted-foreground">
                                {doc.number}
                              </span>
                              {doc.title}
                            </p>
                            <p className="mt-0.5 truncate text-xs text-muted-foreground">
                              {employeeNames.get(doc.creatorUuid) ?? '—'} ·{' '}
                              {t('dashboard:approvals.waiting-since', {
                                time: formatRelative(waitingSince),
                              })}
                            </p>
                          </div>
                          <ChevronRight
                            className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5"
                            aria-hidden
                          />
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}
