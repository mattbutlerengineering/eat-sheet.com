import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { Restaurant } from '@/lib/types';

export function useRestaurant(slug: string) {
  return useQuery<Restaurant>({
    queryKey: ['restaurant', slug],
    queryFn: () => api.getRestaurant(slug),
    enabled: !!slug,
  });
}
