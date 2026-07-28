import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Filter, Plus } from 'lucide-react';
import { toast } from 'sonner';

import LoadingState from '@/components/common/LoadingState';
import PageHeader from '@/components/common/PageHeader';
import SearchInput from '@/components/common/SearchInput';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

import { listEmployees } from '@/lib/mock-backend';
import { archiveUnit, listUnits, MockNetworkError } from '@/lib/data/units';
import { useMediaQuery } from '@/lib/use-media-query';
import { useAuthStore } from '@/stores/useAuthStore';
import type { Employee, Unit } from '@/types/domain';

import UnitDetailsSheet from './UnitDetailsSheet';
import UnitFormSheet from './UnitFormSheet';
import UnitsAccordionMobile from './UnitsAccordionMobile';
import UnitsTreeDesktop from './UnitsTreeDesktop';

type StatusFilter = 'ALL' | 'ACTIVE' | 'ARCHIVED';

export default function UnitsPage() {
  const { t } = useTranslation(['dashboard', 'common']);
  const isDesktop = useMediaQuery('(min-width: 768px)');
  const actor = useAuthStore((s) => s.user?.uuid ?? '');

  const [units, setUnits] = useState<Unit[] | null>(null);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<StatusFilter>('ACTIVE');

  const [formOpen, setFormOpen] = useState(false);
  const [editingUnit, setEditingUnit] = useState<Unit | null>(null);
  const [defaultParent, setDefaultParent] = useState<string | null>(null);
  const [detailsUnit, setDetailsUnit] = useState<Unit | null>(null);

  const reload = useCallback(async () => {
    const [u, e] = await Promise.all([listUnits(), listEmployees()]);
    setUnits(u);
    setEmployees(e);
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  function startCreate(parentUuid: string | null) {
    setEditingUnit(null);
    setDefaultParent(parentUuid);
    setFormOpen(true);
  }

  function startEdit(u: Unit) {
    setEditingUnit(u);
    setDefaultParent(null);
    setFormOpen(true);
  }

  async function handleArchive(u: Unit) {
    const activeInUnit = employees.filter(
      (e) => e.primaryUnitUuid === u.uuid && e.status !== 'TERMINATED',
    );
    if (activeInUnit.length > 0) {
      toast.error(t('dashboard:units.errors.has-employees', { count: activeInUnit.length }));
      return;
    }
    try {
      await archiveUnit(u.uuid, actor);
      toast.success(t('dashboard:units.toast.archived'));
      await reload();
    } catch (err) {
      if (err instanceof MockNetworkError) toast.error(t('common:errors.network'));
      else toast.error(t('common:errors.unknown'));
    }
  }

  const filtered = (units ?? []).filter((u) =>
    filterStatus === 'ALL' ? true : u.status === filterStatus,
  );

  return (
    <div className="space-y-4 md:space-y-6">
      <PageHeader
        title={t('dashboard:units.page-title')}
        subtitle={t('dashboard:units.page-subtitle')}
        actions={
          <Button onClick={() => startCreate(null)} className="w-full md:w-auto">
            <Plus className="mr-2 h-4 w-4" />
            {t('dashboard:units.tree.add-root')}
          </Button>
        }
      />

      <div className="flex flex-col gap-3 md:flex-row">
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder={t('dashboard:units.search-placeholder')}
        />
        <Select
          value={filterStatus}
          onValueChange={(v) => setFilterStatus(v as StatusFilter)}
        >
          <SelectTrigger className="md:w-44">
            <Filter className="mr-2 h-4 w-4" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ACTIVE">{t('common:status.active')}</SelectItem>
            <SelectItem value="ARCHIVED">{t('common:status.archived')}</SelectItem>
            <SelectItem value="ALL">{t('common:labels.all')}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {!units && <LoadingState rows={6} />}
      {units &&
        (isDesktop ? (
          <UnitsTreeDesktop
            units={filtered}
            employees={employees}
            search={search}
            onEdit={startEdit}
            onAddChild={(p) => startCreate(p.uuid)}
            onArchive={handleArchive}
            onOpen={setDetailsUnit}
          />
        ) : (
          <UnitsAccordionMobile
            units={filtered}
            employees={employees}
            onOpen={setDetailsUnit}
            onAddChild={(p) => startCreate(p.uuid)}
          />
        ))}

      <UnitFormSheet
        open={formOpen}
        onOpenChange={setFormOpen}
        unit={editingUnit}
        allUnits={units ?? []}
        defaultParentUuid={defaultParent}
        onSaved={reload}
      />

      <UnitDetailsSheet
        unit={detailsUnit}
        allUnits={units ?? []}
        onClose={() => setDetailsUnit(null)}
        onEdit={(u) => {
          setDetailsUnit(null);
          startEdit(u);
        }}
        onAddChild={(p) => {
          setDetailsUnit(null);
          startCreate(p.uuid);
        }}
        onArchive={async (u) => {
          setDetailsUnit(null);
          await handleArchive(u);
        }}
        onOpenUnit={(u) => setDetailsUnit(u)}
      />
    </div>
  );
}
