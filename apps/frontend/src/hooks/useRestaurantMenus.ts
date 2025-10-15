import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { MenusResponse } from '@/lib/types';

export function useRestaurantMenus(restaurantSlugOrId: string) {
  return useQuery<MenusResponse>({
    queryKey: ['restaurantMenus', restaurantSlugOrId],
    queryFn: () => api.getRestaurantMenus(restaurantSlugOrId),
    enabled: !!restaurantSlugOrId,
  });
}
