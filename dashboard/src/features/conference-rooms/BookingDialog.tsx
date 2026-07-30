import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { Clock } from 'lucide-react';

import ResponsiveDialog from '@/components/common/ResponsiveDialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

import {
  createConferenceBooking,
  listConferenceBookings,
  ConferenceValidationError,
  ConferenceNetworkError,
} from '@/lib/data/conferenceBookings';
import type { ConferenceBooking, ConferenceRoom } from '@/types/domain';

import { bookingFormSchema, todayIso, type BookingFormValues } from './booking.schema';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  room: ConferenceRoom | null;
  onBooked: () => void;
}

const DEFAULT_VALUES: BookingFormValues = {
  date: todayIso(),
  startTime: '',
  endTime: '',
  purpose: '',
};

export default function BookingDialog({ open, onOpenChange, room, onBooked }: Props) {
  const { t } = useTranslation(['dashboard', 'common']);

  const form = useForm<BookingFormValues>({
    resolver: zodResolver(bookingFormSchema),
    defaultValues: DEFAULT_VALUES,
  });

  const [busyBookings, setBusyBookings] = useState<ConferenceBooking[] | null>(null);
  const date = form.watch('date');

  useEffect(() => {
    if (open) form.reset(DEFAULT_VALUES);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, room]);

  useEffect(() => {
    if (!open || !room || !date) {
      setBusyBookings(null);
      return;
    }
    let cancelled = false;
    setBusyBookings(null);
    void (async () => {
      try {
        const bookings = await listConferenceBookings({ roomUuid: room.uuid, date });
        if (!cancelled) setBusyBookings(bookings.filter((b) => b.status === 'BOOKED'));
      } catch {
        if (!cancelled) setBusyBookings([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, room, date]);

  async function onSubmit(values: BookingFormValues) {
    if (!room) return;
    try {
      await createConferenceBooking({
        roomUuid: room.uuid,
        date: values.date,
        startTime: values.startTime,
        endTime: values.endTime,
        purpose: values.purpose.trim(),
      });
      toast.success(t('dashboard:conferenceRooms.booking.toast.booked'));
      onBooked();
      onOpenChange(false);
    } catch (err) {
      if (err instanceof ConferenceValidationError) {
        toast.error(t(`dashboard:conferenceRooms.errors.${err.code}`));
      } else if (err instanceof ConferenceNetworkError) {
        toast.error(t('common:errors.network'));
      } else {
        toast.error(t('common:errors.unknown'));
      }
    }
  }

  const { errors, isSubmitting } = form.formState;

  return (
    <ResponsiveDialog
      open={open}
      onOpenChange={onOpenChange}
      title={t('dashboard:conferenceRooms.booking.title', { room: room?.name ?? '' })}
      description={t('dashboard:conferenceRooms.booking.description')}
      footer={
        <div className="flex w-full gap-2 md:w-auto">
          <Button
            variant="outline"
            type="button"
            className="flex-1 md:flex-none"
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
          >
            {t('common:actions.cancel')}
          </Button>
          <Button
            form="conference-booking-form"
            type="submit"
            className="flex-1 md:flex-none"
            disabled={isSubmitting || !room}
          >
            {t('dashboard:conferenceRooms.booking.submit')}
          </Button>
        </div>
      }
    >
      <form
        id="conference-booking-form"
        onSubmit={form.handleSubmit(onSubmit)}
        className="space-y-4"
      >
        <div className="space-y-2">
          <Label htmlFor="booking-date">
            {t('dashboard:conferenceRooms.booking.form.date')}{' '}
            <span className="text-destructive">*</span>
          </Label>
          <Input id="booking-date" type="date" min={todayIso()} {...form.register('date')} />
          {errors.date?.message && (
            <p className="text-xs text-destructive">{t(errors.date.message)}</p>
          )}
        </div>

        <div className="space-y-2 rounded-md border border-line bg-surface-2 p-3">
          <p className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
            <Clock className="h-3.5 w-3.5" />
            {t('dashboard:conferenceRooms.booking.busy-title')}
          </p>
          {busyBookings === null && (
            <p className="text-xs text-muted-foreground">{t('common:labels.loading')}</p>
          )}
          {busyBookings !== null && busyBookings.length === 0 && (
            <p className="text-xs text-muted-foreground">
              {t('dashboard:conferenceRooms.booking.no-bookings')}
            </p>
          )}
          {busyBookings !== null && busyBookings.length > 0 && (
            <ul className="space-y-1">
              {busyBookings
                .slice()
                .sort((a, b) => a.startTime.localeCompare(b.startTime))
                .map((b) => (
                  <li key={b.uuid} className="text-xs text-body">
                    {b.startTime}–{b.endTime} · {b.purpose}
                  </li>
                ))}
            </ul>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="startTime">
              {t('dashboard:conferenceRooms.booking.form.start-time')}{' '}
              <span className="text-destructive">*</span>
            </Label>
            <Input id="startTime" type="time" {...form.register('startTime')} />
            {errors.startTime?.message && (
              <p className="text-xs text-destructive">{t(errors.startTime.message)}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="endTime">
              {t('dashboard:conferenceRooms.booking.form.end-time')}{' '}
              <span className="text-destructive">*</span>
            </Label>
            <Input id="endTime" type="time" {...form.register('endTime')} />
            {errors.endTime?.message && (
              <p className="text-xs text-destructive">{t(errors.endTime.message)}</p>
            )}
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="purpose">
            {t('dashboard:conferenceRooms.booking.form.purpose')}{' '}
            <span className="text-destructive">*</span>
          </Label>
          <Textarea id="purpose" rows={3} {...form.register('purpose')} />
          {errors.purpose?.message && (
            <p className="text-xs text-destructive">{t(errors.purpose.message, { count: 3 })}</p>
          )}
        </div>
      </form>
    </ResponsiveDialog>
  );
}
