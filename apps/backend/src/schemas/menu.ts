import { z } from 'zod';

// Menu status enum
export const menuStatusEnum = z.enum(['active', 'inactive', 'draft']);

// Base menu schema
export const menuSchema = z.object({
  id: z.string().uuid(),
  restaurantId: z.string().uuid(),
  slug: z.string().min(1).max(100).regex(/^[a-z0-9-]+$/, 'Slug must contain only lowercase letters, numbers, and hyphens'),
  name: z.string().min(1).max(255),
  description: z.string().nullable(),
  status: menuStatusEnum,
  themeConfig: z.record(z.any()).default({}),
  displayOrder: z.number().int().default(0),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

// Create menu request
export const createMenuSchema = z.object({
  slug: z.string().min(1).max(100).regex(/^[a-z0-9-]+$/, 'Slug must contain only lowercase letters, numbers, and hyphens'),
  name: z.string().min(1).max(255),
  description: z.string().optional(),
  status: menuStatusEnum.optional(),
  themeConfig: z.record(z.any()).optional(),
  displayOrder: z.number().int().optional(),
});

// Update menu request
export const updateMenuSchema = createMenuSchema.partial();

// Path params
export const menuSlugParamSchema = z.object({
  restaurantSlug: z.string(),
  menuSlug: z.string(),
});

export const menuIdParamSchema = z.object({
  id: z.string().uuid(),
});

// Response types
export type Menu = z.infer<typeof menuSchema>;
export type CreateMenuInput = z.infer<typeof createMenuSchema>;
export type UpdateMenuInput = z.infer<typeof updateMenuSchema>;
export type MenuStatus = z.infer<typeof menuStatusEnum>;