import { z } from 'zod';

export const GuestCardSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string().optional(),
  phone: z.string().optional(),
  visit_count: z.number(),
  tags: z.array(z.string()).optional(),
});
