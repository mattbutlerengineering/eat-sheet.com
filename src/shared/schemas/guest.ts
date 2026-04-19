import { z } from "zod";

export const createGuestSchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  email: z.string().email("Invalid email").max(200).or(z.literal("")).optional().default(""),
  phone: z.string().max(20).optional().default(""),
  notes: z.string().max(500).optional().default(""),
  tags: z.array(z.string().max(50)).max(20).default([]),
});
export type CreateGuestInput = z.infer<typeof createGuestSchema>;

export const updateGuestSchema = z.object({
  name: z.string().min(1, "Name is required").max(100).optional(),
  email: z.string().email("Invalid email").max(200).or(z.literal("")).optional(),
  phone: z.string().max(20).optional(),
  notes: z.string().max(500).optional(),
  tags: z.array(z.string().max(50)).max(20).optional(),
});
export type UpdateGuestInput = z.infer<typeof updateGuestSchema>;
