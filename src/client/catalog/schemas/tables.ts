import { z } from 'zod';

export const TableCardSchema = z.object({
  id: z.string(),
  label: z.string(),
  capacity: z.number(),
  status: z.enum(['available', 'occupied', 'reserved', 'blocked']),
  section: z.string().optional(),
});

export const FloorPlanGridSchema = z.object({
  tables: z.array(TableCardSchema),
});
