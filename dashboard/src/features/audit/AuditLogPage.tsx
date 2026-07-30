import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FilterX } from 'lucide-react';

import Combobox from '@/components/common/Combobox';
import EmptyState from '@/components/common/EmptyState';
import ErrorState from '@/components/common/ErrorState';
import LoadingState from '@/components/common/LoadingState';
import PageHeader from '@/components/common/PageHeader';
import Pagination from '@/components/common/Pagination';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { listAudit } from '@/lib/data/audit';
import { listUnits } from '@/lib/data/units';
import type { AuditEntry, AuditResourceType, Unit } from '@/types/domain';

import AuditEntryRow from './AuditEntryRow';

const PER_PAGE = 50;

const RESOURCE_TYPES: AuditResourceType[] = [
  'unit',
  'employee',
  'assignment',
  'certificate',
  'user',
  'profile-request',
  'document',
  'letter',
  'task',
  'conference-room',
  'conference-booking',
  'office-network',
  'work-shift',
  'attendance',
  'tabel',
  'tabel-registry',
  'collegial-body',
  'protocol',
];

interface Filters {
  resourceType: '' | AuditResourceType;
  actorUuid: string | null;
  dateFrom: string;
  dateTo: string;
}

const EMPTY_FILTERS: Filters = {
  resourceType: '',
  actorUuid: null,
  dateFrom: '',
  dateTo: '',
};

