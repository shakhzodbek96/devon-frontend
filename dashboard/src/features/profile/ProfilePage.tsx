import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ClipboardList, KeyRound, Pencil, User } from 'lucide-react';

import EmptyState from '@/components/common/EmptyState';
import LoadingState from '@/components/common/LoadingState';
import StatusBadge from '@/components/common/StatusBadge';
import TabLabel from '@/components/common/TabLabel';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { formatDateTime } from '@/i18n/uz-locale';
import { findUserByEmail, listEmployees, type FoundUser } from '@/lib/data/employees';
import { listPositions } from '@/lib/data/positions';
import { listProfileRequests } from '@/lib/data/profileRequests';
import { listUnits } from '@/lib/data/units';
import { useAuthStore } from '@/stores/useAuthStore';
import type { Employee, Position, ProfileChangeRequest, Unit } from '@/types/domain';

import PasswordChangeForm from './PasswordChangeForm';
import ProfileEditRequestForm from './ProfileEditRequestForm';

const TAB_TRIGGER_CN =
  'h-auto flex-none rounded-none px-3 py-2.5 text-sm ' +
  'data-active:text-primary data-active:font-semibold ' +
  'group-data-horizontal/tabs:after:-bottom-px ' +
  'group-data-horizontal/tabs:after:h-0.5 ' +
  'group-data-horizontal/tabs:after:bg-primary';

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0] ?? '')
    .join('')
    .toUpperCase();
}

interface PageData {
  employee: Employee;
  user: FoundUser;
  unit?: Unit;
  position?: Position;
  requests: ProfileChangeRequest[];
}

