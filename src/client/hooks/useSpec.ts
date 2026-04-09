import { useState, useEffect } from 'react';
import { useApi } from './useApi';

export function useSpec(path: string) {
  const { apiFetch } = useApi();
  const [spec, setSpec] = useState<object | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    apiFetch(path)
      .then((res) => {
        if (!cancelled) {
          const typed = res as { data: object };
          setSpec(typed.data);
          setLoading(false);
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Unknown error');
          setLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [path, apiFetch]);

  return { spec, loading, error };
}