export default function AuditLogPage() {
  const { t } = useTranslation(['dashboard', 'common']);
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS);
  const [page, setPage] = useState(1);
  const [rows, setRows] = useState<AuditEntry[] | null>(null);
  const [units, setUnits] = useState<Unit[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Distinct actor options — derived from the full audit table so a fresh
  // filter dropdown shows whichever actors have touched anything in the demo.
  const [actorOptions, setActorOptions] = useState<{ uuid: string; name: string }[]>([]);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const [all, allUnits] = await Promise.all([listAudit(), listUnits()]);
        if (!active) return;
        const seen = new Map<string, string>();
        for (const entry of all) {
          if (!seen.has(entry.actorUuid)) seen.set(entry.actorUuid, entry.actorName);
        }
        setActorOptions(
          Array.from(seen.entries()).map(([uuid, name]) => ({ uuid, name })),
        );
        setUnits(allUnits);
      } catch {
        // Surfaced by the filtered fetch below.
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let active = true;
    setRows(null);
    setError(null);
    (async () => {
      try {
        const result = await listAudit({
          resourceType: filters.resourceType || undefined,
          actorUuid: filters.actorUuid ?? undefined,
          dateFrom: filters.dateFrom || undefined,
          dateTo: filters.dateTo || undefined,
        });
        if (!active) return;
        setRows(result);
      } catch {
        if (!active) return;
        setError(t('common:errors.network'));
      }
    })();
    return () => {
      active = false;
    };
  }, [filters, t]);

  // Reset to page 1 whenever the filter shape changes — otherwise we can
  // get stranded on page 5 of a 1-page result.
  useEffect(() => setPage(1), [filters]);

  const unitsByUuid = useMemo(() => new Map(units.map((u) => [u.uuid, u])), [units]);

  const paged = rows
    ? rows.slice((page - 1) * PER_PAGE, page * PER_PAGE)
    : [];

  const hasActiveFilters =
    filters.resourceType !== '' ||
    filters.actorUuid !== null ||
    filters.dateFrom !== '' ||
    filters.dateTo !== '';

  function reset() {
    setFilters(EMPTY_FILTERS);
  }

  const actorComboOptions = actorOptions.map((a) => ({ value: a.uuid, label: a.name }));

  return (
    <div className="space-y-5 md:space-y-6">
      <PageHeader
        title={t('dashboard:audit.title')}
        subtitle={t('dashboard:audit.subtitle')}
        actions={
          hasActiveFilters && (
            <Button variant="ghost" size="sm" onClick={reset}>
              <FilterX className="mr-1 h-4 w-4" />
              {t('dashboard:audit.filters.reset')}
            </Button>
          )
        }
      />

      <section
        aria-label={t('common:actions.filter')}
        className="grid grid-cols-1 gap-3 rounded-lg border border-line bg-surface p-4 md:grid-cols-2 lg:grid-cols-4"
      >
        <div className="space-y-1.5">
          <Label htmlFor="audit-resource-type">
            {t('dashboard:audit.filters.resource-type')}
          </Label>
          <Select
            value={filters.resourceType === '' ? 'ALL' : filters.resourceType}
            onValueChange={(value) =>
              setFilters((f) => ({
                ...f,
                resourceType: value === 'ALL' ? '' : (value as AuditResourceType),
              }))
            }
          >
            <SelectTrigger id="audit-resource-type" className="w-full">
              <SelectValue placeholder={t('dashboard:audit.filters.resource-type')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">{t('dashboard:audit.filters.resource-type-all')}</SelectItem>
              {RESOURCE_TYPES.map((rt) => (
                <SelectItem key={rt} value={rt}>
                  {t(`dashboard:audit.resource-types.${rt}`)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="audit-actor">{t('dashboard:audit.filters.actor')}</Label>
          <Combobox
            id="audit-actor"
            options={actorComboOptions}
            value={filters.actorUuid}
            onChange={(value) => setFilters((f) => ({ ...f, actorUuid: value || null }))}
            placeholder={t('dashboard:audit.filters.actor-all')}
            searchPlaceholder={t('dashboard:audit.filters.actor-search')}
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="audit-date-from">
            {t('dashboard:audit.filters.date-from')}
          </Label>
          <Input
            id="audit-date-from"
            type="date"
            value={filters.dateFrom}
            max={filters.dateTo || undefined}
            onChange={(e) => setFilters((f) => ({ ...f, dateFrom: e.target.value }))}
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="audit-date-to">{t('dashboard:audit.filters.date-to')}</Label>
          <Input
            id="audit-date-to"
            type="date"
            value={filters.dateTo}
            min={filters.dateFrom || undefined}
            onChange={(e) => setFilters((f) => ({ ...f, dateTo: e.target.value }))}
          />
        </div>
      </section>

      {error ? (
        <ErrorState body={error} onRetry={() => setFilters((f) => ({ ...f }))} />
      ) : rows === null ? (
        <LoadingState rows={6} />
      ) : rows.length === 0 ? (
        <EmptyState title={t('dashboard:audit.empty')} />
      ) : (
        <>
          {/* Mobile: card list. lg:hidden mirrors the certs Kanban + employee
              list pattern — desktop table below kicks in at lg+. */}
          <ul className="space-y-3 lg:hidden">
            {paged.map((entry) => (
              <AuditEntryRow
                key={entry.uuid}
                entry={entry}
                unitsByUuid={unitsByUuid}
                variant="card"
              />
            ))}
          </ul>

          {/* Desktop table */}
          <div className="hidden overflow-hidden rounded-lg border border-line bg-surface lg:block">
            <Table>
              <TableHeader className="bg-surface-2/40">
                <TableRow>
                  <TableHead>{t('dashboard:audit.col.time')}</TableHead>
                  <TableHead>{t('dashboard:audit.col.actor')}</TableHead>
                  <TableHead>{t('dashboard:audit.col.action')}</TableHead>
                  <TableHead>{t('dashboard:audit.col.resource')}</TableHead>
                  <TableHead>{t('dashboard:audit.col.details')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paged.map((entry) => (
                  <AuditEntryRow
                    key={entry.uuid}
                    entry={entry}
                    unitsByUuid={unitsByUuid}
                    variant="row"
                  />
                ))}
              </TableBody>
            </Table>
          </div>

          <Pagination
            page={page}
            perPage={PER_PAGE}
            total={rows.length}
            onChange={setPage}
          />
        </>
      )}
    </div>
  );
}
