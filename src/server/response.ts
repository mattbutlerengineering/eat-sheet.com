export function ok<T>(data: T) {
  return { ok: true as const, data };
}

export function error(message: string) {
  return { ok: false as const, error: message };
}

export function paginated<T>(
  data: T[],
  meta: { total: number; page: number; limit: number },
) {
  return { ok: true as const, data, meta };
}
