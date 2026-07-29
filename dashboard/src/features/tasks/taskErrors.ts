import type { TFunction } from 'i18next';
import { toast } from 'sonner';

import { MockNetworkError, TaskValidationError } from '@/lib/data/tasks';

/**
 * Maps a thrown task mutation error to a localized toast — `TaskValidationError`
 * codes resolve from `dashboard:tasks.errors.*`, network flakes stay retryable.
 * Mirrors letterErrors.ts (`toastLetterError`) — same signature, same idiom.
 */
export function toastTaskError(t: TFunction, err: unknown): void {
  if (err instanceof TaskValidationError) {
    toast.error(t(`dashboard:tasks.errors.${err.code}`));
  } else if (err instanceof MockNetworkError) {
    toast.error(t('common:errors.network'));
  } else {
    toast.error(t('common:errors.unknown'));
  }
}
