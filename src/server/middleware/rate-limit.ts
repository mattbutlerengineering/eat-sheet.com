import { createMiddleware } from "hono/factory";
import type { Env } from "../types";

interface RateLimitOptions {
  readonly max: number;
  readonly windowMs: number;
}

interface WindowEntry {
  readonly timestamps: readonly number[];
}

function getClientIp(c: { req: { header: (name: string) => string | undefined } }): string {
  return c.req.header("cf-connecting-ip") ?? c.req.header("x-forwarded-for") ?? "unknown";
}

function cleanAndCount(
  store: Map<string, WindowEntry>,
  key: string,
  now: number,
  windowMs: number
): number {
  const cutoff = now - windowMs;

  // Clean expired entries across the store
  for (const [k, entry] of store) {
    const valid = entry.timestamps.filter((t) => t > cutoff);
    if (valid.length === 0) {
      store.delete(k);
    } else if (valid.length !== entry.timestamps.length) {
      store.set(k, { timestamps: valid });
    }
  }

  const entry = store.get(key);
  return entry ? entry.timestamps.filter((t) => t > cutoff).length : 0;
}

export function rateLimit({ max, windowMs }: RateLimitOptions) {
  const store = new Map<string, WindowEntry>();

  return createMiddleware<{ Bindings: Env }>(async (c, next) => {
    const now = Date.now();
    const ip = getClientIp(c);
    const count = cleanAndCount(store, ip, now, windowMs);

    if (count >= max) {
      const entry = store.get(ip)!;
      const oldest = entry.timestamps.find((t) => t > now - windowMs)!;
      const retryAfter = Math.ceil((oldest + windowMs - now) / 1000);

      return c.json(
        { error: "Too many requests, please try again later" },
        429,
        { "Retry-After": String(retryAfter) }
      );
    }

    const existing = store.get(ip);
    const updatedTimestamps = existing
      ? [...existing.timestamps, now]
      : [now];
    store.set(ip, { timestamps: updatedTimestamps });

    await next();
  });
}
