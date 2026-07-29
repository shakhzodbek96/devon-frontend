import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Users, Network, KeySquare, FileClock, Files, MailWarning } from 'lucide-react';
import StatCard from '@/components/common/StatCard';
import { Skeleton } from '@/components/ui/skeleton';
import { useActingEmployee } from '@/lib/acting';
import { listCertificates } from '@/lib/data/certificates';
import { listDocuments, listMyApprovals } from '@/lib/data/documents';
import { listEmployees } from '@/lib/data/employees';
import { listLetters } from '@/lib/data/letters';
import { listUnits } from '@/lib/data/units';

/** Org-wide M1 counts — independent of the acting persona. */
interface OrgStats {
  emp: number;
  units: number;
  activeCerts: number;
}

/** Persona-scoped M2 counts — recomputed on every POV switch. */
interface PersonaStats {
  myApprovals: number;
  documents: number;
  overdueLetters: number;
}

export default function StatsRow() {
  const { t } = useTranslation(['dashboard']);
  const acting = useActingEmployee();
  const actingUuid = acting?.employee.uuid;
  const [org, setOrg] = useState<OrgStats | null>(null);
  const [persona, setPersona] = useState<PersonaStats | null>(null);

  // M1 org-wide counts load once. They don't change with POV.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [emp, units, certs] = await Promise.all([
        listEmployees(),
        listUnits(),
        listCertificates(),
      ]);
      if (cancelled) return;
      setOrg({
        emp: emp.filter((e) => e.status === 'ACTIVE').length,
        units: units.filter((u) => u.status === 'ACTIVE').length,
        activeCerts: certs.filter((c) => c.status === 'ACTIVE').length,
      });
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // M2 persona counts recompute when the acting persona changes. We do NOT
  // null `persona` on POV switch — the old numbers stay until the new ones
  // arrive, so the M1 cards never flash a skeleton when only the POV changed.
  useEffect(() => {
    if (!actingUuid) return;
    let cancelled = false;
    (async () => {
      try {
        const [approvals, docs, overdue] = await Promise.all([
          listMyApprovals(actingUuid),
          listDocuments(),
          listLetters({ overdueOnly: true }),
        ]);
        if (cancelled) return;
        setPersona({
          myApprovals: approvals.length,
          documents: docs.filter((d) => d.status !== 'DRAFT').length,
          overdueLetters: overdue.length,
        });
      } catch {
        // Read flake — keep the previous counts; the next POV change retries.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [actingUuid]);

  if (!org || !persona) {
    return (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <Skeleton key={i} className="h-32 rounded-xl" />
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <StatCard
        icon={Users}
        label={t('dashboard:home.stats.employees')}
        value={org.emp}
        tone="primary"
      />
      <StatCard icon={Network} label={t('dashboard:home.stats.units')} value={org.units} />
      <StatCard
        icon={KeySquare}
        label={t('dashboard:home.stats.active-certs')}
        value={org.activeCerts}
        tone="neutral"
      />
      <StatCard
        icon={FileClock}
        label={t('dashboard:home.stats.my-approvals')}
        value={persona.myApprovals}
        tone="warning"
        to="/approvals"
      />
      <StatCard
        icon={Files}
        label={t('dashboard:home.stats.documents')}
        value={persona.documents}
        to="/documents"
      />
      <StatCard
        icon={MailWarning}
        label={t('dashboard:home.stats.overdue-letters')}
        value={persona.overdueLetters}
        tone={persona.overdueLetters > 0 ? 'destructive' : 'default'}
        to="/letters?overdue=1"
      />
    </div>
  );
}
