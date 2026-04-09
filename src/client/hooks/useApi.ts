import { useCallback } from 'react';
import { useAuth } from './useAuth';
import { useTenant } from './useTenant';

export function useApi() {
  const { token } = useAuth();
  const { tenantId } = useTenant();

  const apiFetch = useCallback(
    async (path: string, options: RequestInit = {}): Promise<unknown> => {
      const url = path.startsWith('/api') ? path : `/api/t/${tenantId}${path}`;
      const res = await fetch(url, {
        ...options,
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
          ...options.headers,
        },
      });
      const data = await res.json() as { error?: string };
      if (!res.ok) throw new Error(data.error ?? 'API error');
      return data;
    },
    [token, tenantId],
  );

  return { apiFetch };
}
