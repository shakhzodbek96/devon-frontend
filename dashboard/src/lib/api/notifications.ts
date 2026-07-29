// Real backend for the notification bell (milestone 2, PLAN_PHASE_F1.md
// §3). Signature-compatible with the mock's `listNotifications` /
// `markNotificationRead` / `markAllNotificationsRead`
// (`src/lib/mock-backend/index.ts`) so `src/lib/data/notifications.ts` can
// re-export either implementation unchanged. Every route reads/writes only
// the AUTHENTICATED user's own employee's notifications server-side — the
// `recipientEmployeeUuid` parameter here is accepted purely for signature
// compatibility with the mock.

import { MockNetworkError } from '@/lib/mock-backend/errors';
import type { AppNotification } from '@/types/domain';
import { apiFetch, ApiError } from './client';

function rethrow(err: unknown): never {
  if (err instanceof ApiError && err.status === 0) throw new MockNetworkError();
  throw err;
}

export async function listNotifications(
  _recipientEmployeeUuid: string,
  opts?: { unreadOnly?: boolean },
): Promise<AppNotification[]> {
  const qs = opts?.unreadOnly ? '?unreadOnly=true' : '';
  try {
    return await apiFetch<AppNotification[]>(`/me/notifications${qs}`);
  } catch (err) {
    rethrow(err);
  }
}

export async function markNotificationRead(uuid: string): Promise<void> {
  try {
    await apiFetch<{ ok: boolean }>(`/notifications/${uuid}/read`, { method: 'POST' });
  } catch (err) {
    rethrow(err);
  }
}

export async function markAllNotificationsRead(_recipientEmployeeUuid: string): Promise<void> {
  try {
    await apiFetch<{ ok: boolean }>('/me/notifications/read-all', { method: 'POST' });
  } catch (err) {
    rethrow(err);
  }
}
