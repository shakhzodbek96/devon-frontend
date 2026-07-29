import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { AlertTriangle, ArrowLeft, FileText, Inbox, Link2, Send } from 'lucide-react';

import ErrorState from '@/components/common/ErrorState';
import LoadingState from '@/components/common/LoadingState';
import StatusBadge from '@/components/common/StatusBadge';
import SignatureHistoryCard from '@/features/_shared/eri/SignatureHistoryCard';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { formatBytes } from '@/lib/format';
import { formatDate, formatDateTime } from '@/i18n/uz-locale';
import { useActingEmployee } from '@/lib/acting';
import { listAudit } from '@/lib/data/audit';
import { listCertificates } from '@/lib/data/certificates';
import { listEmployees } from '@/lib/data/employees';
import { getLetter, isLetterOverdue, type LetterDetail } from '@/lib/data/letters';
import { listUnits } from '@/lib/data/units';
import { cn } from '@/lib/utils';
import type { AuditEntry, Employee, Unit } from '@/types/domain';

import LetterActions, { type LetterGate, type LetterHint } from './LetterActions';
import LetterTimeline from './LetterTimeline';

const TERMINAL = new Set(['CLOSED', 'CLOSED_NO_RESPONSE', 'DISPATCHED']);

export default function LetterDetailPage() {
  const { t } = useTranslation(['dashboard', 'common']);
  const { uuid } = useParams<{ uuid: string }>();
  const acting = useActingEmployee();
  const actingUuid = acting?.employee.uuid;

  // `undefined` = loading, `null` = not found.
  const [detail, setDetail] = useState<LetterDetail | null | undefined>(undefined);
  const [audit, setAudit] = useState<AuditEntry[]>([]);
  const [error, setError] = useState(false);
  const [retryKey, setRetryKey] = useState(0);

  // Static lookups — fetched once. `units` drives persona gating; the employee
  // + cert-serial maps feed the reused SignatureHistoryCard.
  const [units, setUnits] = useState<Unit[]>([]);
  const [employees, setEmployees] = useState<Map<string, Employee>>(new Map());
  const [certSerials, setCertSerials] = useState<Map<string, string>>(new Map());
  const [lookupsReady, setLookupsReady] = useState(false);
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const [us, emps, certs] = await Promise.all([
        listUnits(),
        listEmployees(),
        listCertificates(),
      ]);
      if (cancelled) return;
      setUnits(us);
      setEmployees(new Map(emps.map((e) => [e.uuid, e])));
      setCertSerials(new Map(certs.map((c) => [c.uuid, c.serialNumber])));
      setLookupsReady(true);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Every action depends on who is looking — a POV switch re-resolves both the
  // letter and its audit-derived timeline.
  useEffect(() => {
    if (!uuid || !actingUuid) return;
    let cancelled = false;
    setDetail(undefined);
    setError(false);
    void (async () => {
      try {
        const [result, auditRows] = await Promise.all([
          getLetter(uuid),
          listAudit({ resourceUuid: uuid }),
        ]);
        if (cancelled) return;
        setDetail(result);
        setAudit(auditRows);
      } catch {
        if (!cancelled) setError(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [uuid, actingUuid, retryKey]);

  function onChanged() {
    setRetryKey((k) => k + 1);
  }

  const unitByUuid = useMemo(() => new Map(units.map((u) => [u.uuid, u])), [units]);

  if (error) {
    return <ErrorState onRetry={() => setRetryKey((k) => k + 1)} />;
  }
  if (!acting || !lookupsReady || detail === undefined) {
    return <LoadingState rows={6} />;
  }
  if (detail === null) {
    return (
      <div className="py-16 text-center">
        <p className="text-muted-foreground">{t('dashboard:letters.detail.not-found')}</p>
        <Button asChild variant="outline" className="mt-4">
          <Link to="/letters">{t('common:actions.back')}</Link>
        </Button>
      </div>
    );
  }

  const letter = detail.letter;
  const incoming = letter.direction === 'INCOMING';
  const overdue = isLetterOverdue(letter);
  const isTerminal = TERMINAL.has(letter.status);

  // --- Persona gating (mirrors the step-20 policy helpers) ---
  const headsRootUnit = units.some(
    (u) => u.level === 0 && u.headEmployeeUuid === actingUuid,
  );
  const headsRoutedOrAncestor = (unitUuid?: string): boolean => {
    if (!unitUuid) return false;
    let cur = unitByUuid.get(unitUuid);
    while (cur) {
      if (cur.headEmployeeUuid === actingUuid) return true;
      cur = cur.parentUuid ? unitByUuid.get(cur.parentUuid) : undefined;
    }
    return false;
  };
  const isDevonxona = acting.roles.includes('ROLE_DEVONXONA');
  const isExecutor = letter.assignedEmployeeUuid === actingUuid;
  const s = letter.status;
  const gate: LetterGate = {
    canRoute: s === 'REGISTERED' && headsRootUnit,
    canAssign: s === 'ROUTED' && headsRoutedOrAncestor(letter.routedToUnitUuid),
    canStart: s === 'ASSIGNED' && isExecutor,
    canSubmit: (s === 'ASSIGNED' || s === 'IN_PROGRESS') && isExecutor,
    canAccept: s === 'EXECUTED' && headsRoutedOrAncestor(letter.routedToUnitUuid),
    canSign: s === 'ON_SIGNATURE' && headsRootUnit,
    canDispatch: s === 'RESPONDED' && isDevonxona,
  };

  const hint: LetterHint | null = (() => {
    switch (s) {
      case 'REGISTERED':
        return { laneKey: 'dashboard:letters.detail.lane.rahbar' };
      case 'ROUTED':
      case 'EXECUTED':
        return {
          laneKey: 'dashboard:letters.detail.lane.unit-head',
          who: detail.routedToUnitName,
        };
      case 'ASSIGNED':
      case 'IN_PROGRESS':
        return {
          laneKey: 'dashboard:letters.detail.lane.executor',
          who: detail.assignedEmployeeName,
        };
      case 'ON_SIGNATURE':
        return { laneKey: 'dashboard:letters.detail.lane.rahbar' };
      case 'RESPONDED':
        return { laneKey: 'dashboard:letters.detail.lane.devonxona' };
      default:
        return null;
    }
  })();

  const linked = incoming ? detail.linkedOutgoing : detail.linkedIncoming;

  return (
    <div className="space-y-5 md:space-y-6">
      <Button asChild variant="ghost" size="sm" className="-ml-2">
        <Link to="/letters">
          <ArrowLeft className="mr-1 h-4 w-4" />
          {t('dashboard:letters.detail.back')}
        </Link>
      </Button>

      {/* Hero band */}
      <section className="rounded-xl border border-line bg-surface-2 p-5 md:p-7">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="outline" className="gap-1.5 border-line bg-canvas">
            {incoming ? <Inbox className="h-3 w-3" aria-hidden /> : <Send className="h-3 w-3" aria-hidden />}
            {t(incoming ? 'dashboard:letters.registry.tab-incoming' : 'dashboard:letters.registry.tab-outgoing')}
          </Badge>
          <span className="font-mono text-xs tabular-nums text-muted-foreground">{letter.number}</span>
        </div>
        <h1 className="mt-2 text-xl font-bold leading-tight tracking-tight text-ink md:text-2xl">
          {letter.subject}
        </h1>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <StatusBadge status={letter.status} />
        </div>
        <dl className="mt-4 grid gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
          <HeroRow
            label={t(
              incoming
                ? 'dashboard:letters.detail.label-sender'
                : 'dashboard:letters.detail.label-addressee',
            )}
            value={letter.externalOrg}
          />
          <HeroRow
            label={t('dashboard:letters.detail.label-channel')}
            value={t(`dashboard:letters.channels.${letter.channel}`)}
          />
          {incoming && letter.receivedAt && (
            <HeroRow
              label={t('dashboard:letters.detail.label-received')}
              value={formatDate(letter.receivedAt)}
            />
          )}
          {letter.deadline && (
            <div className="flex items-baseline justify-between gap-3 sm:justify-start">
              <dt className="shrink-0 text-xs text-muted-foreground">
                {t('dashboard:letters.detail.label-deadline')}
              </dt>
              <dd
                className={cn(
                  'flex items-center gap-1.5 tabular-nums',
                  overdue ? 'font-medium text-destructive' : 'text-body',
                )}
              >
                {overdue && <AlertTriangle className="h-3.5 w-3.5 shrink-0" aria-hidden />}
                {formatDate(letter.deadline)}
                {overdue && (
                  <span className="sr-only">{t('dashboard:letters.registry.overdue')}</span>
                )}
              </dd>
            </div>
          )}
          <HeroRow
            label={t('dashboard:letters.detail.label-registered-by')}
            value={detail.registeredByName}
          />
        </dl>
      </section>

      <LetterActions
        detail={detail}
        actorUuid={acting.employee.uuid}
        gate={gate}
        hint={hint}
        isTerminal={isTerminal}
        onChanged={onChanged}
      />

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <div className="space-y-5 lg:col-span-2">
          <LetterTimeline detail={detail} audit={audit} />

          {/* Attachments */}
          <section className="rounded-xl border border-line bg-surface p-4 md:p-5">
            <h2 className="mb-3 text-sm font-semibold text-ink">
              {t('dashboard:letters.detail.attachments.title')}
            </h2>
            <div className="space-y-2.5">
              {letter.fileMeta && (
                <FileChip
                  label={t('dashboard:letters.detail.attachments.original')}
                  name={letter.fileMeta.fileName}
                  size={letter.fileMeta.fileSize}
                />
              )}
              {letter.responseFileMeta && (
                <FileChip
                  label={t('dashboard:letters.detail.attachments.response-file')}
                  name={letter.responseFileMeta.fileName}
                  size={letter.responseFileMeta.fileSize}
                />
              )}
              {letter.responseDocumentUuid && (
                <Link
                  to={`/documents/${letter.responseDocumentUuid}`}
                  className="flex items-center gap-2 rounded-lg border border-line bg-background/60 px-3 py-2.5 text-sm text-primary hover:bg-surface-2/30"
                >
                  <Link2 className="h-4 w-4 shrink-0" aria-hidden />
                  {t('dashboard:letters.detail.attachments.response-document')}
                </Link>
              )}
              {!letter.fileMeta && !letter.responseFileMeta && !letter.responseDocumentUuid && (
                <p className="text-sm text-muted-foreground">
                  {t('dashboard:letters.detail.attachments.empty')}
                </p>
              )}
            </div>
          </section>
        </div>

        <div className="space-y-5">
          {/* Metadata */}
          <section className="rounded-xl border border-line bg-surface p-4 md:p-5">
            <h2 className="mb-4 text-sm font-semibold text-ink">
              {t('dashboard:letters.detail.meta-title')}
            </h2>
            <dl className="space-y-2.5 text-sm">
              <MetaRow
                label={t('dashboard:letters.detail.label-requires-signature')}
                value={t(letter.requiresSignature ? 'common:labels.yes' : 'common:labels.no')}
              />
              {letter.routedToUnitUuid && detail.routedToUnitName && (
                <MetaRow
                  label={t('dashboard:letters.detail.label-unit')}
                  value={detail.routedToUnitName}
                />
              )}
              {detail.assignedEmployeeName && (
                <MetaRow
                  label={t('dashboard:letters.detail.label-executor')}
                  value={detail.assignedEmployeeName}
                />
              )}
              {letter.dispatchedAt && (
                <MetaRow
                  label={t('dashboard:letters.detail.label-dispatched')}
                  value={formatDate(letter.dispatchedAt)}
                />
              )}
              {letter.closedAt && (
                <MetaRow
                  label={t('dashboard:letters.detail.label-closed')}
                  value={formatDate(letter.closedAt)}
                />
              )}
              <MetaRow
                label={t('dashboard:letters.detail.label-created')}
                value={formatDateTime(letter.createdAt)}
              />
            </dl>
          </section>

          {/* Linked letter */}
          {linked && (
            <section className="rounded-xl border border-line bg-surface p-4 md:p-5">
              <h2 className="mb-3 text-sm font-semibold text-ink">
                {t(
                  incoming
                    ? 'dashboard:letters.detail.linked.title-reply'
                    : 'dashboard:letters.detail.linked.title-source',
                )}
              </h2>
              <Link
                to={`/letters/${linked.uuid}`}
                className="flex items-center justify-between gap-3 rounded-lg border border-line bg-background/60 px-3 py-2.5 hover:bg-surface-2/30"
              >
                <span className="font-mono text-xs tabular-nums text-primary">{linked.number}</span>
                <StatusBadge status={linked.status} />
              </Link>
            </section>
          )}

          {/* Signatures — only when the letter actually carries one */}
          {detail.signatures.length > 0 && (
            <SignatureHistoryCard
              signatures={detail.signatures}
              employees={employees}
              certSerials={certSerials}
            />
          )}
        </div>
      </div>
    </div>
  );
}

function HeroRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3 sm:justify-start sm:gap-2">
      <dt className="shrink-0 text-xs text-muted-foreground">{label}</dt>
      <dd className="min-w-0 text-right font-medium break-words text-body sm:text-left">{value}</dd>
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

function FileChip({ label, name, size }: { label: string; name: string; size: number }) {
  return (
    <div className="flex items-center gap-3 rounded-lg border border-line bg-background/60 px-3 py-2.5">
      <FileText className="h-4 w-4 shrink-0 text-primary" aria-hidden />
      <span className="min-w-0 flex-1">
        <span className="block text-xs text-muted-foreground">{label}</span>
        <span className="block truncate text-sm text-ink">
          {name} <span className="text-muted-foreground">({formatBytes(size)})</span>
        </span>
      </span>
    </div>
  );
}
