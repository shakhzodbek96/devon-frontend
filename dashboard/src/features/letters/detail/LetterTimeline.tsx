import { useTranslation } from 'react-i18next';

import { formatDateTime } from '@/i18n/uz-locale';
import type { LetterDetail } from '@/lib/data/letters';
import { cn } from '@/lib/utils';
import type { AuditEntry } from '@/types/domain';

import { buildLetterStations, type LetterStation, type StationKey } from './letterStations';

interface Props {
  detail: LetterDetail;
  /** listAudit({ resourceUuid }) rows for this letter, newest-first. */
  audit: AuditEntry[];
}

const LABEL_KEY: Record<StationKey, string> = {
  registered: 'dashboard:letters.detail.timeline.registered',
  routed: 'dashboard:letters.detail.timeline.routed',
  assigned: 'dashboard:letters.detail.timeline.assigned',
  started: 'dashboard:letters.detail.timeline.started',
  submitted: 'dashboard:letters.detail.timeline.submitted',
  accepted: 'dashboard:letters.detail.timeline.accepted',
  signed: 'dashboard:letters.detail.timeline.signed',
  dispatched: 'dashboard:letters.detail.timeline.dispatched',
  closed: 'dashboard:letters.detail.timeline.closed',
  'closed-no-response': 'dashboard:letters.detail.timeline.closed-no-response',
};

const ctxString = (entry: AuditEntry | undefined, key: string): string | undefined => {
  const v = entry?.context?.[key];
  return typeof v === 'string' ? v : undefined;
};

/**
 * BP-3 routing/execution timeline — the AssignmentTimeline / ApprovalSheetCard
 * vertical-rail pattern. Past = filled primary dot, current = primary ring,
 * future = hollow. Actor + date come from each station's audit row, falling
 * back to the resolved names on LetterDetail when a seeded row predates its
 * trail (per the step-21 note: show the station without actor detail rather
 * than hiding it).
 */
export default function LetterTimeline({ detail, audit }: Props) {
  const { t } = useTranslation(['dashboard']);
  const { letter } = detail;
  const stations = buildLetterStations(letter, audit);

  function secondary(s: LetterStation): string | undefined {
    const actor = s.entry?.actorName;
    switch (s.key) {
      case 'registered': {
        const who = actor ?? detail.registeredByName;
        return who
          ? t('dashboard:letters.detail.timeline.lane-devonxona', { name: who })
          : t('dashboard:letters.detail.timeline.lane-devonxona-only');
      }
      case 'routed': {
        const unit = ctxString(s.entry, 'unit') ?? detail.routedToUnitName;
        if (actor && unit) return `${actor} → ${unit}`;
        return unit ?? actor;
      }
      case 'assigned': {
        const executor = ctxString(s.entry, 'executor') ?? detail.assignedEmployeeName;
        if (actor && executor) return `${actor} → ${executor}`;
        return executor ?? actor;
      }
      case 'started':
      case 'accepted':
        return actor ?? detail.assignedEmployeeName;
      case 'submitted': {
        const mode = ctxString(s.entry, 'mode');
        const modeLabel =
          mode === 'comment' || (!mode && letter.executionComment)
            ? t('dashboard:letters.detail.timeline.mode-comment')
            : t('dashboard:letters.detail.timeline.mode-response');
        return actor ? `${actor} · ${modeLabel}` : modeLabel;
      }
      case 'signed': {
        const serial = ctxString(s.entry, 'certificateSerial');
        if (actor && serial) return `${actor} · ${serial}`;
        return actor;
      }
      case 'dispatched': {
        // Incoming carries the new outgoing number in context; an outgoing row
        // is itself the dispatched letter.
        const outgoing =
          letter.direction === 'OUTGOING'
            ? letter.number
            : ctxString(s.entry, 'outgoingNumber');
        if (actor && outgoing) return `${actor} · ${outgoing}`;
        return outgoing ?? actor;
      }
      default:
        return undefined;
    }
  }

  function dateFor(s: LetterStation): string | undefined {
    if (s.entry?.createdAt) return s.entry.createdAt;
    if (s.key === 'registered') return letter.createdAt;
    if (s.key === 'dispatched') return letter.dispatchedAt;
    return undefined;
  }

  return (
    <section className="rounded-xl border border-line bg-surface p-4 md:p-5">
      <h2 className="mb-4 text-sm font-semibold text-ink">
        {t('dashboard:letters.detail.timeline.title')}
      </h2>

      <ol className="relative ml-2 space-y-4 border-l-2 border-line pl-5">
        {stations.map((s) => {
          const sub = secondary(s);
          const at = dateFor(s);
          return (
            <li key={s.key} className="relative">
              <span
                className={cn(
                  'absolute top-1.5 -left-[27px] h-3 w-3 rounded-full',
                  s.state === 'current'
                    ? 'border-2 border-primary bg-surface ring-4 ring-brand-soft'
                    : s.state === 'past'
                      ? 'bg-primary'
                      : 'border-2 border-line bg-surface',
                )}
                aria-hidden
              />
              <div
                className={cn(
                  'text-sm',
                  s.state === 'future' ? 'text-muted-foreground' : 'text-ink',
                )}
              >
                <p className="font-medium">
                  {t(LABEL_KEY[s.key])}
                  {s.state === 'current' && (
                    <span className="ml-2 text-xs font-medium text-primary">
                      {t('dashboard:letters.detail.timeline.current')}
                    </span>
                  )}
                </p>
                {sub && <p className="mt-0.5 text-xs text-muted-foreground">{sub}</p>}
                {at && (
                  <p className="mt-0.5 text-xs tabular-nums text-muted-foreground">
                    {formatDateTime(at)}
                  </p>
                )}
              </div>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
