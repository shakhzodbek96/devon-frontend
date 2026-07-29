import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { Bell } from 'lucide-react';

import NotificationsList from './NotificationsList';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { useActingEmployee } from '@/lib/acting';
import {
  listNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from '@/lib/data/notifications';
import { useMediaQuery } from '@/lib/use-media-query';
import type { AppNotification } from '@/types/domain';

export default function NotificationsBell() {
  const { t } = useTranslation(['dashboard', 'common']);
  const navigate = useNavigate();
  const isDesktop = useMediaQuery('(min-width: 768px)');
  const acting = useActingEmployee();
  const recipientUuid = acting?.employee.uuid ?? null;

  const [open, setOpen] = useState(false);
  const [rows, setRows] = useState<AppNotification[] | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);

  // No polling: the badge refreshes when the acting persona changes and the
  // list re-fetches on every open. All "server" state lives in this same
  // tab's localStorage, so there is nothing to poll for in the demo.
  useEffect(() => {
    setRows(null);
    if (!recipientUuid) {
      setUnreadCount(0);
      return;
    }
    let cancelled = false;
    void listNotifications(recipientUuid, { unreadOnly: true })
      .then((unread) => {
        if (!cancelled) setUnreadCount(unread.length);
      })
      .catch(() => {
        // Read flake — keep the previous badge; the next open refetches.
      });
    return () => {
      cancelled = true;
    };
  }, [recipientUuid]);

  async function refetch() {
    if (!recipientUuid) return;
    try {
      const all = await listNotifications(recipientUuid);
      setRows(all);
      setUnreadCount(all.filter((n) => !n.isRead).length);
    } catch {
      setRows([]);
    }
  }

  function onOpenChange(next: boolean) {
    setOpen(next);
    if (next) {
      setRows(null);
      void refetch();
    }
  }

  function onRowClick(n: AppNotification) {
    setOpen(false);
    if (!n.isRead) {
      // Optimistic — tolerate the 3% mock-network flake silently; the row
      // simply stays unread on the next open.
      setUnreadCount((c) => Math.max(0, c - 1));
      void markNotificationRead(n.uuid).catch(() => {});
    }
    // Detail routes land in steps 18–21; until then the catch-all redirects.
    navigate(
      n.resourceType === 'document'
        ? `/documents/${n.resourceUuid}`
        : `/letters/${n.resourceUuid}`,
    );
  }

  async function onMarkAll() {
    if (!recipientUuid) return;
    try {
      await markAllNotificationsRead(recipientUuid);
      setRows((prev) => (prev ? prev.map((n) => ({ ...n, isRead: true })) : prev));
      setUnreadCount(0);
    } catch {
      toast.error(t('common:errors.unknown'));
    }
  }

  const trigger = (
    <Button
      variant="ghost"
      size="icon"
      className="relative"
      aria-label={t('dashboard:notifications.open')}
    >
      <Bell className="h-5 w-5" />
      {unreadCount > 0 && (
        <span
          aria-hidden
          className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-warning px-1 text-[10px] font-bold leading-none text-white"
        >
          {unreadCount > 9 ? '9+' : unreadCount}
        </span>
      )}
    </Button>
  );

  const header = (
    <div className="flex items-center justify-between gap-3">
      <p className="text-sm font-semibold text-ink">
        {t('dashboard:notifications.heading')}
      </p>
      {unreadCount > 0 && (
        <Button
          variant="ghost"
          size="sm"
          className="-mr-2 h-8 text-xs text-primary hover:text-primary"
          onClick={() => void onMarkAll()}
        >
          {t('dashboard:notifications.mark-all')}
        </Button>
      )}
    </div>
  );

  if (isDesktop) {
    return (
      <Popover open={open} onOpenChange={onOpenChange}>
        <PopoverTrigger asChild>{trigger}</PopoverTrigger>
        <PopoverContent align="end" className="w-96 p-0">
          <div className="border-b border-line px-4 py-3">{header}</div>
          <div className="max-h-105 overflow-y-auto">
            <NotificationsList notifications={rows} onRowClick={onRowClick} />
          </div>
        </PopoverContent>
      </Popover>
    );
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetTrigger asChild>{trigger}</SheetTrigger>
      <SheetContent
        side="bottom"
        className="flex h-[80vh] flex-col gap-0 rounded-t-2xl p-0"
      >
        <SheetHeader className="border-b border-line p-4 pr-12 text-left">
          <SheetTitle className="sr-only">
            {t('dashboard:notifications.heading')}
          </SheetTitle>
          {header}
        </SheetHeader>
        <div className="pb-safe flex-1 overflow-y-auto">
          <NotificationsList notifications={rows} onRowClick={onRowClick} />
        </div>
      </SheetContent>
    </Sheet>
  );
}
