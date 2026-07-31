import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { BriefcaseBusiness, Pencil, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

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
import EmptyState from '@/components/common/EmptyState';
import ErrorState from '@/components/common/ErrorState';
import LoadingState from '@/components/common/LoadingState';
import PageHeader from '@/components/common/PageHeader';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { deletePosition, listPositions, PositionValidationError } from '@/lib/data/positions';
import type { Position } from '@/types/domain';

import PositionFormDialog from './PositionFormDialog';

export default function PositionsPage() {
  const { t } = useTranslation(['dashboard', 'common']);

  const [positions, setPositions] = useState<Position[] | null>(null);
  const [loadError, setLoadError] = useState(false);

  const [formOpen, setFormOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Position | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Position | null>(null);
  const [deleting, setDeleting] = useState(false);

  async function load() {
    setLoadError(false);
    try {
      setPositions(await listPositions());
    } catch {
      setLoadError(true);
    }
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, []);

  function openCreate() {
    setEditTarget(null);
    setFormOpen(true);
  }

  function openEdit(position: Position) {
    setEditTarget(position);
    setFormOpen(true);
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deletePosition(deleteTarget.id);
      toast.success(t('dashboard:positions.toast.deleted'));
      setDeleteTarget(null);
      void load();
    } catch (err) {
      if (err instanceof PositionValidationError && err.code === 'in-use') {
        toast.error(t('dashboard:positions.errors.in-use'));
      } else {
        toast.error(t('common:errors.unknown'));
      }
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div>
      <PageHeader
        title={t('dashboard:positions.title')}
        subtitle={t('dashboard:positions.subtitle')}
        actions={
          <Button onClick={openCreate}>
            <Plus className="mr-2 h-4 w-4" />
            {t('dashboard:positions.add')}
          </Button>
        }
      />

      {loadError ? (
        <ErrorState onRetry={() => void load()} />
      ) : positions === null ? (
        <LoadingState rows={6} />
      ) : positions.length === 0 ? (
        <EmptyState
          icon={BriefcaseBusiness}
          title={t('dashboard:positions.empty-title')}
          body={t('dashboard:positions.empty-body')}
          action={
            <Button onClick={openCreate}>
              <Plus className="mr-2 h-4 w-4" />
              {t('dashboard:positions.add')}
            </Button>
          }
        />
      ) : (
        <div className="rounded-lg border border-line bg-surface">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('dashboard:positions.col-name')}</TableHead>
                <TableHead>{t('dashboard:positions.col-unit-types')}</TableHead>
                <TableHead className="w-[120px] text-right">
                  {t('dashboard:positions.col-actions')}
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {positions.map((position) => (
                <TableRow key={position.id}>
                  <TableCell className="font-medium text-ink">{position.nameUz}</TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1.5">
                      {position.allowedUnitTypes.map((type) => (
                        <Badge key={type} variant="secondary">
                          {t(`common:unit-types.${type}`)}
                        </Badge>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label={t('common:actions.edit')}
                        onClick={() => openEdit(position)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label={t('common:actions.delete')}
                        onClick={() => setDeleteTarget(position)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <PositionFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        position={editTarget}
        onSaved={() => void load()}
      />

      <AlertDialog open={deleteTarget !== null} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('dashboard:positions.delete-title')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('dashboard:positions.delete-body', { name: deleteTarget?.nameUz ?? '' })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>
              {t('common:actions.cancel')}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                void confirmDelete();
              }}
              disabled={deleting}
              className="bg-destructive text-white hover:bg-destructive/90"
            >
              {t('common:actions.delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
