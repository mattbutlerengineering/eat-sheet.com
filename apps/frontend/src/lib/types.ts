/**
 * Type definitions matching backend schema
 */

export type MenuStatus = 'active' | 'inactive' | 'draft';
export type MenuItemStatus = 'available' | 'sold_out' | 'hidden';
export type MaintainerRole = 'owner' | 'maintainer';

export interface Restaurant {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  logoUrl: string | null;
  heroImages: string[];
  address: string | null;
  phone: string | null;
  email: string | null;
  website: string | null;
  hours: Record<string, string> | null;
  socialLinks: Record<string, string> | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Menu {
  id: string;
  restaurantId: string;
  slug: string;
  name: string;
  description: string | null;
  status: MenuStatus;
  themeConfig: Record<string, any>;
  displayOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface MenuItem {
  id: string;
  menuId: string;
  name: string;
  description: string | null;
  price: number; // In cents
  section: string | null;
  imageUrl: string | null;
  status: MenuItemStatus;
  displayOrder: number;
  createdAt: string;
  updatedAt: string;
}

// API Response types
export interface RestaurantsResponse {
  restaurants: Restaurant[];
  total: number;
}

export interface MenusResponse {
  menus: Menu[];
}

export interface MenuItemsResponse {
  items: MenuItem[];
}

// Utility functions
export function formatPrice(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

export function groupItemsBySection(items: MenuItem[]): Record<string, MenuItem[]> {
  return items.reduce((acc, item) => {
    const section = item.section || 'Other';
    if (!acc[section]) {
      acc[section] = [];
    }
    acc[section].push(item);
    return acc;
  }, {} as Record<string, MenuItem[]>);
}
