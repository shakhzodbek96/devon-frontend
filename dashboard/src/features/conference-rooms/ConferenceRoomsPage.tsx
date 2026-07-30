import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Archive, CalendarClock, Pencil, Plus, Users2, X } from 'lucide-react';
import { toast } from 'sonner';

import LoadingState from '@/components/common/LoadingState';
import PageHeader from '@/components/common/PageHeader';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

import {
  archiveConferenceRoom,
  listConferenceRooms,
  ConferenceNetworkError,
} from '@/lib/data/conferenceRooms';
import {
  cancelConferenceBooking,
  listConferenceBookings,
  ConferenceNetworkError as ConferenceBookingNetworkError,
} from '@/lib/data/conferenceBookings';
import { useAuthStore } from '@/stores/useAuthStore';
import type { ConferenceBooking, ConferenceRoom } from '@/types/domain';

import BookingDialog from './BookingDialog';
import RoomFormSheet from './RoomFormSheet';

export default function ConferenceRoomsPage() {
  const { t } = useTranslation(['dashboard', 'common']);
  const roles = useAuthStore((s) => s.user?.roles) ?? [];
  const isAdmin = roles.some((r) => r === 'ROLE_SUPER_ADMIN' || r === 'ROLE_HR_ADMIN');

  const [rooms, setRooms] = useState<ConferenceRoom[] | null>(null);
  const [myBookings, setMyBookings] = useState<ConferenceBooking[] | null>(null);

  const [roomFormOpen, setRoomFormOpen] = useState(false);
  const [editingRoom, setEditingRoom] = useState<ConferenceRoom | null>(null);
  const [bookingRoom, setBookingRoom] = useState<ConferenceRoom | null>(null);
  const [cancellingBooking, setCancellingBooking] = useState<ConferenceBooking | null>(null);
  const [cancelBusy, setCancelBusy] = useState(false);

  const reloadRooms = useCallback(async () => {
    try {
      setRooms(await listConferenceRooms());
    } catch (err) {
      if (err instanceof ConferenceNetworkError) toast.error(t('common:errors.network'));
      else toast.error(t('common:errors.unknown'));
    }
  }, [t]);

  const reloadMyBookings = useCallback(async () => {
    try {
      setMyBookings(await listConferenceBookings({ box: 'mine' }));
    } catch (err) {
      if (err instanceof ConferenceBookingNetworkError) toast.error(t('common:errors.network'));
      else toast.error(t('common:errors.unknown'));
    }
  }, [t]);

  useEffect(() => {
    void reloadRooms(); // eslint-disable-line react-hooks/set-state-in-effect
    void reloadMyBookings();
  }, [reloadRooms, reloadMyBookings]);

  function startCreateRoom() {
    setEditingRoom(null);
    setRoomFormOpen(true);
  }

  function startEditRoom(room: ConferenceRoom) {
    setEditingRoom(room);
    setRoomFormOpen(true);
  }

  async function handleArchiveRoom(room: ConferenceRoom) {
    try {
      await archiveConferenceRoom(room.uuid);
      toast.success(t('dashboard:conferenceRooms.rooms.toast.archived'));
      await reloadRooms();
    } catch (err) {
      if (err instanceof ConferenceNetworkError) toast.error(t('common:errors.network'));
      else toast.error(t('common:errors.unknown'));
    }
  }

  async function confirmCancelBooking() {
    if (!cancellingBooking) return;
    setCancelBusy(true);
    try {
      await cancelConferenceBooking(cancellingBooking.uuid);
      toast.success(t('dashboard:conferenceRooms.myBookings.toast.cancelled'));
      setCancellingBooking(null);
      await reloadMyBookings();
    } catch (err) {
      if (err instanceof ConferenceBookingNetworkError) toast.error(t('common:errors.network'));
      else toast.error(t('common:errors.unknown'));
    } finally {
      setCancelBusy(false);
    }
  }

  const roomName = (uuid: string) => rooms?.find((r) => r.uuid === uuid)?.name ?? uuid;

  return (
    <div className="space-y-6 md:space-y-8">
      <PageHeader
        title={t('dashboard:conferenceRooms.page-title')}
        subtitle={t('dashboard:conferenceRooms.page-subtitle')}
        actions={
          isAdmin ? (
            <Button onClick={startCreateRoom} className="w-full md:w-auto">
              <Plus className="mr-2 h-4 w-4" />
              {t('dashboard:conferenceRooms.rooms.add')}
            </Button>
          ) : undefined
        }
      />

      {!rooms && <LoadingState rows={3} />}

      {rooms && rooms.length === 0 && (
        <p className="text-sm text-muted-foreground">
          {t('dashboard:conferenceRooms.rooms.empty')}
        </p>
      )}

      {rooms && rooms.length > 0 && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {rooms.map((room) => (
            <Card key={room.uuid}>
              <CardHeader>
                <div className="flex items-start justify-between gap-2">
                  <CardTitle>{room.name}</CardTitle>
                  <Badge variant={room.status === 'ACTIVE' ? 'secondary' : 'outline'}>
                    {room.status === 'ACTIVE'
                      ? t('common:status.active')
                      : t('common:status.archived')}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
                  <Users2 className="h-4 w-4" />
                  {t('dashboard:conferenceRooms.rooms.capacity-suffix', {
                    count: room.capacity,
                  })}
                </p>
                {room.location && (
                  <p className="text-sm text-muted-foreground">{room.location}</p>
                )}
                <div className="flex flex-wrap gap-2 pt-1">
                  <Button
                    size="sm"
                    disabled={room.status !== 'ACTIVE'}
                    onClick={() => setBookingRoom(room)}
                  >
                    <CalendarClock className="mr-1.5 h-3.5 w-3.5" />
                    {t('dashboard:conferenceRooms.rooms.book')}
                  </Button>
                  {isAdmin && (
                    <>
                      <Button size="sm" variant="outline" onClick={() => startEditRoom(room)}>
                        <Pencil className="mr-1.5 h-3.5 w-3.5" />
                        {t('common:actions.edit')}
                      </Button>
                      {room.status === 'ACTIVE' && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => void handleArchiveRoom(room)}
                        >
                          <Archive className="mr-1.5 h-3.5 w-3.5" />
                          {t('common:actions.archive')}
                        </Button>
                      )}
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <div className="space-y-4">
        <h2 className="font-heading text-lg font-semibold text-ink">
          {t('dashboard:conferenceRooms.myBookings.title')}
        </h2>

        {!myBookings && <LoadingState rows={3} />}

        {myBookings && myBookings.length === 0 && (
          <p className="text-sm text-muted-foreground">
            {t('dashboard:conferenceRooms.myBookings.empty')}
          </p>
        )}

        {myBookings && myBookings.length > 0 && (
          <div className="overflow-x-auto rounded-lg border border-line">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('dashboard:conferenceRooms.myBookings.col-room')}</TableHead>
                  <TableHead>{t('dashboard:conferenceRooms.myBookings.col-date')}</TableHead>
                  <TableHead>{t('dashboard:conferenceRooms.myBookings.col-time')}</TableHead>
                  <TableHead>{t('dashboard:conferenceRooms.myBookings.col-purpose')}</TableHead>
                  <TableHead>{t('dashboard:conferenceRooms.myBookings.col-status')}</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {myBookings
                  .slice()
                  .sort((a, b) => b.date.localeCompare(a.date) || b.startTime.localeCompare(a.startTime))
                  .map((b) => (
                    <TableRow key={b.uuid}>
                      <TableCell>{roomName(b.roomUuid)}</TableCell>
                      <TableCell>{b.date}</TableCell>
                      <TableCell>
                        {b.startTime}–{b.endTime}
                      </TableCell>
                      <TableCell className="max-w-64 truncate">{b.purpose}</TableCell>
                      <TableCell>
                        <Badge variant={b.status === 'BOOKED' ? 'secondary' : 'outline'}>
                          {b.status === 'BOOKED'
                            ? t('dashboard:conferenceRooms.myBookings.status.booked')
                            : t('dashboard:conferenceRooms.myBookings.status.cancelled')}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {b.status === 'BOOKED' && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setCancellingBooking(b)}
                          >
                            <X className="mr-1.5 h-3.5 w-3.5" />
                            {t('common:actions.cancel')}
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      <RoomFormSheet
        open={roomFormOpen}
        onOpenChange={setRoomFormOpen}
        room={editingRoom}
        onSaved={reloadRooms}
      />

      <BookingDialog
        open={!!bookingRoom}
        onOpenChange={(open) => {
          if (!open) setBookingRoom(null);
        }}
        room={bookingRoom}
        onBooked={reloadMyBookings}
      />

      <AlertDialog
        open={!!cancellingBooking}
        onOpenChange={(open) => {
          if (!open) setCancellingBooking(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {t('dashboard:conferenceRooms.myBookings.cancel-confirm.title')}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {t('dashboard:conferenceRooms.myBookings.cancel-confirm.description')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={cancelBusy}>
              {t('common:actions.close')}
            </AlertDialogCancel>
            <AlertDialogAction disabled={cancelBusy} onClick={() => void confirmCancelBooking()}>
              {t('common:actions.confirm')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
