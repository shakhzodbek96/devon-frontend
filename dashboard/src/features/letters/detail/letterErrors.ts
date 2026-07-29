import type { TFunction } from 'i18next';
import { toast } from 'sonner';

import { LetterValidationError, MockNetworkError } from '@/lib/data/letters';

/**
 * Maps a thrown letter mutation error to a localized toast — `LetterValidationError`
 * codes resolve from `dashboard:letters.errors.*`, network flakes stay retryable.
 * Shared by the step-21 action dialogs (documents inline the equivalent; the
 * four letter dialogs justify one helper).
 */
export function toastLetterError(t: TFunction, err: unknown): void {
  if (err instanceof LetterValidationError) {
    toast.error(t(`dashboard:letters.errors.${err.code}`));
  } else if (err instanceof MockNetworkError) {
    toast.error(t('common:errors.network'));
  } else {
    toast.error(t('common:errors.unknown'));
  }
}
