import { useEffect, type ComponentType } from 'react';
import { NavLink } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  CalendarClock,
  ClipboardList,
  Clock,
  FileSignature,
  FileText,
  Gavel,
  KeySquare,
  LayoutDashboard,
  ListChecks,
  ListTodo,
  Mail,
  Network,
  ScrollText,
  Table as TableIcon,
  UserCircle2,
  UserCog,
  Users,
} from 'lucide-react';

import { BrandMark } from '@/components/common/BrandMark';
import { useActingEmployee } from '@/lib/acting';
import { listMyApprovals } from '@/lib/mock-backend';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/stores/useAuthStore';
import { useQueueStore } from '@/stores/useQueueStore';

interface NavItem {
  to: string;
  labelKey: string;
  icon: ComponentType<{ className?: string }>;
}

const baseManagementNav: NavItem[] = [
  { to: '/', labelKey: 'dashboard:sidebar.nav-home', icon: LayoutDashboard },
  { to: '/units', labelKey: 'dashboard:sidebar.nav-units', icon: Network },
  { to: '/employees', labelKey: 'dashboard:sidebar.nav-employees', icon: Users },
  { to: '/certificates', labelKey: 'dashboard:sidebar.nav-certificates', icon: KeySquare },
  { to: '/tasks', labelKey: 'dashboard:sidebar.nav-tasks', icon: ListTodo },
  {
    to: '/conference-rooms',
    labelKey: 'dashboard:sidebar.nav-conference-rooms',
    icon: CalendarClock,
  },
  { to: '/attendance', labelKey: 'dashboard:sidebar.nav-attendance', icon: Clock },
  { to: '/protocols', labelKey: 'dashboard:sidebar.nav-protocols', icon: FileSignature },
  { to: '/audit', labelKey: 'dashboard:sidebar.nav-audit', icon: ScrollText },
];

/** Admin-only — mirrors the `/collegial-bodies` route guard (RequireRole in router.tsx). */
const collegialBodiesNavItem: NavItem = {
  to: '/collegial-bodies',
  labelKey: 'dashboard:sidebar.nav-collegial-bodies',
  icon: Gavel,
};

/** Unit-head/HR only — visible when the acting persona heads at least one
 *  unit or holds an admin/HR role (mirrors `TabelsPage`'s own visibility
 *  logic; the route itself stays unguarded, the page shows an empty state). */
const tabelsNavItem: NavItem = {
  to: '/tabels',
  labelKey: 'dashboard:sidebar.nav-tabels',
  icon: TableIcon,
};

/** Admin-only — mirrors the `/users` route guard (RequireRole in router.tsx). */
const usersNavItem: NavItem = {
  to: '/users',
  labelKey: 'dashboard:sidebar.nav-users',
  icon: UserCog,
};

/** Admin/HR-only — mirrors the `/tabel-registry` route guard (RequireRole in router.tsx). */
const tabelRegistryNavItem: NavItem = {
  to: '/tabel-registry',
  labelKey: 'dashboard:sidebar.nav-tabel-registry',
  icon: ClipboardList,
};

// Milestone 2 — letters (/letters) stays a step-16 placeholder until step 20.
const documentsNav: NavItem[] = [
  { to: '/documents', labelKey: 'dashboard:sidebar.nav-documents', icon: FileText },
  { to: '/approvals', labelKey: 'dashboard:sidebar.nav-approvals', icon: ListChecks },
  { to: '/letters', labelKey: 'dashboard:sidebar.nav-letters', icon: Mail },
];

const personalNav: NavItem[] = [
  { to: '/profile', labelKey: 'dashboard:sidebar.nav-profile', icon: UserCircle2 },
];

interface Props {
  onNavigate?: () => void;
}

