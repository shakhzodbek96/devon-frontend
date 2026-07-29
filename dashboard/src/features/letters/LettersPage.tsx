import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Inbox, Mail, Plus, Send } from 'lucide-react';

import EmptyState from '@/components/common/EmptyState';
import ErrorState from '@/components/common/ErrorState';
import LoadingState from '@/components/common/LoadingState';
import PageHeader from '@/components/common/PageHeader';
import Pagination from '@/components/common/Pagination';
import TabLabel from '@/components/common/TabLabel';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useActingEmployee } from '@/lib/acting';
import { listEmployees } from '@/lib/data/employees';
import { listLetters } from '@/lib/data/letters';
import { listUnits } from '@/lib/data/units';
import { useMediaQuery } from '@/lib/use-media-query';
import type { Letter, LetterDirection } from '@/types/domain';

import LetterFilters from './LetterFilters';
import LetterCardMobile from './LetterCardMobile';
import LettersTable from './LettersTable';
import { defaultFilters, type LettersFiltersState } from './filters';

const TAB_TRIGGER_CN =
  'h-auto flex-none rounded-none px-3 py-2.5 text-sm ' +
  'data-active:text-primary data-active:font-semibold ' +
  'group-data-horizontal/tabs:after:-bottom-px ' +
  'group-data-horizontal/tabs:after:h-0.5 ' +
  'group-data-horizontal/tabs:after:bg-primary';

const TABS: { value: LetterDirection; icon: typeof Inbox; key: string }[] = [
  { value: 'INCOMING', icon: Inbox, key: 'dashboard:letters.registry.tab-incoming' },
  { value: 'OUTGOING', icon: Send, key: 'dashboard:letters.registry.tab-outgoing' },
];

export default function LettersPage() {
  const { t } = useTranslation(['dashboard', 'common']);
  const isDesktop = useMediaQuery('(min-width: 768px)');
  const acting = useActingEmployee();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const [tab, setTab] = useState<LetterDirection>('INCOMING');
  const [filters, setFilters] = useState<LettersFiltersState>(defaultFilters);
  const [letters, setLetters] = useState<Letter[] | null>(null);
  const [error, setError] = useState(false);
  const [retryKey, setRetryKey] = useState(0);

  // Registry CTA is Devonxona-only; the policy layer enforces regardless
  // (a console call from any other persona throws `not-devonxona`).
  const isDevonxona = acting?.roles.includes('ROLE_DEVONXONA') ?? false;

  // Deep-link from the home overdue-letters stat card: pre-set the overdue
  // filter, then strip the param so a refresh/back doesn't re-apply it.
  useEffect(() => {
    if (searchParams.get('overdue') !== '1') return;
    setFilters((f) => ({ ...f, overdueOnly: true, page: 1 }));
    const next = new URLSearchParams(searchParams);
    next.delete('overdue');
    setSearchParams(next, { replace: true });
  }, [searchParams, setSearchParams]);

  // Static lookups for the Bo'linma / Ijrochi column — fetched once on mount.
  const [unitNames, setUnitNames] = useState<Map<string, string>>(new Map());
  const [employeeNames, setEmployeeNames] = useState<Map<string, string>>(new Map());
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const [units, employees] = await Promise.all([listUnits(), listEmployees()]);
      if (cancelled) return;
      setUnitNames(new Map(units.map((u) => [u.uuid, u.nameUz])));
      setEmployeeNames(new Map(employees.map((e) => [e.uuid, e.fullNameGenerated])));
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // One direction-less fetch feeds both tabs (count pills need both halves);
  // the 12-row demo registry makes the client-side split free.
  useEffect(() => {
    let cancelled = false;
    setLetters(null);
    setError(false);
    void (async () => {
      try {
        const rows = await listLetters({
          search: filters.search || undefined,
          status: filters.status === 'ALL' ? undefined : filters.status,
          overdueOnly: filters.overdueOnly || undefined,
        });
        if (!cancelled) setLetters(rows);
      } catch {
        if (!cancelled) setError(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [filters.search, filters.status, filters.overdueOnly, retryKey]);

  const byDirection = useMemo(() => {
    const map: Record<LetterDirection, Letter[]> = { INCOMING: [], OUTGOING: [] };
    for (const l of letters ?? []) map[l.direction].push(l);
    return map;
  }, [letters]);

  const rows = byDirection[tab];
  const total = rows.length;
  const paged = useMemo(() => {
    const from = (filters.page - 1) * filters.perPage;
    return rows.slice(from, from + filters.perPage);
  }, [rows, filters.page, filters.perPage]);

  function onTabChange(next: string) {
    setTab(next as LetterDirection);
    setFilters((f) => ({ ...f, page: 1 }));
  }

  return (
    <div className="space-y-4 md:space-y-6">
      <PageHeader
        title={t('dashboard:letters.registry.title')}
        subtitle={t('dashboard:letters.registry.subtitle')}
        actions={
          isDevonxona ? (
            <Button onClick={() => navigate('/letters/new')} className="w-full md:w-auto">
              <Plus className="mr-2 h-4 w-4" />
              {t('dashboard:letters.registry.cta-register')}
            </Button>
          ) : undefined
        }
      />

      <Tabs value={tab} onValueChange={onTabChange} className="w-full">
        <TabsList
          variant="line"
          className="no-scrollbar h-auto w-full justify-start gap-1 overflow-x-auto rounded-none border-b border-line p-0 md:gap-2"
        >
          {TABS.map((tb) => (
            <TabsTrigger key={tb.value} value={tb.value} className={TAB_TRIGGER_CN}>
              <tb.icon className="mr-2 h-4 w-4" />
              <TabLabel>{t(tb.key)}</TabLabel>
              {letters && (
                <span className="ml-2 rounded-full bg-muted px-1.5 text-[10px] font-semibold tabular-nums text-muted-foreground">
                  {byDirection[tb.value].length}
                </span>
              )}
            </TabsTrigger>
          ))}
        </TabsList>

        {TABS.map((tb) => (
          <TabsContent key={tb.value} value={tb.value}>
            <div className="space-y-4 pt-4">
              <LetterFilters filters={filters} onChange={setFilters} />

              {error && <ErrorState onRetry={() => setRetryKey((k) => k + 1)} />}

              {!error && !letters && <LoadingState rows={6} />}

              {!error && letters && rows.length === 0 && (
                <EmptyState
                  icon={Mail}
                  title={t('dashboard:letters.registry.empty-title')}
                  body={t('dashboard:letters.registry.empty-body')}
                />
              )}

              {!error && letters && rows.length > 0 && (
                <>
                  {isDesktop ? (
                    <LettersTable
                      rows={paged}
                      unitNames={unitNames}
                      employeeNames={employeeNames}
                    />
                  ) : (
                    <LetterCardMobile rows={paged} />
                  )}
                  <Pagination
                    page={filters.page}
                    perPage={filters.perPage}
                    total={total}
                    onChange={(page) => setFilters({ ...filters, page })}
                  />
                </>
              )}
            </div>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
