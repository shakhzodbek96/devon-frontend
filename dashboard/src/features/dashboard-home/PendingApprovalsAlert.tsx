import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ClipboardCheck } from 'lucide-react';

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { useActingEmployee } from '@/lib/acting';
import { listMyApprovals } from '@/lib/data/documents';
import { useQueueStore } from '@/stores/useQueueStore';

/**
 * Home banner telling the acting persona how many documents wait on them
 * (decisions + signatures + acceptances — the full `/approvals` queue, same
 * count the sidebar badge shows). Null-rendered when the queue is empty, per
 * the `ExpiringCertsAlert` convention. Re-resolves on POV switch and whenever
 * a mutation bumps the queue store, so it stays in lockstep with the badge.
 */
export default function PendingApprovalsAlert() {
  const { t } = useTranslation(['dashboard']);
  const acting = useActingEmployee();
  const actingUuid = acting?.employee.uuid;
  const version = useQueueStore((s) => s.version);
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!actingUuid) return;
    let cancelled = false;
    (async () => {
      try {
        const items = await listMyApprovals(actingUuid);
        if (!cancelled) setCount(items.length);
      } catch {
        // Read flake — leave the previous count; the next bump retries.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [actingUuid, version]);

  if (count === 0) return null;

  return (
    <Alert className="border-primary/30 bg-surface-2 text-ink">
      <ClipboardCheck className="h-4 w-4 text-primary" />
      <AlertTitle className="text-ink">
        {t('dashboard:home.approvals-alert.title', { count })}
      </AlertTitle>
      <AlertDescription className="flex flex-col gap-3 text-ink/80 md:flex-row md:items-center md:justify-between">
        <span>{t('dashboard:home.approvals-alert.body')}</span>
        <Button
          asChild
          variant="outline"
          size="sm"
          className="border-primary/40 bg-canvas text-ink hover:bg-surface-2"
        >
          <Link to="/approvals">{t('dashboard:home.approvals-alert.cta')}</Link>
        </Button>
      </AlertDescription>
    </Alert>
  );
}
