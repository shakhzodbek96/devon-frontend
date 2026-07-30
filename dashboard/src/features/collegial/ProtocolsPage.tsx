import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Plus } from 'lucide-react';
import { toast } from 'sonner';

import LoadingState from '@/components/common/LoadingState';
import PageHeader from '@/components/common/PageHeader';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
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
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

import { useActingEmployee } from '@/lib/acting';
import { listCollegialBodies } from '@/lib/data/collegialBodies';
import { listProtocols, CollegialNetworkError } from '@/lib/data/protocols';
import { useAuthStore } from '@/stores/useAuthStore';
import type { CollegialBody, Protocol, ProtocolStatus } from '@/types/domain';

import { protocolStatusVariant } from './protocolStatus';

const ALL_STATUSES: ProtocolStatus[] = [
  'DRAFT',
  'SENT_FOR_REVIEW',
  'REVIEW_REJECTED',
  'SENT_TO_MEMBERS',
  'MEMBERS_REJECTED',
  'SENT_TO_CHAIRMAN',
  'CHAIRMAN_REJECTED',
  'APPROVED',
];

export default function ProtocolsPage() {
  const { t } = useTranslation(['dashboard', 'common']);
  const roles = useAuthStore((s) => s.user?.roles) ?? [];
  const isAdmin = roles.some((r) => r === 'ROLE_SUPER_ADMIN' || r === 'ROLE_HR_ADMIN');
  const acting = useActingEmployee();

  const [bodies, setBodies] = useState<CollegialBody[]>([]);
  const [protocols, setProtocols] = useState<Protocol[] | null>(null);
  const [bodyFilter, setBodyFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [mineOnly, setMineOnly] = useState(false);

  useEffect(() => {
    void (async () => {
      try {
        setBodies(await listCollegialBodies());
      } catch {
        setBodies([]);
      }
    })();
  }, []);

  const reload = useCallback(async () => {
    try {
      setProtocols(
        await listProtocols({
          bodyUuid: bodyFilter !== 'all' ? bodyFilter : undefined,
          status: statusFilter !== 'all' ? statusFilter : undefined,
          box: mineOnly ? 'mine' : undefined,
        }),
      );
    } catch (err) {
      if (err instanceof CollegialNetworkError) toast.error(t('common:errors.network'));
      else toast.error(t('common:errors.unknown'));
    }
  }, [bodyFilter, statusFilter, mineOnly, t]);

  useEffect(() => {
    setProtocols(null); // eslint-disable-line react-hooks/set-state-in-effect
    void reload();
  }, [reload]);

  const bodyName = useMemo(() => {
    const byUuid = new Map(bodies.map((b) => [b.uuid, b.name]));
    return (uuid: string) => byUuid.get(uuid) ?? uuid;
  }, [bodies]);

  // Anyone can be a secretary of a body, or `collegial.manage` can act for
  // any body — the wizard itself scopes the body picker further.
  const canCreate = isAdmin || (!!acting && bodies.some((b) => b.secretaryEmployeeUuid === acting.employee.uuid));

  return (
    <div className="space-y-6 md:space-y-8">
      <PageHeader
        title={t('dashboard:collegial.protocols.page-title')}
        subtitle={t('dashboard:collegial.protocols.page-subtitle')}
        actions={
          canCreate ? (
            <Button asChild className="w-full md:w-auto">
              <Link to="/protocols/new">
                <Plus className="mr-2 h-4 w-4" />
                {t('dashboard:collegial.protocols.add')}
              </Link>
            </Button>
          ) : undefined
        }
      />

      <div className="flex flex-wrap items-end gap-3">
        <div className="min-w-56 space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground">
            {t('dashboard:collegial.protocols.filters.body')}
          </label>
          <Select value={bodyFilter} onValueChange={setBodyFilter}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('common:labels.all')}</SelectItem>
              {bodies.map((b) => (
                <SelectItem key={b.uuid} value={b.uuid}>
                  {b.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="min-w-56 space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground">
            {t('dashboard:collegial.protocols.filters.status')}
          </label>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('common:labels.all')}</SelectItem>
              {ALL_STATUSES.map((s) => (
                <SelectItem key={s} value={s}>
                  {t(`dashboard:collegial.protocols.status.${s}`)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button
          variant={mineOnly ? 'default' : 'outline'}
          onClick={() => setMineOnly((v) => !v)}
        >
          {t('dashboard:collegial.protocols.filters.mine')}
        </Button>
      </div>

      {!protocols && <LoadingState rows={4} />}

      {protocols && protocols.length === 0 && (
        <p className="text-sm text-muted-foreground">{t('dashboard:collegial.protocols.empty')}</p>
      )}

      {protocols && protocols.length > 0 && (
        <div className="overflow-x-auto rounded-lg border border-line">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('dashboard:collegial.protocols.col-number')}</TableHead>
                <TableHead>{t('dashboard:collegial.protocols.col-body')}</TableHead>
                <TableHead>{t('dashboard:collegial.protocols.col-date')}</TableHead>
                <TableHead>{t('dashboard:collegial.protocols.col-status')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {protocols.map((p) => (
                <TableRow key={p.uuid} className="cursor-pointer hover:bg-surface-2">
                  <TableCell>
                    <Link to={`/protocols/${p.uuid}`} className="font-medium text-primary hover:underline">
                      {p.number}
                    </Link>
                  </TableCell>
                  <TableCell>{bodyName(p.collegialBodyUuid)}</TableCell>
                  <TableCell>{p.protocolDate}</TableCell>
                  <TableCell>
                    <Badge variant={protocolStatusVariant(p.status)}>
                      {t(`dashboard:collegial.protocols.status.${p.status}`)}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
