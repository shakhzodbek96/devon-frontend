import { z } from 'zod';

export const roomFormSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, 'common:errors.min-length')
    .max(255, 'common:errors.max-length'),
  capacity: z
    .number()
    .int()
    .min(1, 'dashboard:conferenceRooms.rooms.errors.invalid-capacity')
    .max(1000, 'dashboard:conferenceRooms.rooms.errors.invalid-capacity'),
  location: z.union([z.literal(''), z.string().max(255)]).optional(),
});

export type RoomFormValues = z.infer<typeof roomFormSchema>;
