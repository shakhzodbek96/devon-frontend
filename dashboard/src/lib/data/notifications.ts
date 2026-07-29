// Data-seam facade for the notification bell (PLAN_PHASE_F1.md §5).
// Re-exports either the real API (`src/lib/api/notifications.ts`) or the
// localStorage mock (`src/lib/mock-backend`) under one stable signature,
// switched centrally by `src/lib/data/config.ts`.
// `src/features/notifications/*` imports from here.

import * as mockBackend from '@/lib/mock-backend';
import * as realApi from '@/lib/api/notifications';
import { dataSourceConfig } from './config';

export const listNotifications =
  dataSourceConfig.notifications === 'real'
    ? realApi.listNotifications
    : mockBackend.listNotifications;

export const markNotificationRead =
  dataSourceConfig.notifications === 'real'
    ? realApi.markNotificationRead
    : mockBackend.markNotificationRead;

export const markAllNotificationsRead =
  dataSourceConfig.notifications === 'real'
    ? realApi.markAllNotificationsRead
    : mockBackend.markAllNotificationsRead;
