import { useState, useCallback, useEffect } from "react";
import type { ApiResponse } from "../types";

export function useApi(token: string | undefined) {
  const headers = useCallback(
    (extra?: Record<string, string>) => ({
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...extra,
    }),
    [token]
  );

  const get = useCallback(
    async <T>(url: string): Promise<T> => {
      const res = await fetch(url, { headers: headers() });
      const json = (await res.json()) as ApiResponse<T>;
      if (!res.ok || json.error) throw new Error(json.error || "Request failed");
      return json.data as T;
    },
    [headers]
  );

  const post = useCallback(
    async <T>(url: string, body: unknown): Promise<T> => {
      const res = await fetch(url, {
        method: "POST",
        headers: headers(),
        body: JSON.stringify(body),
      });
      const json = (await res.json()) as ApiResponse<T>;
      if (!res.ok || json.error) throw new Error(json.error || "Request failed");
      return json.data as T;
    },
    [headers]
  );

  const put = useCallback(
    async <T>(url: string, body: unknown): Promise<T> => {
      const res = await fetch(url, {
        method: "PUT",
        headers: headers(),
        body: JSON.stringify(body),
      });
      const json = (await res.json()) as ApiResponse<T>;
      if (!res.ok || json.error) throw new Error(json.error || "Request failed");
      return json.data as T;
    },
    [headers]
  );

  const del = useCallback(
    async <T>(url: string): Promise<T> => {
      const res = await fetch(url, {
        method: "DELETE",
        headers: headers(),
      });
      const json = (await res.json()) as ApiResponse<T>;
      if (!res.ok || json.error) throw new Error(json.error || "Request failed");
      return json.data as T;
    },
    [headers]
  );

  return { get, post, put, del };
}

export function useFetch<T>(token: string | undefined, url: string | null) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(!!url);
  const [error, setError] = useState<string | null>(null);
  const { get } = useApi(token);
  const load = useCallback(async () => {
    if (!url) return;
    setLoading(true);
    setError(null);
    try {
      const result = await get<T>(url);
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Request failed");
    } finally {
      setLoading(false);
    }
  }, [url, get]);

  useEffect(() => {
    load();
  }, [load]);

  const refresh = useCallback(() => {
    load();
  }, [load]);

  return { data, loading, error, refresh };
}
