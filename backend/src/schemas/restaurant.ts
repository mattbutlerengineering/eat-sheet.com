import { z } from 'zod';

// Base restaurant schema
export const restaurantSchema = z.object({
  id: z.string().uuid(),
  slug: z.string().min(1).max(100).regex(/^[a-z0-9-]+$/, 'Slug must contain only lowercase letters, numbers, and hyphens'),
  name: z.string().min(1).max(255),
  description: z.string().nullable(),
  logoUrl: z.string().url().nullable(),
  heroImages: z.array(z.string().url()).default([]),
  address: z.string().nullable(),
  phone: z.string().max(50).nullable(),
  email: z.string().email().max(255).nullable(),
  website: z.string().url().nullable(),
  hours: z.record(z.string()).nullable(),
  socialLinks: z.record(z.string()).nullable(),
  isActive: z.boolean().default(true),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

// Create restaurant request
export const createRestaurantSchema = z.object({
  slug: z.string().min(1).max(100).regex(/^[a-z0-9-]+$/, 'Slug must contain only lowercase letters, numbers, and hyphens'),
  name: z.string().min(1).max(255),
  description: z.string().optional(),
  logoUrl: z.string().url().optional(),
  heroImages: z.array(z.string().url()).optional(),
  address: z.string().optional(),
  phone: z.string().max(50).optional(),
  email: z.string().email().max(255).optional(),
  website: z.string().url().optional(),
  hours: z.record(z.string()).optional(),
  socialLinks: z.record(z.string()).optional(),
});

// Update restaurant request
export const updateRestaurantSchema = createRestaurantSchema.partial();

// Path params
export const restaurantSlugParamSchema = z.object({
  slug: z.string(),
});

export const restaurantIdParamSchema = z.object({
  id: z.string().uuid(),
});

// Response types
export type Restaurant = z.infer<typeof restaurantSchema>;
export type CreateRestaurantInput = z.infer<typeof createRestaurantSchema>;
export type UpdateRestaurantInput = z.infer<typeof updateRestaurantSchema>;