import { z } from 'zod';

export const todayIso = () => new Date().toISOString().slice(0, 10);

const timePattern = /^([01]\d|2[0-3]):([0-5]\d)$/;

export const bookingFormSchema = z
  .object({
    date: z.string().min(1, 'common:errors.required'),
    startTime: z.string().regex(timePattern, 'dashboard:conferenceRooms.booking.errors.invalid-time'),
    endTime: z.string().regex(timePattern, 'dashboard:conferenceRooms.booking.errors.invalid-time'),
    purpose: z
      .string()
      .trim()
      .min(3, 'common:errors.min-length')
      .max(500, 'common:errors.max-length'),
  })
  .refine((v) => v.endTime > v.startTime, {
    message: 'dashboard:conferenceRooms.booking.errors.invalid-range',
    path: ['endTime'],
  });

export type BookingFormValues = z.infer<typeof bookingFormSchema>;
