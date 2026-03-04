import { describe, it, expect } from "vitest";
import { Hono } from "hono";
import type { Env, JwtPayload } from "../types";
import { authMiddleware } from "../middleware/auth";
import { TEST_SECRET, makeToken, authHeader } from "./helpers/auth";

function createTestApp() {
  const app = new Hono<{
    Bindings: Env;
    Variables: { jwtPayload: JwtPayload };
  }>();
  app.use("*", authMiddleware);
  app.get("/protected", (c) => {
    const payload = c.get("jwtPayload");
    return c.json({ data: payload });
  });
  return app;
}

function env(secret: string = TEST_SECRET) {
  return { DB: {} as D1Database, JWT_SECRET: secret };
}

describe("auth middleware", () => {
  it("returns 401 when Authorization header is missing", async () => {
    const app = createTestApp();
    const res = await app.request("/protected", {}, env());
    expect(res.status).toBe(401);
    const body: any = await res.json();
    expect(body.error).toBe("Missing authorization token");
  });

  it("returns 401 when Authorization header is not Bearer", async () => {
    const app = createTestApp();
    const res = await app.request(
      "/protected",
      { headers: { Authorization: "Basic abc" } },
      env()
    );
    expect(res.status).toBe(401);
  });

  it("returns 500 when JWT_SECRET is not configured", async () => {
    const app = createTestApp();
    const token = await makeToken();
    const res = await app.request(
      "/protected",
      { headers: authHeader(token) },
      env("")
    );
    expect(res.status).toBe(500);
    const body: any = await res.json();
    expect(body.error).toBe("Server configuration error");
  });

  it("returns 401 for an invalid token", async () => {
    const app = createTestApp();
    const res = await app.request(
      "/protected",
      { headers: authHeader("not-a-real-token") },
      env()
    );
    expect(res.status).toBe(401);
    const body: any = await res.json();
    expect(body.error).toBe("Invalid or expired token");
  });

  it("sets jwtPayload and calls next for a valid token", async () => {
    const app = createTestApp();
    const token = await makeToken();
    const res = await app.request(
      "/protected",
      { headers: authHeader(token) },
      env()
    );
    expect(res.status).toBe(200);
    const body: any = await res.json();
    expect(body.data.member_id).toBe("member-1");
    expect(body.data.family_id).toBe("family-1");
  });
});
