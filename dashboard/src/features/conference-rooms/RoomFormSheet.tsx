import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';

import ResponsiveDialog from '@/components/common/ResponsiveDialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

import {
  createConferenceRoom,
  updateConferenceRoom,
  ConferenceValidationError,
  ConferenceNetworkError,
} from '@/lib/data/conferenceRooms';
import type { ConferenceRoom } from '@/types/domain';

import { roomFormSchema, type RoomFormValues } from './room.schema';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  room: ConferenceRoom | null;
  onSaved: () => void;
}

function defaultValuesFor(room: ConferenceRoom | null): RoomFormValues {
  return {
    name: room?.name ?? '',
    capacity: room?.capacity ?? 10,
    location: room?.location ?? '',
  };
}

export default function RoomFormSheet({ open, onOpenChange, room, onSaved }: Props) {
  const { t } = useTranslation(['dashboard', 'common']);
  const isEdit = !!room;

  const form = useForm<RoomFormValues>({
    resolver: zodResolver(roomFormSchema),
    defaultValues: defaultValuesFor(room),
  });

  useEffect(() => {
    if (open) form.reset(defaultValuesFor(room));
  }, [open, room, form]);

  async function onSubmit(values: RoomFormValues) {
    const payload = {
      name: values.name.trim(),
      capacity: values.capacity,
      location: values.location?.trim() || undefined,
    };

    try {
      if (isEdit) {
        await updateConferenceRoom(room.uuid, payload);
        toast.success(t('dashboard:conferenceRooms.rooms.toast.updated'));
      } else {
        await createConferenceRoom(payload);
        toast.success(t('dashboard:conferenceRooms.rooms.toast.created'));
      }
      onSaved();
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
      title={t(
        isEdit
          ? 'dashboard:conferenceRooms.rooms.form.edit-title'
          : 'dashboard:conferenceRooms.rooms.form.create-title',
      )}
      description={t('dashboard:conferenceRooms.rooms.form.description')}
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
            form="conference-room-form"
            type="submit"
            className="flex-1 md:flex-none"
            disabled={isSubmitting}
          >
            {t('common:actions.save')}
          </Button>
        </div>
      }
    >
      <form
        id="conference-room-form"
        onSubmit={form.handleSubmit(onSubmit)}
        className="space-y-4"
      >
        <div className="space-y-2">
          <Label htmlFor="name">
            {t('dashboard:conferenceRooms.rooms.form.name')}{' '}
            <span className="text-destructive">*</span>
          </Label>
          <Input id="name" {...form.register('name')} autoFocus />
          {errors.name?.message && (
            <p className="text-xs text-destructive">{t(errors.name.message, { count: 2 })}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="capacity">
            {t('dashboard:conferenceRooms.rooms.form.capacity')}{' '}
            <span className="text-destructive">*</span>
          </Label>
          <Input
            id="capacity"
            type="number"
            min={1}
            max={1000}
            value={form.watch('capacity')}
            onChange={(e) => {
              const n = Number(e.target.value);
              form.setValue('capacity', Number.isFinite(n) ? n : 0, { shouldDirty: true });
            }}
          />
          {errors.capacity?.message && (
            <p className="text-xs text-destructive">{t(errors.capacity.message)}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="location">{t('dashboard:conferenceRooms.rooms.form.location')}</Label>
          <Input id="location" {...form.register('location')} />
        </div>
      </form>
    </ResponsiveDialog>
  );
}
