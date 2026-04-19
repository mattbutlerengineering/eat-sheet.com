import { useState, useEffect, useCallback } from "react";
import { api } from "../../../api/client";
import type { Guest } from "@shared/types/guest";

interface GuestListResponse {
  readonly ok: true;
  readonly data: readonly Guest[];
  readonly meta: {
    readonly total: number;
    readonly page: number;
    readonly limit: number;
  };
}

interface GuestResponse {
  readonly ok: true;
  readonly data: Guest;
}

interface UseGuestsOptions {
  readonly tenantId: string;
  readonly q?: string;
  readonly tag?: string;
  readonly page?: number;
  readonly limit?: number;
  readonly sort?: string;
  readonly order?: string;
}

export function useGuests(opts: UseGuestsOptions) {
  const [guests, setGuests] = useState<readonly Guest[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const { tenantId, q, tag, page = 1, limit = 50, sort, order } = opts;

  const fetchGuests = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (q) params.set("q", q);
      if (tag) params.set("tag", tag);
      params.set("page", String(page));
      params.set("limit", String(limit));
      if (sort) params.set("sort", sort);
      if (order) params.set("order", order);

      const qs = params.toString();
      const url = `/api/t/${tenantId}/guests${qs ? `?${qs}` : ""}`;
      const res = await api.get<GuestListResponse>(url);
      setGuests(res.data);
      setTotal(res.meta.total);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load guests");
    } finally {
      setLoading(false);
    }
  }, [tenantId, q, tag, page, limit, sort, order]);

  useEffect(() => {
    fetchGuests();
  }, [fetchGuests]);

  return { guests, total, loading, error, refetch: fetchGuests };
}

export async function createGuestApi(
  tenantId: string,
  data: { name: string; email?: string; phone?: string; notes?: string; tags?: string[] },
): Promise<Guest> {
  const res = await api.post<GuestResponse>(`/api/t/${tenantId}/guests`, data);
  return res.data;
}

export async function updateGuestApi(
  tenantId: string,
  guestId: string,
  data: { name?: string; email?: string; phone?: string; notes?: string; tags?: string[] },
): Promise<Guest> {
  const res = await api.patch<GuestResponse>(
    `/api/t/${tenantId}/guests/${guestId}`,
    data,
  );
  return res.data;
}

export async function deleteGuestApi(
  tenantId: string,
  guestId: string,
): Promise<void> {
  await api.delete(`/api/t/${tenantId}/guests/${guestId}`);
}
