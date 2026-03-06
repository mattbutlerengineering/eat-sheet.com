import { useState, useCallback, useEffect } from "react";
import * as Sentry from "@sentry/react";
import type { ApiResponse } from "../types";

function assertOk<T>(res: Response, json: ApiResponse<T>, url: string, method: string): asserts json is ApiResponse<T> & { data: T } {
  if (!res.ok || json.error) {
    const err = new Error(json.error || "Request failed");
    if (res.status >= 500) {
      Sentry.captureException(err, { extra: { url, method, status: res.status } });
    }
    throw err;
  }
}

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
      assertOk(res, json, url, "GET");
      return json.data;
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
      assertOk(res, json, url, "POST");
      return json.data;
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
      assertOk(res, json, url, "PUT");
      return json.data;
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
      assertOk(res, json, url, "DELETE");
      return json.data;
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
