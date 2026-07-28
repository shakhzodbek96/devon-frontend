import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

import { BrandMark } from '@/components/common/BrandMark';
import { useAuthStore } from '@/stores/useAuthStore';
import PasswordChangeForm from '@/features/profile/PasswordChangeForm';

/**
 * Forced first-login password change (PLAN_AUTH_ROLES.md §2.3). `RequireAuth`
 * redirects here whenever `mustChangePassword` is true and blocks every
 * other route until it flips to false. Deliberately outside `AppShell` —
 * the user shouldn't be browsing the app chrome before this gate clears.
 */
export default function ChangePasswordGatePage() {
  const { t } = useTranslation(['dashboard']);
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);

  return (
    <div className="min-h-screen flex items-center justify-center bg-surface px-6 py-12">
      <div className="w-full max-w-md">
        <div className="mb-8 flex items-center justify-center gap-3">
          <BrandMark className="size-7 text-brand" />
          <span className="font-display text-xl font-extrabold tracking-tight text-ink">
            Devon
          </span>
        </div>

        <h1 className="text-center text-2xl font-bold tracking-tight text-ink mb-2">
          {t('dashboard:change-password-gate.title')}
        </h1>
        <p className="text-center text-sm text-muted-foreground mb-6">
          {t('dashboard:change-password-gate.subtitle', { email: user?.email ?? '' })}
        </p>

        <div className="rounded-xl border border-line bg-surface-2 p-5 md:p-6">
          <PasswordChangeForm
            mustChange
            onSuccess={() => navigate('/', { replace: true })}
          />
        </div>
      </div>
    </div>
  );
}