export default function Sidebar({ onNavigate }: Props) {
  const { t } = useTranslation(['dashboard']);
  const acting = useActingEmployee();
  const actingUuid = acting?.employee.uuid;
  const version = useQueueStore((s) => s.version);
  const count = useQueueStore((s) => s.count);
  const setCount = useQueueStore((s) => s.setCount);
  const roles = useAuthStore((s) => s.user?.roles) ?? [];
  const isAdmin = roles.some((r) => r === 'ROLE_SUPER_ADMIN' || r === 'ROLE_HR_ADMIN');
  const isUnitHead = (acting?.headedUnitUuids.length ?? 0) > 0;
  let managementNav = baseManagementNav;
  if (isUnitHead || isAdmin) managementNav = [...managementNav, tabelsNavItem];
  if (isAdmin) managementNav = [...managementNav, tabelRegistryNavItem, collegialBodiesNavItem, usersNavItem];

  // Pending-queue badge for the acting persona — refreshed on mount, POV
  // switch, and whenever a mutation bumps the queue store's version.
  useEffect(() => {
    if (!actingUuid) return;
    let cancelled = false;
    void (async () => {
      try {
        const items = await listMyApprovals(actingUuid);
        if (!cancelled) setCount(items.length);
      } catch {
        // Read flake — keep the previous count; the next bump retries.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [actingUuid, version, setCount]);

  return (
    <nav className="flex h-full flex-col bg-surface border-r border-line">
      <div className="flex h-16 items-center gap-3 border-b border-line/60 px-6">
        <BrandMark className="size-7 text-brand" />
        <span className="font-display text-xl font-extrabold tracking-tight text-ink">Devon</span>
      </div>

      <div className="flex-1 space-y-6 overflow-y-auto px-3 py-5">
        <NavSection
          title={t('dashboard:sidebar.section-management')}
          items={managementNav}
          onNavigate={onNavigate}
        />
        <NavSection
          title={t('dashboard:sidebar.section-documents')}
          items={documentsNav}
          badges={{ '/approvals': count }}
          onNavigate={onNavigate}
        />
        <NavSection
          title={t('dashboard:sidebar.section-personal')}
          items={personalNav}
          onNavigate={onNavigate}
        />
      </div>

      <div className="border-t border-line/60 px-6 py-4">
        <p className="font-display text-sm text-primary">
          {t('dashboard:sidebar.footer-slogan')}
        </p>
      </div>
    </nav>
  );
}

interface SectionProps {
  title: string;
  items: NavItem[];
  /** Pending counts keyed by route — null/0 hides the badge. */
  badges?: Record<string, number | null>;
  onNavigate?: () => void;
}

function NavSection({ title, items, badges, onNavigate }: SectionProps) {
  const { t } = useTranslation(['dashboard']);
  return (
    <div>
      <p className="mb-2 px-3 text-[10.5px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
        {title}
      </p>
      <ul className="space-y-0.5">
        {items.map((item) => {
          const badge = badges?.[item.to] ?? null;
          return (
            <li key={item.to}>
              <NavLink
                to={item.to}
                end={item.to === '/'}
                onClick={onNavigate}
                className={({ isActive }) =>
                  cn(
                    'flex h-11 items-center gap-3 rounded-md px-3 text-sm font-medium transition-colors',
                    isActive
                      ? 'bg-primary text-canvas'
                      : 'text-body hover:bg-surface-2 hover:text-ink',
                  )
                }
              >
                {({ isActive }) => (
                  <>
                    <item.icon className="h-4 w-4 shrink-0" />
                    <span className="min-w-0 flex-1 truncate">{t(item.labelKey)}</span>
                    {badge !== null && badge > 0 && (
                      <span
                        className={cn(
                          'flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full px-1.5 text-[11px] font-semibold tabular-nums',
                          isActive ? 'bg-canvas text-primary' : 'bg-warning text-canvas',
                        )}
                      >
                        {badge > 9 ? '9+' : badge}
                      </span>
                    )}
                  </>
                )}
              </NavLink>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
