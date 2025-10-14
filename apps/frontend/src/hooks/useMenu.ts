import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { Menu } from '@/lib/types';

export function useMenu(restaurantSlug: string, menuSlug: string) {
  return useQuery<Menu>({
    queryKey: ['menu', restaurantSlug, menuSlug],
    queryFn: () => api.getMenu(restaurantSlug, menuSlug),
    enabled: !!restaurantSlug && !!menuSlug,
  });
}
