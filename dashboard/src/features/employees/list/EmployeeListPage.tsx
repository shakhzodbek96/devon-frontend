import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Plus, Users } from 'lucide-react';

import EmptyState from '@/components/common/EmptyState';
import LoadingState from '@/components/common/LoadingState';
import PageHeader from '@/components/common/PageHeader';
import Pagination from '@/components/common/Pagination';
import SearchInput from '@/components/common/SearchInput';
import { Button } from '@/components/ui/button';

import { listEmployees } from '@/lib/data/employees';
import { listPositions } from '@/lib/data/positions';
import { listUnits } from '@/lib/data/units';
import { useMediaQuery } from '@/lib/use-media-query';
import type { Employee, Position, Unit } from '@/types/domain';

import EmployeeFilterSheetMobile from './EmployeeFilterSheetMobile';
import EmployeeFilters from './EmployeeFilters';
import EmployeeListMobile from './EmployeeListMobile';
import EmployeeListTable from './EmployeeListTable';
import {
  defaultFilters,
  type EmployeeFiltersState,
} from './filters';

export default function EmployeeListPage() {
  const { t } = useTranslation(['dashboard', 'common']);
  const isDesktop = useMediaQuery('(min-width: 768px)');
  const navigate = useNavigate();

  const [filters, setFilters] = useState<EmployeeFiltersState>(defaultFilters);
  const [employees, setEmployees] = useState<Employee[] | null>(null);
  const [units, setUnits] = useState<Unit[]>([]);
  const [positions, setPositions] = useState<Position[]>([]);

  // Static lookups — fetched once on mount.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [u, p] = await Promise.all([listUnits(), listPositions()]);
      if (cancelled) return;
      setUnits(u);
      setPositions(p);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Re-fetch employees whenever filter inputs change. `employmentType` is
  // applied client-side because `listEmployees` doesn't accept it server-side
  // (the mock backend's EmployeeFilters interface only has search/unit/status/
  // position). Page is also client-side — cheap for a 30-employee demo.
  useEffect(() => {
    let cancelled = false;
    setEmployees(null);
    (async () => {
      const all = await listEmployees({
        search: filters.search || undefined,
        unitUuid: filters.unitUuid ?? undefined,
        status: filters.status === 'ALL' ? undefined : filters.status,
      });
      const filtered =
        filters.employmentType === 'ALL'
          ? all
          : all.filter((e) => e.employmentType === filters.employmentType);
      if (!cancelled) setEmployees(filtered);
    })();
    return () => {
      cancelled = true;
    };
  }, [filters.search, filters.unitUuid, filters.status, filters.employmentType]);

  const unitsByUuid = useMemo(
    () => new Map(units.map((u) => [u.uuid, u])),
    [units],
  );
  const positionsById = useMemo(
    () => new Map(positions.map((p) => [p.id, p.nameUz])),
    [positions],
  );

  const total = employees?.length ?? 0;
  const paged = useMemo(() => {
    if (!employees) return [];
    const from = (filters.page - 1) * filters.perPage;
    return employees.slice(from, from + filters.perPage);
  }, [employees, filters.page, filters.perPage]);

  return (
    <div className="space-y-4 md:space-y-6">
      <PageHeader
        title={t('dashboard:employees.list.title')}
        subtitle={t('dashboard:employees.list.subtitle', { total })}
        actions={
          <Button
            onClick={() => navigate('/employees/new')}
            className="w-full md:w-auto"
          >
            <Plus className="mr-2 h-4 w-4" />
            {t('dashboard:employees.list.cta-new')}
          </Button>
        }
      />

      <div className="hidden md:block">
        <EmployeeFilters filters={filters} onChange={setFilters} units={units} />
      </div>
      <div className="flex gap-2 md:hidden">
        <div className="min-w-0 flex-1">
          <SearchInput
            value={filters.search}
            onChange={(v) => setFilters({ ...filters, search: v, page: 1 })}
            placeholder={t('dashboard:employees.list.search-placeholder')}
          />
        </div>
        <EmployeeFilterSheetMobile
          filters={filters}
          onChange={setFilters}
          units={units}
        />
      </div>

      {!employees && <LoadingState rows={8} />}

      {employees && employees.length === 0 && (
        <EmptyState
          icon={Users}
          title={t('dashboard:employees.list.empty-title')}
          body={t('dashboard:employees.list.empty-body')}
          action={
            <Button onClick={() => navigate('/employees/new')}>
              <Plus className="mr-2 h-4 w-4" />
              {t('dashboard:employees.list.cta-new')}
            </Button>
          }
        />
      )}

      {employees && employees.length > 0 && (
        <>
          {isDesktop ? (
            <EmployeeListTable
              rows={paged}
              unitsByUuid={unitsByUuid}
              positionsById={positionsById}
            />
          ) : (
            <EmployeeListMobile
              rows={paged}
              unitsByUuid={unitsByUuid}
              positionsById={positionsById}
            />
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
  );
}
