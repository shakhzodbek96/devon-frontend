import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, History, KeyRound, UserPlus, User } from 'lucide-react';

import LoadingState from '@/components/common/LoadingState';
import StatusBadge from '@/components/common/StatusBadge';
import TabLabel from '@/components/common/TabLabel';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { getEmployee } from '@/lib/data/employees';
import type { Employee } from '@/types/domain';

import ProfileCertificatesTab from './ProfileCertificatesTab';
import ProfileHistoryTab from './ProfileHistoryTab';
import ProfileInfoTab from './ProfileInfoTab';
import ProfileUnitsTab from './ProfileUnitsTab';

// Underline-tab trigger className. flex-none beats the primitive's flex-1
// so each tab sizes to its content; the active indicator uses the same
// `group-data-horizontal/tabs:` prefix as the primitive so tw-merge cleanly
// replaces the primitive's `after:bottom-[-5px]` with our flush variant.
// Active emphasis: label + icon shift to primary (matching the underline) and
// the weight bumps from medium to semibold so the active tab visually anchors.
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

function formatPinfl(pinfl: string): string {
  return pinfl.replace(/(.{4})/g, '$1 ').trim();
}

export default function EmployeeProfilePage() {
  const { t } = useTranslation(['dashboard', 'common']);
  const { uuid } = useParams<{ uuid: string }>();
  const navigate = useNavigate();
  // `undefined` = still loading, `null` = not found.
  const [emp, setEmp] = useState<Employee | null | undefined>(undefined);

  useEffect(() => {
    if (!uuid) return;
    let active = true;
    (async () => {
      const result = await getEmployee(uuid);
      if (active) setEmp(result);
    })();
    return () => {
      active = false;
    };
  }, [uuid]);

  if (emp === undefined) return <LoadingState rows={6} />;

  if (emp === null) {
    return (
      <div className="py-16 text-center">
        <p className="text-muted-foreground">{t('dashboard:employees.profile.not-found')}</p>
        <Button asChild variant="outline" className="mt-4">
          <Link to="/employees">{t('common:actions.back')}</Link>
        </Button>
      </div>
    );
  }

  const terminated = emp.status === 'TERMINATED';

  return (
    <div className="space-y-5 md:space-y-6">
      <Button asChild variant="ghost" size="sm" className="-ml-2">
        <Link to="/employees">
          <ArrowLeft className="mr-1 h-4 w-4" />
          {t('dashboard:employees.profile.back')}
        </Link>
      </Button>

      <section className="rounded-xl border border-line bg-surface-2 p-5 md:p-7">
        <div className="flex flex-col gap-5 md:flex-row md:items-center">
          <Avatar className="h-20 w-20 shrink-0 md:h-24 md:w-24">
            <AvatarFallback className="bg-primary text-canvas text-xl font-bold">
              {initials(emp.fullNameGenerated)}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <h1 className="text-2xl font-bold leading-tight tracking-tight text-ink md:text-3xl">
              {emp.fullNameGenerated}
            </h1>
            <p className="mt-1 text-sm text-body">
              {emp.corporateEmail} · {emp.mobilePhone}
            </p>
            <div className="mt-3 flex flex-wrap items-center gap-3">
              <StatusBadge status={emp.status} />
              <span className="text-xs text-muted-foreground">
                {t('dashboard:employees.profile.pinfl-label')}:{' '}
                <span className="ml-1 font-mono tabular-nums text-ink">
                  {formatPinfl(emp.pinfl)}
                </span>
              </span>
            </div>
          </div>
          <div className="flex flex-wrap gap-2 md:flex-col md:items-end">
            <Button
              onClick={() => navigate(`/employees/${emp.uuid}/transfer`)}
              variant="outline"
              disabled={terminated}
            >
              <UserPlus className="mr-2 h-4 w-4" />
              {t('dashboard:employees.profile.transfer')}
            </Button>
          </div>
        </div>
      </section>

      <Tabs defaultValue="info" className="w-full">
        {/* Underline tab bar: each trigger is sized to its content (flex-none
            beats the primitive's flex-1), the baseline runs full-width via the
            TabsList's border-b, and the active indicator sits flush on the
            baseline (after:-bottom-px overlaps the 1 px border). */}
        <TabsList
          variant="line"
          className="no-scrollbar h-auto w-full justify-start gap-1 overflow-x-auto rounded-none border-b border-line p-0 md:gap-2"
        >
          <TabsTrigger value="info" className={TAB_TRIGGER_CN}>
            <User className="mr-2 h-4 w-4" />
            <TabLabel>{t('dashboard:employees.profile.tabs.info')}</TabLabel>
          </TabsTrigger>
          <TabsTrigger value="units" className={TAB_TRIGGER_CN}>
            <UserPlus className="mr-2 h-4 w-4" />
            <TabLabel>{t('dashboard:employees.profile.tabs.units')}</TabLabel>
          </TabsTrigger>
          <TabsTrigger value="certs" className={TAB_TRIGGER_CN}>
            <KeyRound className="mr-2 h-4 w-4" />
            <TabLabel>{t('dashboard:employees.profile.tabs.certs')}</TabLabel>
          </TabsTrigger>
          <TabsTrigger value="history" className={TAB_TRIGGER_CN}>
            <History className="mr-2 h-4 w-4" />
            <TabLabel>{t('dashboard:employees.profile.tabs.history')}</TabLabel>
          </TabsTrigger>
        </TabsList>
        <TabsContent value="info">
          <ProfileInfoTab employee={emp} onChanged={setEmp} />
        </TabsContent>
        <TabsContent value="units">
          <ProfileUnitsTab employee={emp} />
        </TabsContent>
        <TabsContent value="certs">
          <ProfileCertificatesTab employee={emp} />
        </TabsContent>
        <TabsContent value="history">
          <ProfileHistoryTab employee={emp} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
