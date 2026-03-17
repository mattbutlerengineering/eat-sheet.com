import { describe, it, expect, vi, afterEach } from "vitest";
import { Hono } from "hono";
import { rateLimit } from "../middleware/rate-limit";
import type { Env } from "../types";

function createTestApp(max: number, windowMs: number) {
  const app = new Hono<{ Bindings: Env }>();
  app.use("*", rateLimit({ max, windowMs }));
  app.get("/test", (c) => c.json({ ok: true }));
  return app;
}

function makeRequest(ip = "1.2.3.4") {
  return new Request("http://localhost/test", {
    headers: { "cf-connecting-ip": ip },
  });
}

describe("rateLimit middleware", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("allows requests under the limit", async () => {
    const app = createTestApp(3, 60_000);

    const res1 = await app.request(makeRequest());
    const res2 = await app.request(makeRequest());
    const res3 = await app.request(makeRequest());

    expect(res1.status).toBe(200);
    expect(res2.status).toBe(200);
    expect(res3.status).toBe(200);
  });

  it("blocks requests over the limit with 429", async () => {
    const app = createTestApp(2, 60_000);

    await app.request(makeRequest());
    await app.request(makeRequest());
    const res3 = await app.request(makeRequest());

    expect(res3.status).toBe(429);
    const body = (await res3.json()) as { error: string };
    expect(body.error).toContain("Too many requests");
    expect(res3.headers.get("Retry-After")).toBeTruthy();
  });

  it("tracks different IPs independently", async () => {
    const app = createTestApp(1, 60_000);

    const res1 = await app.request(makeRequest("10.0.0.1"));
    const res2 = await app.request(makeRequest("10.0.0.2"));
    const res3 = await app.request(makeRequest("10.0.0.1"));

    expect(res1.status).toBe(200);
    expect(res2.status).toBe(200);
    expect(res3.status).toBe(429);
  });

  it("resets after the window expires", async () => {
    vi.useFakeTimers();
    const app = createTestApp(1, 1_000);

    const res1 = await app.request(makeRequest());
    expect(res1.status).toBe(200);

    const res2 = await app.request(makeRequest());
    expect(res2.status).toBe(429);

    vi.advanceTimersByTime(1_100);

    const res3 = await app.request(makeRequest());
    expect(res3.status).toBe(200);
  });

  it("falls back to x-forwarded-for when cf-connecting-ip is missing", async () => {
    const app = createTestApp(1, 60_000);

    const req = new Request("http://localhost/test", {
      headers: { "x-forwarded-for": "5.6.7.8" },
    });

    const res = await app.request(req);
    expect(res.status).toBe(200);
  });
});
