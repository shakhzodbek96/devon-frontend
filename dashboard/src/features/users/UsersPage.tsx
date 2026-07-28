import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { KeyRound, Pencil, Plus, Users as UsersIcon } from 'lucide-react';
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
import SearchInput from '@/components/common/SearchInput';
import StatusBadge from '@/components/common/StatusBadge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import type { ApiSessionUser } from '@/lib/api/auth';
import { ApiError } from '@/lib/api/client';
import { listRoles, type RoleOption } from '@/lib/api/roles';
import { listUsers, resetUserPassword, type CreateUserResponse } from '@/lib/api/users';

import CreateUserDialog from './CreateUserDialog';
import EditUserDialog from './EditUserDialog';
import TempPasswordDialog from './TempPasswordDialog';

export default function UsersPage() {
  const { t } = useTranslation(['dashboard', 'common']);

  const [users, setUsers] = useState<ApiSessionUser[] | null>(null);
  const [roleOptions, setRoleOptions] = useState<RoleOption[]>([]);
  const [search, setSearch] = useState('');
  const [loadError, setLoadError] = useState(false);

  const [createOpen, setCreateOpen] = useState(false);
  const [editUser, setEditUser] = useState<ApiSessionUser | null>(null);
  const [resetTarget, setResetTarget] = useState<ApiSessionUser | null>(null);
  const [tempPassword, setTempPassword] = useState<string | null>(null);

  async function load(searchTerm: string) {
    setLoadError(false);
    try {
      const [rows, roles] = await Promise.all([
        listUsers(searchTerm),
        roleOptions.length ? Promise.resolve(roleOptions) : listRoles(),
      ]);
      setUsers(rows);
      if (!roleOptions.length) setRoleOptions(roles);
    } catch {
      setLoadError(true);
    }
  }

  useEffect(() => {
    // Same "load on mount / dep change" shape used throughout this codebase
    // (EmployeeListPage, LettersPage, UnitsPage, ...) — react-hooks/set-state-in-effect
    // flags it repo-wide; not something this slice introduces or can fix in isolation.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load(search);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  async function handleReset(user: ApiSessionUser) {
    try {
      const { tempPassword: generated } = await resetUserPassword(user.uuid);
      setTempPassword(generated);
      toast.success(t('dashboard:users.toast.password-reset'));
    } catch (err) {
      toast.error(err instanceof ApiError && err.status === 0 ? t('common:errors.network') : t('common:errors.unknown'));
    } finally {
      setResetTarget(null);
    }
  }

  function handleCreated(result: CreateUserResponse) {
    void load(search);
    if (result.tempPassword) {
      setTempPassword(result.tempPassword);
    } else {
      toast.success(t('dashboard:users.toast.created'));
    }
  }

  function handleUpdated(updated: ApiSessionUser) {
    setUsers((prev) => prev?.map((u) => (u.uuid === updated.uuid ? updated : u)) ?? prev);
    toast.success(t('dashboard:users.toast.updated'));
  }

  return (
    <div>
      <PageHeader
        title={t('dashboard:users.title')}
        subtitle={t('dashboard:users.subtitle')}
        actions={
          <Button onClick={() => setCreateOpen(true)}>
            <Plus className="mr-1.5 h-4 w-4" />
            {t('dashboard:users.create.trigger')}
          </Button>
        }
      />

      <div className="mb-4 max-w-sm">
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder={t('dashboard:users.search-placeholder')}
        />
      </div>

      {users === null ? (
        loadError ? (
          <ErrorState onRetry={() => void load(search)} />
        ) : (
          <LoadingState rows={5} />
        )
      ) : users.length === 0 ? (
        <EmptyState
          icon={UsersIcon}
          title={t('dashboard:users.empty-title')}
          body={t('dashboard:users.empty-body')}
        />
      ) : (
        <div className="rounded-xl border border-line bg-surface">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('dashboard:users.table.email')}</TableHead>
                <TableHead>{t('dashboard:users.table.full-name')}</TableHead>
                <TableHead>{t('dashboard:users.table.roles')}</TableHead>
                <TableHead>{t('dashboard:users.table.status')}</TableHead>
                <TableHead className="text-right">{t('dashboard:users.table.actions')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((u) => (
                <TableRow key={u.uuid}>
                  <TableCell className="font-medium text-ink">{u.email}</TableCell>
                  <TableCell>{u.fullName}</TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {u.roles.map((r) => (
                        <Badge key={r} variant="secondary">
                          {t(`common:roles.${r}`)}
                        </Badge>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={u.status} />
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        aria-label={t('dashboard:users.edit.trigger')}
                        onClick={() => setEditUser(u)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        aria-label={t('dashboard:users.reset-password.trigger')}
                        onClick={() => setResetTarget(u)}
                      >
                        <KeyRound className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <CreateUserDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        roleOptions={roleOptions}
        onCreated={handleCreated}
      />

      <EditUserDialog
        key={editUser?.uuid ?? 'none'}
        open={editUser !== null}
        onOpenChange={(open) => {
          if (!open) setEditUser(null);
        }}
        user={editUser}
        roleOptions={roleOptions}
        onUpdated={handleUpdated}
      />

      <TempPasswordDialog
        open={tempPassword !== null}
        onOpenChange={(open) => {
          if (!open) setTempPassword(null);
        }}
        tempPassword={tempPassword}
      />

      <AlertDialog
        open={resetTarget !== null}
        onOpenChange={(open) => {
          if (!open) setResetTarget(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('dashboard:users.reset-password.confirm-title')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('dashboard:users.reset-password.confirm-body', { email: resetTarget?.email ?? '' })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('dashboard:users.create.cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={() => resetTarget && void handleReset(resetTarget)}>
              {t('dashboard:users.reset-password.confirm-cta')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
