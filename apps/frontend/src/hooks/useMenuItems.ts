import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { MenuItem, MenuItemsResponse } from '@/lib/types';

export function useMenuItems(menuId: string) {
  return useQuery<MenuItem[]>({
    queryKey: ['menuItems', menuId],
    queryFn: async () => {
      const response = await api.getMenuItems(menuId) as MenuItemsResponse;
      return response.items;
    },
    enabled: !!menuId,
  });
}
