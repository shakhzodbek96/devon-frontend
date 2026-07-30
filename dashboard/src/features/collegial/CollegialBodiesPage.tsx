import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Archive, Pencil, Plus, Users2 } from 'lucide-react';
import { toast } from 'sonner';

import LoadingState from '@/components/common/LoadingState';
import PageHeader from '@/components/common/PageHeader';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

import {
  archiveCollegialBody,
  listCollegialBodies,
  CollegialNetworkError,
} from '@/lib/data/collegialBodies';
import { listEmployees } from '@/lib/data/employees';
import type { CollegialBody, Employee } from '@/types/domain';

import BodyFormSheet from './BodyFormSheet';

export default function CollegialBodiesPage() {
  const { t } = useTranslation(['dashboard', 'common']);

  const [bodies, setBodies] = useState<CollegialBody[] | null>(null);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<CollegialBody | null>(null);
  const [archiving, setArchiving] = useState<CollegialBody | null>(null);
  const [archiveBusy, setArchiveBusy] = useState(false);

  const reload = useCallback(async () => {
    try {
      setBodies(await listCollegialBodies());
    } catch (err) {
      if (err instanceof CollegialNetworkError) toast.error(t('common:errors.network'));
      else toast.error(t('common:errors.unknown'));
    }
  }, [t]);

  useEffect(() => {
    void reload(); // eslint-disable-line react-hooks/set-state-in-effect
    void (async () => {
      try {
        setEmployees(await listEmployees());
      } catch {
        setEmployees([]);
      }
    })();
  }, [reload]);

  const employeeName = useMemo(() => {
    const byUuid = new Map(employees.map((e) => [e.uuid, e.fullNameGenerated]));
    return (uuid: string) => byUuid.get(uuid) ?? uuid;
  }, [employees]);

  function startCreate() {
    setEditing(null);
    setFormOpen(true);
  }

  function startEdit(body: CollegialBody) {
    setEditing(body);
    setFormOpen(true);
  }

  async function confirmArchive() {
    if (!archiving) return;
    setArchiveBusy(true);
    try {
      await archiveCollegialBody(archiving.uuid);
      toast.success(t('dashboard:collegial.bodies.toast.archived'));
      setArchiving(null);
      await reload();
    } catch (err) {
      if (err instanceof CollegialNetworkError) toast.error(t('common:errors.network'));
      else toast.error(t('common:errors.unknown'));
    } finally {
      setArchiveBusy(false);
    }
  }

  return (
    <div className="space-y-6 md:space-y-8">
      <PageHeader
        title={t('dashboard:collegial.bodies.page-title')}
        subtitle={t('dashboard:collegial.bodies.page-subtitle')}
        actions={
          <Button onClick={startCreate} className="w-full md:w-auto">
            <Plus className="mr-2 h-4 w-4" />
            {t('dashboard:collegial.bodies.add')}
          </Button>
        }
      />

      {!bodies && <LoadingState rows={3} />}

      {bodies && bodies.length === 0 && (
        <p className="text-sm text-muted-foreground">{t('dashboard:collegial.bodies.empty')}</p>
      )}

      {bodies && bodies.length > 0 && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {bodies.map((body) => (
            <Card key={body.uuid}>
              <CardHeader>
                <div className="flex items-start justify-between gap-2">
                  <CardTitle>{body.name}</CardTitle>
                  <Badge variant={body.status === 'ACTIVE' ? 'secondary' : 'outline'}>
                    {body.status === 'ACTIVE'
                      ? t('common:status.active')
                      : t('common:status.archived')}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                <p className="text-sm text-muted-foreground">
                  {t('dashboard:collegial.bodies.field-chairman')}:{' '}
                  <span className="text-ink">{employeeName(body.chairmanEmployeeUuid)}</span>
                </p>
                <p className="text-sm text-muted-foreground">
                  {t('dashboard:collegial.bodies.field-secretary')}:{' '}
                  <span className="text-ink">{employeeName(body.secretaryEmployeeUuid)}</span>
                </p>
                <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
                  <Users2 className="h-4 w-4" />
                  {t('dashboard:collegial.bodies.members-suffix', {
                    count: body.memberEmployeeUuids?.length ?? 0,
                  })}
                  {' · '}
                  {t('dashboard:collegial.bodies.quorum-suffix', { count: body.quorumMin })}
                </p>
                <div className="flex flex-wrap gap-2 pt-1">
                  <Button size="sm" variant="outline" onClick={() => startEdit(body)}>
                    <Pencil className="mr-1.5 h-3.5 w-3.5" />
                    {t('common:actions.edit')}
                  </Button>
                  {body.status === 'ACTIVE' && (
                    <Button size="sm" variant="outline" onClick={() => setArchiving(body)}>
                      <Archive className="mr-1.5 h-3.5 w-3.5" />
                      {t('common:actions.archive')}
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <BodyFormSheet
        open={formOpen}
        onOpenChange={setFormOpen}
        body={editing}
        employees={employees}
        onSaved={reload}
      />

      <AlertDialog open={!!archiving} onOpenChange={(open) => !open && setArchiving(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('dashboard:collegial.bodies.archive-confirm.title')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('dashboard:collegial.bodies.archive-confirm.description')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={archiveBusy}>{t('common:actions.close')}</AlertDialogCancel>
            <AlertDialogAction disabled={archiveBusy} onClick={() => void confirmArchive()}>
              {t('common:actions.confirm')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
