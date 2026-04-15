async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, { credentials: "include", ...init });
  if (!res.ok) {
    throw new Error(`API error ${res.status}: ${res.statusText}`);
  }
  return res.json() as Promise<T>;
}

export const api = {
  get: <T>(url: string) => fetchJson<T>(url),
  post: <T>(url: string, body: unknown) =>
    fetchJson<T>(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }),
  put: <T>(url: string, body: unknown) =>
    fetchJson<T>(url, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }),
  patch: <T>(url: string, body: unknown) =>
    fetchJson<T>(url, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }),
  delete: <T>(url: string) => fetchJson<T>(url, { method: "DELETE" }),
};
