import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Archive, CalendarDays, FileText, Hourglass, Inbox, Plus } from 'lucide-react';

import EmptyState from '@/components/common/EmptyState';
import ErrorState from '@/components/common/ErrorState';
import LoadingState from '@/components/common/LoadingState';
import PageHeader from '@/components/common/PageHeader';
import Pagination from '@/components/common/Pagination';
import TabLabel from '@/components/common/TabLabel';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { formatDate } from '@/i18n/uz-locale';
import { useActingEmployee } from '@/lib/acting';
import { listDocuments, listDocumentTemplates, listMyApprovals } from '@/lib/data/documents';
import { listEmployees } from '@/lib/data/employees';
import { useMediaQuery } from '@/lib/use-media-query';
import type { DocumentEntity } from '@/types/domain';

import DocumentFilters from './registry/DocumentFilters';
import DocumentsCardsMobile from './registry/DocumentsCardsMobile';
import DocumentsTable from './registry/DocumentsTable';
import { defaultFilters, type DocumentsFiltersState } from './registry/filters';

type RegistryTab = 'mine' | 'inbox' | 'review' | 'archive';

const TAB_TRIGGER_CN =
  'h-auto flex-none rounded-none px-3 py-2.5 text-sm ' +
  'data-active:text-primary data-active:font-semibold ' +
  'group-data-horizontal/tabs:after:-bottom-px ' +
  'group-data-horizontal/tabs:after:h-0.5 ' +
  'group-data-horizontal/tabs:after:bg-primary';

const TABS: { value: RegistryTab; icon: typeof FileText; key: string }[] = [
  { value: 'mine', icon: FileText, key: 'dashboard:documents.registry.tabs.mine' },
  { value: 'inbox', icon: Inbox, key: 'dashboard:documents.registry.tabs.inbox' },
  { value: 'review', icon: Hourglass, key: 'dashboard:documents.registry.tabs.review' },
  { value: 'archive', icon: Archive, key: 'dashboard:documents.registry.tabs.archive' },
];

