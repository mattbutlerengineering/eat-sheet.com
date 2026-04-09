import { z } from 'zod';

export const WaitlistEntrySchema = z.object({
  id: z.string(),
  guest_name: z.string(),
  party_size: z.number(),
  position: z.number(),
  quoted_wait: z.number().optional(),
  status: z.string(),
  phone: z.string().optional(),
});
