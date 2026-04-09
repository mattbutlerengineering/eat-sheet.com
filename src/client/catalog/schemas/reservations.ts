import { z } from 'zod';

export const ReservationRowSchema = z.object({
  id: z.string(),
  guest_name: z.string(),
  party_size: z.number(),
  date: z.string(),
  time: z.string(),
  status: z.string(),
  table_label: z.string().optional(),
  notes: z.string().optional(),
});