export default function DocumentsPage() {
  const { t } = useTranslation(['dashboard', 'common']);
  const navigate = useNavigate();
  const isDesktop = useMediaQuery('(min-width: 768px)');
  const acting = useActingEmployee();

  const [tab, setTab] = useState<RegistryTab>('mine');
  const [filters, setFilters] = useState<DocumentsFiltersState>(defaultFilters);
  const [docs, setDocs] = useState<DocumentEntity[] | null>(null);
  const [error, setError] = useState(false);
  const [retryKey, setRetryKey] = useState(0);

  // Static lookups — fetched once on mount.
  const [templateNames, setTemplateNames] = useState<Map<string, string>>(new Map());
  const [employeeNames, setEmployeeNames] = useState<Map<string, string>>(new Map());
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const [templates, employees] = await Promise.all([
        listDocumentTemplates(),
        listEmployees(),
      ]);
      if (cancelled) return;
      setTemplateNames(new Map(templates.map((tpl) => [tpl.uuid, tpl.nameUz])));
      setEmployeeNames(new Map(employees.map((e) => [e.uuid, e.fullNameGenerated])));
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // The acting persona's uuid is a dependency: switching POV refetches every
  // tab's feed (the step-16 rail re-resolves `acting` on its own).
  const actingUuid = acting?.employee.uuid;

  useEffect(() => {
    if (!actingUuid) return;
    let cancelled = false;
    setDocs(null);
    setError(false);
    void (async () => {
      try {
        const search = filters.search || undefined;
        const status = filters.status === 'ALL' ? undefined : filters.status;
        let rows: DocumentEntity[];
        if (tab === 'mine') {
          rows = await listDocuments({ creatorUuid: actingUuid, search, status });
        } else if (tab === 'inbox') {
          // Non-DRAFT only: a recipient must not see documents still being drafted.
          rows = (await listDocuments({ recipientUuid: actingUuid, search, status })).filter(
            (d) => d.status !== 'DRAFT',
          );
        } else if (tab === 'review') {
          // Docs where the acting persona appears in the current round (their
          // actionable decision items) + the persona's own docs in review.
          const [queue, own] = await Promise.all([
            listMyApprovals(actingUuid),
            listDocuments({ status: 'IN_REVIEW', creatorUuid: actingUuid, search }),
          ]);
          const byUuid = new Map<string, DocumentEntity>();
          for (const item of queue) {
            if (item.kind === 'decision') byUuid.set(item.document.uuid, item.document);
          }
          for (const d of own) byUuid.set(d.uuid, d);
          rows = [...byUuid.values()]
            .filter((d) => !search || matchesSearch(d, search))
            .filter((d) => !status || d.status === status)
            .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
        } else {
          rows = await listDocuments({ archivedOnly: true, search, status });
        }
        if (!cancelled) setDocs(rows);
      } catch {
        if (!cancelled) setError(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [tab, actingUuid, filters.search, filters.status, retryKey]);

  const total = docs?.length ?? 0;
  const paged = useMemo(() => {
    if (!docs) return [];
    const from = (filters.page - 1) * filters.perPage;
    return docs.slice(from, from + filters.perPage);
  }, [docs, filters.page, filters.perPage]);

  // Arxiv: group the page's rows by archive day, newest day first — the §2.2
  // "daily archive" surface.
  const archiveGroups = useMemo(() => {
    if (tab !== 'archive') return [];
    const groups = new Map<string, DocumentEntity[]>();
    for (const d of paged) {
      const day = formatDate(d.archivedAt ?? d.createdAt);
      const bucket = groups.get(day);
      if (bucket) bucket.push(d);
      else groups.set(day, [d]);
    }
    return [...groups.entries()];
  }, [tab, paged]);

  function onTabChange(next: string) {
    setTab(next as RegistryTab);
    setFilters((f) => ({ ...f, page: 1 }));
  }

  const list = isDesktop ? (
    <DocumentsTable rows={paged} templateNames={templateNames} employeeNames={employeeNames} />
  ) : (
    <DocumentsCardsMobile
      rows={paged}
      templateNames={templateNames}
      employeeNames={employeeNames}
    />
  );

  return (
    <div className="space-y-4 md:space-y-6">
      <PageHeader
        title={t('dashboard:documents.registry.title')}
        subtitle={t('dashboard:documents.registry.subtitle')}
        actions={
          <Button onClick={() => navigate('/documents/new')} className="w-full md:w-auto">
            <Plus className="mr-2 h-4 w-4" />
            {t('dashboard:documents.registry.cta-new')}
          </Button>
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
            </TabsTrigger>
          ))}
        </TabsList>

        {TABS.map((tb) => (
          <TabsContent key={tb.value} value={tb.value}>
            <div className="space-y-4 pt-4">
              {tb.value === 'archive' && (
                <p className="text-sm text-muted-foreground">
                  {t('dashboard:documents.registry.archive-hint')}
                </p>
              )}

              <DocumentFilters filters={filters} onChange={setFilters} />

              {error && <ErrorState onRetry={() => setRetryKey((k) => k + 1)} />}

              {!error && !docs && <LoadingState rows={6} />}

              {!error && docs && docs.length === 0 && (
                <EmptyState
                  icon={tb.value === 'archive' ? Archive : FileText}
                  title={t(
                    tb.value === 'archive'
                      ? 'dashboard:documents.registry.empty-archive-title'
                      : 'dashboard:documents.registry.empty-title',
                  )}
                  body={t(
                    tb.value === 'archive'
                      ? 'dashboard:documents.registry.empty-archive-body'
                      : 'dashboard:documents.registry.empty-body',
                  )}
                  action={
                    tb.value !== 'archive' ? (
                      <Button onClick={() => navigate('/documents/new')}>
                        <Plus className="mr-2 h-4 w-4" />
                        {t('dashboard:documents.registry.cta-new')}
                      </Button>
                    ) : undefined
                  }
                />
              )}

              {!error && docs && docs.length > 0 && (
                <>
                  {tb.value === 'archive' ? (
                    <div className="space-y-5">
                      {archiveGroups.map(([day, rows]) => (
                        <section key={day} className="space-y-2">
                          <h3 className="flex items-center gap-2 text-sm font-semibold text-ink">
                            <CalendarDays className="h-3.5 w-3.5 text-muted-foreground" aria-hidden />
                            {day}
                          </h3>
                          {isDesktop ? (
                            <DocumentsTable
                              rows={rows}
                              templateNames={templateNames}
                              employeeNames={employeeNames}
                            />
                          ) : (
                            <DocumentsCardsMobile
                              rows={rows}
                              templateNames={templateNames}
                              employeeNames={employeeNames}
                            />
                          )}
                        </section>
                      ))}
                    </div>
                  ) : (
                    list
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

function matchesSearch(d: DocumentEntity, q: string): boolean {
  const needle = q.toLowerCase();
  return (
    d.number.toLowerCase().includes(needle) || d.title.toLowerCase().includes(needle)
  );
}
