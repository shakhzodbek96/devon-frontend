import { Search, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { BrandMark } from '@/components/common/BrandMark';
import MobileNavTrigger from './MobileNavTrigger';
import LanguageSwitcher from './LanguageSwitcher';
import ThemeToggle from './ThemeToggle';
import UserMenu from './UserMenu';
import NotificationsBell from '@/features/notifications/NotificationsBell';
import { Input } from '@/components/ui/input';
import { PERSONAS, type PersonaKey } from '@/lib/mock-backend';
import { useAuthStore } from '@/stores/useAuthStore';

export default function TopBar() {
  const { t } = useTranslation(['dashboard']);
  const actingAsEmployeeUuid = useAuthStore((s) => s.actingAsEmployeeUuid);
  const resetPov = useAuthStore((s) => s.resetPov);

  // Chip renders only for a non-default POV. The session user IS the
  // HR_ADMIN persona, so that key never shows a chip. The chip is a status
  // signal with a one-tap reset — the user menu stays the canonical switch.
  const actingKey =
    actingAsEmployeeUuid && actingAsEmployeeUuid !== PERSONAS.HR_ADMIN
      ? (Object.keys(PERSONAS) as PersonaKey[]).find(
          (key) => PERSONAS[key] === actingAsEmployeeUuid,
        )
      : undefined;
  const personaLabel = actingKey ? t(`dashboard:pov.persona.${actingKey}`) : '';

  return (
    <header className="sticky top-0 z-30 border-b border-line bg-canvas/85 backdrop-blur">
      <div className="flex h-16 items-center gap-3 px-4 md:px-6">
        <MobileNavTrigger />

        {/* Compact logo on mobile/tablet (sidebar wordmark is hidden there) */}
        <div className="flex items-center gap-2 lg:hidden">
          <BrandMark className="size-6 text-brand" />
          <span className="font-display text-base font-extrabold tracking-tight text-ink">Devon</span>
        </div>

        {/* Search — hidden on mobile portrait, visible from sm+ */}
        <div className="hidden flex-1 sm:flex sm:max-w-md">
          <div className="relative w-full">
            <Search
              aria-hidden
              className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
            />
            <Input
              placeholder={t('dashboard:topbar.search-placeholder')}
              className="h-10 bg-surface pl-9"
              aria-label={t('dashboard:topbar.search-placeholder')}
            />
          </div>
        </div>

        <div className="ml-auto flex min-w-0 items-center gap-1.5">
          {actingKey && (
            <span className="flex min-w-0 items-center gap-1 rounded-full border border-warning/30 bg-warning-soft py-1 pl-2.5 pr-1 text-xs font-medium text-warning">
              {/* Full sentence from sm+; persona label only at 360px */}
              <span className="hidden truncate sm:inline">
                {t('dashboard:pov.chip', { persona: personaLabel })}
              </span>
              <span className="truncate sm:hidden">{personaLabel}</span>
              <button
                type="button"
                onClick={() => void resetPov()}
                aria-label={t('dashboard:pov.chip-reset')}
                className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full transition-colors hover:bg-warning/15"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </span>
          )}

          <LanguageSwitcher />
          <ThemeToggle />
          <NotificationsBell />
          <UserMenu />
        </div>
      </div>
    </header>
  );
}
