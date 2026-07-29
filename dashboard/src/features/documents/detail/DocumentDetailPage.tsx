import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, ArrowRight, EyeOff, Eye } from 'lucide-react';

import ErrorState from '@/components/common/ErrorState';
import LoadingState from '@/components/common/LoadingState';
import StatusBadge from '@/components/common/StatusBadge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { formatDate, formatDateTime, formatRelative } from '@/i18n/uz-locale';
import { useActingEmployee } from '@/lib/acting';
import { listCertificates } from '@/lib/data/certificates';
import {
  getDocument,
  listDocumentTemplates,
  recordDocumentView,
  type DocumentDetail,
} from '@/lib/data/documents';
import { listEmployees } from '@/lib/data/employees';
import { listPositions } from '@/lib/data/positions';
import { useQueueStore } from '@/stores/useQueueStore';
import type { Employee } from '@/types/domain';

import SignatureHistoryCard from '@/features/_shared/eri/SignatureHistoryCard';

import A4Preview, { type SignatureStamp } from './A4Preview';
import ApprovalSheetCard from './ApprovalSheetCard';
import DocumentActions from './DocumentActions';

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0] ?? '')
    .join('')
    .toUpperCase();
}

export default function DocumentDetailPage() {
  const { t } = useTranslation(['dashboard', 'common']);
  const { uuid } = useParams<{ uuid: string }>();
  const acting = useActingEmployee();
  const actingUuid = acting?.employee.uuid;

  // `undefined` = loading, `null` = not found.
  const [detail, setDetail] = useState<DocumentDetail | null | undefined>(undefined);
  const [error, setError] = useState(false);
  const [retryKey, setRetryKey] = useState(0);

  // Static lookups — fetched once; new signatures only reference existing
  // certificates, so the serial map stays valid across refetches.
  const [employees, setEmployees] = useState<Map<string, Employee>>(new Map());
  const [positionNames, setPositionNames] = useState<Map<string, string>>(new Map());
  const [certSerials, setCertSerials] = useState<Map<string, string>>(new Map());
  const [templateNames, setTemplateNames] = useState<Map<string, string>>(new Map());
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const [emps, positions, certs, templates] = await Promise.all([
        listEmployees(),
        listPositions(),
        listCertificates(),
        listDocumentTemplates(),
      ]);
      if (cancelled) return;
      setEmployees(new Map(emps.map((e) => [e.uuid, e])));
      setPositionNames(new Map(positions.map((p) => [p.id, p.nameUz])));
      setCertSerials(new Map(certs.map((c) => [c.uuid, c.serialNumber])));
      setTemplateNames(new Map(templates.map((tpl) => [tpl.uuid, tpl.nameUz])));
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // The acting persona is a dependency: every action on this page depends on
  // who is looking, so a POV switch re-resolves the whole detail.
  useEffect(() => {
    if (!uuid || !actingUuid) return;
    let cancelled = false;
    setDetail(undefined);
    setError(false);
    void (async () => {
      try {
        const result = await getDocument(uuid);
        if (!cancelled) setDetail(result);
      } catch {
        if (!cancelled) setError(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [uuid, actingUuid, retryKey]);

  // §2.2 who-viewed: fire-and-forget, view-once per employee (backend no-ops
  // repeats; deliberately no maybeFail).
  useEffect(() => {
    if (!uuid || !actingUuid) return;
    void recordDocumentView(uuid, actingUuid).catch(() => {});
  }, [uuid, actingUuid]);

  function onChanged() {
    setRetryKey((k) => k + 1);
    useQueueStore.getState().bump();
  }

  // The fetched row may predate this visit's view record — merge the acting
  // persona in locally so "Kimlar ko'rgan" is immediately truthful.
  const viewedBy = useMemo(() => {
    if (!detail || !actingUuid) return [];
    const rows = detail.document.viewedBy;
    if (rows.some((v) => v.employeeUuid === actingUuid)) return rows;
    return [...rows, { employeeUuid: actingUuid, viewedAt: new Date().toISOString() }];
  }, [detail, actingUuid]);

  if (error) {
    return <ErrorState onRetry={() => setRetryKey((k) => k + 1)} />;
  }
  if (!acting || detail === undefined) {
    return <LoadingState rows={6} />;
  }
  if (detail === null) {
    return (
      <div className="py-16 text-center">
        <p className="text-muted-foreground">{t('dashboard:documents.detail.not-found')}</p>
        <Button asChild variant="outline" className="mt-4">
          <Link to="/documents">{t('common:actions.back')}</Link>
        </Button>
      </div>
    );
  }

  const doc = detail.document;
  const creator = employees.get(doc.creatorUuid);
  const recipient = employees.get(doc.recipientUuid);
  const signature = detail.signatures[0];
  const stamp: SignatureStamp | null = signature
    ? {
        signerName: employees.get(signature.employeeUuid)?.fullNameGenerated ?? '—',
        signedAt: signature.signedAt,
        serialNumber: certSerials.get(signature.certificateUuid) ?? '',
      }
    : null;

  return (
    <div className="space-y-5 md:space-y-6">
      <Button asChild variant="ghost" size="sm" className="-ml-2 print:hidden">
        <Link to="/documents">
          <ArrowLeft className="mr-1 h-4 w-4" />
          {t('dashboard:documents.detail.back')}
        </Link>
      </Button>

      {/* Hero band — employee-profile pattern */}
      <section className="rounded-xl border border-line bg-surface-2 p-5 print:hidden md:p-7">
        <p className="font-mono text-xs tabular-nums text-muted-foreground">{doc.number}</p>
        <h1 className="mt-1 text-xl font-bold leading-tight tracking-tight text-ink md:text-2xl">
          {doc.title}
        </h1>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <StatusBadge status={doc.status} />
          {doc.confidentiality === 'MAXFIY' && (
            <Badge
              variant="outline"
              className="gap-1.5 border-transparent bg-warning-soft font-medium text-warning"
            >
              <EyeOff className="h-3 w-3" aria-hidden />
              {t('dashboard:documents.detail.badge-maxfiy')}
            </Badge>
          )}
        </div>
        <div className="mt-4 flex flex-col gap-2 text-sm text-body md:flex-row md:items-center md:gap-3">
          <span className="inline-flex items-center gap-2">
            <span className="text-xs text-muted-foreground">
              {t('dashboard:documents.detail.label-creator')}:
            </span>
            {creator?.fullNameGenerated ?? '—'}
          </span>
          <ArrowRight className="hidden h-4 w-4 shrink-0 text-muted-foreground md:block" aria-hidden />
          <span className="inline-flex items-center gap-2">
            <span className="text-xs text-muted-foreground">
              {t('dashboard:documents.detail.label-recipient')}:
            </span>
            {recipient?.fullNameGenerated ?? '—'}
          </span>
        </div>
        <p className="mt-2 text-xs tabular-nums text-muted-foreground">
          {t('dashboard:documents.detail.label-created')}: {formatDateTime(doc.createdAt)} ·{' '}
          {t('dashboard:documents.detail.label-updated')}: {formatDateTime(doc.updatedAt)}
        </p>
      </section>

      <DocumentActions
        detail={detail}
        actorUuid={acting.employee.uuid}
        employees={employees}
        onChanged={onChanged}
      />

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <A4Preview document={doc} stamp={stamp} />
        </div>

        <div className="space-y-5 print:hidden">
          <ApprovalSheetCard
            document={doc}
            steps={detail.steps}
            employees={employees}
            positionNames={positionNames}
          />

          <SignatureHistoryCard
            signatures={detail.signatures}
            employees={employees}
            certSerials={certSerials}
          />

          {/* §2.2 "Kimlar ko'rgan" */}
          <section className="rounded-xl border border-line bg-surface p-4 md:p-5">
            <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold text-ink">
              <Eye className="h-4 w-4 text-muted-foreground" aria-hidden />
              {t('dashboard:documents.detail.viewed.title')}
            </h2>
            <ul className="space-y-2.5">
              {viewedBy.map((v) => {
                const emp = employees.get(v.employeeUuid);
                return (
                  <li key={v.employeeUuid} className="flex items-center gap-2.5">
                    <Avatar className="h-7 w-7 shrink-0">
                      <AvatarFallback className="bg-primary text-canvas text-[10px] font-bold">
                        {emp ? initials(emp.fullNameGenerated) : '?'}
                      </AvatarFallback>
                    </Avatar>
                    <span className="min-w-0 flex-1 truncate text-sm text-ink">
                      {emp?.fullNameGenerated ?? '—'}
                    </span>
                    <span className="shrink-0 text-xs text-muted-foreground">
                      {formatRelative(v.viewedAt)}
                    </span>
                  </li>
                );
              })}
            </ul>
          </section>

          {/* Metadata */}
          <section className="rounded-xl border border-line bg-surface p-4 md:p-5">
            <h2 className="mb-4 text-sm font-semibold text-ink">
              {t('dashboard:documents.detail.meta.title')}
            </h2>
            <dl className="space-y-2.5 text-sm">
              <MetaRow
                label={t('dashboard:documents.detail.meta.type')}
                value={
                  doc.source === 'TEMPLATE'
                    ? (templateNames.get(doc.templateUuid ?? '') ??
                      t('dashboard:documents.registry.type-template'))
                    : t('dashboard:documents.registry.type-upload')
                }
              />
              <MetaRow
                label={t('dashboard:documents.detail.meta.signer')}
                value={
                  doc.signerUuid
                    ? (employees.get(doc.signerUuid)?.fullNameGenerated ?? '—')
                    : t('dashboard:documents.detail.meta.no-signer')
                }
              />
              {doc.sentForReviewAt && (
                <MetaRow
                  label={t('dashboard:documents.detail.meta.sent')}
                  value={formatDate(doc.sentForReviewAt)}
                />
              )}
              {doc.approvedAt && (
                <MetaRow
                  label={t('dashboard:documents.detail.meta.approved')}
                  value={formatDate(doc.approvedAt)}
                />
              )}
              {doc.signedAt && (
                <MetaRow
                  label={t('dashboard:documents.detail.meta.signed')}
                  value={formatDate(doc.signedAt)}
                />
              )}
              {doc.closedAt && (
                <MetaRow
                  label={t('dashboard:documents.detail.meta.closed')}
                  value={formatDate(doc.closedAt)}
                />
              )}
              {doc.archivedAt && (
                <MetaRow
                  label={t('dashboard:documents.detail.meta.archived')}
                  value={formatDate(doc.archivedAt)}
                />
              )}
              {doc.emailedTo && doc.emailedTo.length > 0 && (
                <MetaRow
                  label={t('dashboard:documents.detail.meta.emailed')}
                  value={doc.emailedTo.join(', ')}
                />
              )}
            </dl>
          </section>
        </div>
      </div>
    </div>
  );
}

function MetaRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <dt className="shrink-0 text-xs text-muted-foreground">{label}</dt>
      <dd className="min-w-0 text-right font-medium break-words text-ink">{value}</dd>
    </div>
  );
}