export default function ProfilePage() {
  const { t } = useTranslation(['dashboard', 'common']);
  const session = useAuthStore((s) => s.user);
  const [data, setData] = useState<PageData | null | undefined>(undefined);
  const [editOpen, setEditOpen] = useState(false);

  async function load() {
    if (!session) {
      setData(null);
      return;
    }
    const [user, employees, units, positions, requests] = await Promise.all([
      findUserByEmail(session.email),
      listEmployees(),
      listUnits(),
      listPositions(),
      listProfileRequests(),
    ]);
    if (!user?.employeeUuid) {
      setData(null);
      return;
    }
    const employee = employees.find((e) => e.uuid === user.employeeUuid);
    if (!employee) {
      setData(null);
      return;
    }
    setData({
      employee,
      user,
      unit: units.find((u) => u.uuid === employee.primaryUnitUuid),
      position: positions.find((p) => p.id === employee.positionId),
      requests: requests.filter((r) => r.employeeUuid === employee.uuid),
    });
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.uuid]);

  if (data === undefined) return <LoadingState rows={6} />;

  if (data === null) {
    return (
      <EmptyState
        title={t('dashboard:profile.not-found')}
        icon={User}
      />
    );
  }

  const { employee, user, unit, position, requests } = data;
  // HR_ADMIN can self-edit directly; other roles file a change request.
  const canEditDirectly = session?.roles.some(
    (r) => r === 'ROLE_HR_ADMIN' || r === 'ROLE_SUPER_ADMIN',
  ) ?? false;
  const pendingCount = requests.filter((r) => r.status === 'PENDING').length;

  const infoRows: { key: string; label: string; value: string | null }[] = [
    {
      key: 'full-name',
      label: t('dashboard:profile.info.fields.full-name'),
      value: employee.fullNameGenerated,
    },
    {
      key: 'position',
      label: t('dashboard:profile.info.fields.position'),
      value: position?.nameUz ?? null,
    },
    {
      key: 'unit',
      label: t('dashboard:profile.info.fields.unit'),
      value: unit?.nameUz ?? null,
    },
    {
      key: 'mobile',
      label: t('dashboard:profile.info.fields.mobile-phone'),
      value: employee.mobilePhone,
    },
    {
      key: 'corporate-email',
      label: t('dashboard:profile.info.fields.corporate-email'),
      value: employee.corporateEmail,
    },
    {
      key: 'personal-email',
      label: t('dashboard:profile.info.fields.personal-email'),
      value: employee.personalEmail ?? null,
    },
  ];

  return (
    <div className="space-y-5 md:space-y-6">
      <section className="rounded-xl border border-line bg-surface-2 p-5 md:p-7">
        <div className="flex flex-col gap-5 md:flex-row md:items-center">
          <Avatar className="h-20 w-20 shrink-0 md:h-24 md:w-24">
            <AvatarFallback className="bg-primary text-canvas text-xl font-bold">
              {initials(employee.fullNameGenerated)}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <h1 className="text-2xl font-bold leading-tight tracking-tight text-ink md:text-3xl">
              {employee.fullNameGenerated}
            </h1>
            <p className="mt-1 text-sm text-body">
              {employee.corporateEmail} · {employee.mobilePhone}
            </p>
            <div className="mt-3 flex flex-wrap items-center gap-3">
              <StatusBadge status={employee.status} />
              {position && (
                <span className="text-xs text-muted-foreground">{position.nameUz}</span>
              )}
              {unit && (
                <span className="text-xs text-muted-foreground">· {unit.nameUz}</span>
              )}
            </div>
          </div>
        </div>
      </section>

      <Tabs defaultValue="info" className="w-full">
        <TabsList
          variant="line"
          className="no-scrollbar h-auto w-full justify-start gap-1 overflow-x-auto rounded-none border-b border-line p-0 md:gap-2"
        >
          <TabsTrigger value="info" className={TAB_TRIGGER_CN}>
            <User className="mr-2 h-4 w-4" />
            <TabLabel>{t('dashboard:profile.tabs.info')}</TabLabel>
          </TabsTrigger>
          <TabsTrigger value="password" className={TAB_TRIGGER_CN}>
            <KeyRound className="mr-2 h-4 w-4" />
            <TabLabel>{t('dashboard:profile.tabs.password')}</TabLabel>
          </TabsTrigger>
          <TabsTrigger value="requests" className={TAB_TRIGGER_CN}>
            <ClipboardList className="mr-2 h-4 w-4" />
            <TabLabel>{t('dashboard:profile.tabs.requests')}</TabLabel>
            {pendingCount > 0 && (
              <Badge variant="secondary" className="ml-2 h-5 px-2 text-xs">
                {pendingCount}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="info">
          <div className="pt-4 space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h3 className="text-base font-semibold text-ink">
                {t('dashboard:profile.info.heading')}
              </h3>
              <Button variant="outline" size="sm" onClick={() => setEditOpen(true)}>
                <Pencil className="mr-1 h-4 w-4" />
                {t('dashboard:profile.info.edit')}
              </Button>
            </div>

            <dl className="grid grid-cols-1 gap-x-6 gap-y-3 rounded-lg border border-line bg-surface p-5 md:grid-cols-2">
              {infoRows.map((row) => (
                <div
                  key={row.key}
                  className="flex flex-col gap-0.5 border-b border-line/50 pb-2 last:border-b-0 md:border-b-0 md:pb-0"
                >
                  <dt className="text-xs font-medium text-muted-foreground">{row.label}</dt>
                  <dd className="text-sm text-ink">
                    {row.value ?? (
                      <span className="text-muted-foreground">
                        {t('dashboard:profile.info.empty-value')}
                      </span>
                    )}
                  </dd>
                </div>
              ))}
            </dl>
          </div>
        </TabsContent>

        <TabsContent value="password">
          <PasswordChangeForm
            lastChangedAt={user.passwordChangedAt}
            mustChange={user.mustChangePassword}
          />
        </TabsContent>

        <TabsContent value="requests">
          <ProfileRequestsTab requests={requests} />
        </TabsContent>
      </Tabs>

      <ProfileEditRequestForm
        open={editOpen}
        onOpenChange={setEditOpen}
        employee={employee}
        canEditDirectly={canEditDirectly}
        onSaved={() => void load()}
      />
    </div>
  );
}

function ProfileRequestsTab({ requests }: { requests: ProfileChangeRequest[] }) {
  const { t } = useTranslation(['dashboard']);

  if (requests.length === 0) {
    return (
      <div className="pt-4">
        <div className="rounded-lg border border-dashed border-line bg-surface-2/40 px-6 py-10 text-center">
          <ClipboardList className="mx-auto h-8 w-8 text-muted-foreground" />
          <p className="mt-3 text-sm font-medium text-ink">
            {t('dashboard:profile.requests.empty-title')}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {t('dashboard:profile.requests.empty-body')}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3 pt-4">
      <h3 className="text-base font-semibold text-ink">
        {t('dashboard:profile.requests.heading')}
      </h3>
      <ul className="divide-y divide-line rounded-lg border border-line bg-surface">
        {requests.map((r) => (
          <li key={r.uuid} className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0 flex-1">
              <p className="text-sm text-ink">
                {Object.keys(r.fields).join(', ')}
              </p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {t('dashboard:profile.requests.submitted-at', {
                  when: formatDateTime(r.createdAt),
                })}
                {r.reviewedAt && (
                  <>
                    {' · '}
                    {t('dashboard:profile.requests.reviewed-at', {
                      when: formatDateTime(r.reviewedAt),
                    })}
                  </>
                )}
              </p>
            </div>
            <Badge variant="secondary" className="self-start">
              {t(`dashboard:profile.requests.status.${r.status}`)}
            </Badge>
          </li>
        ))}
      </ul>
    </div>
  );
}
