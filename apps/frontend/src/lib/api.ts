/**
 * API Client for Eat-Sheet
 * Handles all HTTP requests to the backend API
 */

import type { Restaurant, Menu, MenuItem, RestaurantsResponse, MenusResponse, MenuItemsResponse } from './types';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

interface ApiError {
  error: string;
  code: string;
  details?: unknown;
}

class ApiClient {
  private baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;

    const config: RequestInit = {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    };

    try {
      const response = await fetch(url, config);

      if (!response.ok) {
        const error: ApiError = await response.json();
        throw new Error(error.error || 'An error occurred');
      }

      return response.json();
    } catch (error) {
      console.error('API request failed:', error);
      throw error;
    }
  }

  // Restaurants
  async getRestaurants(params?: { limit?: number; offset?: number }): Promise<RestaurantsResponse> {
    const queryParams = new URLSearchParams();
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    if (params?.offset) queryParams.append('offset', params.offset.toString());

    const query = queryParams.toString() ? `?${queryParams.toString()}` : '';
    return this.request<RestaurantsResponse>(`/api/restaurants${query}`);
  }

  async getRestaurant(slug: string): Promise<Restaurant> {
    return this.request<Restaurant>(`/api/restaurants/${slug}`);
  }

  // Menus
  async getRestaurantMenus(restaurantSlugOrId: string): Promise<MenusResponse> {
    const response = await this.request<{ data: Menu[] }>(`/api/restaurants/${restaurantSlugOrId}/menus`);
    return { menus: response.data };
  }

  async getMenu(restaurantSlug: string, menuSlug: string): Promise<Menu> {
    const response = await this.request<{ data: Menu }>(`/api/restaurants/${restaurantSlug}/menus/${menuSlug}`);
    return response.data;
  }

  // Menu Items
  async getMenuItems(menuId: string): Promise<MenuItemsResponse> {
    const response = await this.request<{ data: MenuItem[] }>(`/api/menus/${menuId}/items`);
    return { items: response.data };
  }

  async getMenuItem(itemId: string): Promise<MenuItem> {
    return this.request<MenuItem>(`/api/items/${itemId}`);
  }
}

export const api = new ApiClient(API_BASE_URL);
