import { pgTable, text, timestamp, uuid, varchar, integer, jsonb, boolean, pgEnum, uniqueIndex } from 'drizzle-orm/pg-core';

// Enums
export const menuStatusEnum = pgEnum('menu_status', ['active', 'inactive', 'draft']);
export const menuItemStatusEnum = pgEnum('menu_item_status', ['available', 'sold_out', 'hidden']);
export const maintainerRoleEnum = pgEnum('maintainer_role', ['owner', 'maintainer']);

// Users table (synced from AWS Cognito)
export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  cognitoSub: varchar('cognito_sub', { length: 255 }).notNull().unique(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  name: varchar('name', { length: 255 }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Restaurants table
export const restaurants = pgTable('restaurants', {
  id: uuid('id').primaryKey().defaultRandom(),
  slug: varchar('slug', { length: 100 }).notNull().unique(),
  name: varchar('name', { length: 255 }).notNull(),
  description: text('description'),
  logoUrl: text('logo_url'),
  heroImages: jsonb('hero_images').$type<string[]>().default([]),
  address: text('address'),
  phone: varchar('phone', { length: 50 }),
  email: varchar('email', { length: 255 }),
  website: text('website'),
  hours: jsonb('hours').$type<Record<string, string>>(),
  socialLinks: jsonb('social_links').$type<Record<string, string>>(),
  isActive: boolean('is_active').default(true).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Restaurant maintainers junction table (many-to-many)
export const restaurantMaintainers = pgTable('restaurant_maintainers', {
  id: uuid('id').primaryKey().defaultRandom(),
  restaurantId: uuid('restaurant_id').notNull().references(() => restaurants.id, { onDelete: 'cascade' }),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  role: maintainerRoleEnum('role').notNull().default('maintainer'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  uniqueRestaurantUser: uniqueIndex('unique_restaurant_user').on(table.restaurantId, table.userId),
}));

// Menus table
export const menus = pgTable('menus', {
  id: uuid('id').primaryKey().defaultRandom(),
  restaurantId: uuid('restaurant_id').notNull().references(() => restaurants.id, { onDelete: 'cascade' }),
  slug: varchar('slug', { length: 100 }).notNull(),
  name: varchar('name', { length: 255 }).notNull(),
  description: text('description'),
  status: menuStatusEnum('status').default('draft').notNull(),
  themeConfig: jsonb('theme_config').$type<Record<string, any>>().default({}),
  displayOrder: integer('display_order').default(0).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  uniqueRestaurantSlug: uniqueIndex('unique_restaurant_menu_slug').on(table.restaurantId, table.slug),
}));

// Menu items table
export const menuItems = pgTable('menu_items', {
  id: uuid('id').primaryKey().defaultRandom(),
  menuId: uuid('menu_id').notNull().references(() => menus.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 255 }).notNull(),
  description: text('description'),
  price: integer('price').notNull(), // Stored in cents (e.g., $12.99 = 1299)
  section: varchar('section', { length: 100 }), // e.g., "Appetizers", "Mains", "Desserts"
  imageUrl: text('image_url'), // Single image for MVP
  status: menuItemStatusEnum('status').default('available').notNull(),
  displayOrder: integer('display_order').default(0).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Type exports for use in application code
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;

export type Restaurant = typeof restaurants.$inferSelect;
export type NewRestaurant = typeof restaurants.$inferInsert;

export type RestaurantMaintainer = typeof restaurantMaintainers.$inferSelect;
export type NewRestaurantMaintainer = typeof restaurantMaintainers.$inferInsert;

export type Menu = typeof menus.$inferSelect;
export type NewMenu = typeof menus.$inferInsert;

export type MenuItem = typeof menuItems.$inferSelect;
export type NewMenuItem = typeof menuItems.$inferInsert;