import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Download } from 'lucide-react';
import { toast } from 'sonner';

import LoadingState from '@/components/common/LoadingState';
import PageHeader from '@/components/common/PageHeader';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

import { formatDateTime } from '@/i18n/uz-locale';
import { getTabelRegistry, TabelNetworkError } from '@/lib/data/tabels';
import type { TabelRegistry, TabelStatus } from '@/types/domain';

import { exportHtmlTableAsExcel } from './tabelExport';

function currentPeriod(): string {
  return new Date().toISOString().slice(0, 7);
}

const STATUS_BADGE: Record<TabelStatus, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  DRAFT: 'outline',
  SENT_TO_HEAD: 'secondary',
  HEAD_REJECTED: 'destructive',
  SENT_TO_HR: 'secondary',
  HR_REJECTED: 'destructive',
  HR_ACCEPTED: 'default',
};

export default function TabelRegistryPage() {
  const { t } = useTranslation(['dashboard', 'common']);
  const [period, setPeriod] = useState(currentPeriod());
  const [registry, setRegistry] = useState<TabelRegistry | null>(null);

  const reload = useCallback(async () => {
    setRegistry(null);
    try {
      setRegistry(await getTabelRegistry(period));
    } catch (err) {
      if (err instanceof TabelNetworkError) toast.error(t('common:errors.network'));
      else toast.error(t('common:errors.unknown'));
    }
  }, [period, t]);

  useEffect(() => {
    void reload(); // eslint-disable-line react-hooks/set-state-in-effect
  }, [reload]);

  function handleExport() {
    if (!registry) return;
    const headers = [t('dashboard:tabelRegistry.col-unit'), t('dashboard:tabelRegistry.col-status')];
    const rows = registry.units.map((row) => [
      row.unitNameUz,
      row.status ? t(`dashboard:tabels.status.${row.status}`) : t('dashboard:tabelRegistry.no-tabel'),
    ]);
    exportHtmlTableAsExcel(`tabel-registry-${period}.xls`, headers, rows);
  }

  const readyCount = registry?.units.filter((u) => u.status === 'HR_ACCEPTED').length ?? 0;

  return (
    <div className="space-y-6 md:space-y-8">
      <PageHeader
        title={t('dashboard:tabelRegistry.page-title')}
        subtitle={t('dashboard:tabelRegistry.page-subtitle')}
        actions={
          <Button variant="outline" disabled={!registry} onClick={handleExport}>
            <Download className="mr-2 h-4 w-4" />
            {t('dashboard:tabelRegistry.export')}
          </Button>
        }
      />

      <div className="max-w-56 space-y-1.5">
        <label className="text-xs font-medium text-muted-foreground">
          {t('dashboard:tabelRegistry.period')}
        </label>
        <input
          type="month"
          value={period}
          onChange={(e) => setPeriod(e.target.value)}
          className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
        />
      </div>

      {!registry && <LoadingState rows={4} />}

      {registry && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            <p className="text-sm text-muted-foreground">
              {t('dashboard:tabelRegistry.ready-count', {
                ready: readyCount,
                total: registry.units.length,
              })}
            </p>
            {registry.dispatched && registry.dispatchedAt ? (
              <Badge variant="default">
                {t('dashboard:tabelRegistry.dispatched-at', {
                  time: formatDateTime(registry.dispatchedAt),
                })}
              </Badge>
            ) : (
              <Badge variant="outline">{t('dashboard:tabelRegistry.not-dispatched')}</Badge>
            )}
          </div>

          <div className="overflow-x-auto rounded-lg border border-line">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('dashboard:tabelRegistry.col-unit')}</TableHead>
                  <TableHead>{t('dashboard:tabelRegistry.col-status')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {registry.units.map((row) => (
                  <TableRow key={row.unitUuid}>
                    <TableCell className="font-medium">{row.unitNameUz}</TableCell>
                    <TableCell>
                      {row.status ? (
                        <Badge variant={STATUS_BADGE[row.status]}>
                          {t(`dashboard:tabels.status.${row.status}`)}
                        </Badge>
                      ) : (
                        <Badge variant="outline">{t('dashboard:tabelRegistry.no-tabel')}</Badge>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      )}
    </div>
  );
}
