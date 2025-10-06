import { z } from 'zod';

// Menu item status enum
export const menuItemStatusEnum = z.enum(['available', 'sold_out', 'hidden']);

// Base menu item schema
export const menuItemSchema = z.object({
  id: z.string().uuid(),
  menuId: z.string().uuid(),
  name: z.string().min(1).max(255),
  description: z.string().nullable(),
  price: z.number().int().min(0), // Price in cents
  section: z.string().max(100).nullable(),
  imageUrl: z.string().url().nullable(),
  status: menuItemStatusEnum,
  displayOrder: z.number().int().default(0),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

// Create menu item request
export const createMenuItemSchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().optional(),
  price: z.number().int().min(0), // Price in cents (e.g., $12.99 = 1299)
  section: z.string().max(100).optional(),
  imageUrl: z.string().url().optional(),
  status: menuItemStatusEnum.optional(),
  displayOrder: z.number().int().optional(),
});

// Update menu item request
export const updateMenuItemSchema = createMenuItemSchema.partial();

// Path params
export const menuItemIdParamSchema = z.object({
  id: z.string().uuid(),
});

// Response types
export type MenuItem = z.infer<typeof menuItemSchema>;
export type CreateMenuItemInput = z.infer<typeof createMenuItemSchema>;
export type UpdateMenuItemInput = z.infer<typeof updateMenuItemSchema>;
export type MenuItemStatus = z.infer<typeof menuItemStatusEnum>;