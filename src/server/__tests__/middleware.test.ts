import { describe, it, expect } from "vitest";
import { Hono } from "hono";
import { sign } from "hono/jwt";
import { authMiddleware } from "../features/auth/middleware";
import type { AppEnv } from "../types";

const JWT_SECRET = "test-secret";

async function makeToken(
  overrides: Record<string, unknown> = {},
): Promise<string> {
  const payload = {
    sub: "user-1",
    email: "test@example.com",
    name: "Test User",
    tenantId: "tenant-1",
    roleId: "role-1",
    permissions: ["reservations:read"],
    exp: Math.floor(Date.now() / 1000) + 3600,
    ...overrides,
  };
  return sign(payload, JWT_SECRET);
}

function buildApp() {
  const app = new Hono<AppEnv>();

  app.use("/protected/*", authMiddleware);

  app.get("/protected/me", (c) => {
    const user = c.var.user;
    return c.json({ ok: true, user });
  });

  return app;
}

const env = { JWT_SECRET } as AppEnv["Bindings"];

describe("authMiddleware", () => {
  it("rejects requests without a token (401)", async () => {
    const app = buildApp();
    const res = await app.request("/protected/me", {}, env);
    expect(res.status).toBe(401);
    const body = await res.json() as Record<string, any>;
    expect(body.ok).toBe(false);
  });

  it("accepts a valid Bearer token and sets user in context", async () => {
    const app = buildApp();
    const token = await makeToken();
    const res = await app.request(
      "/protected/me",
      { headers: { Authorization: `Bearer ${token}` } },
      env,
    );
    expect(res.status).toBe(200);
    const body = await res.json() as Record<string, any>;
    expect(body.ok).toBe(true);
    expect(body.user.userId).toBe("user-1");
    expect(body.user.email).toBe("test@example.com");
    expect(body.user.name).toBe("Test User");
    expect(body.user.tenantId).toBe("tenant-1");
    expect(body.user.roleId).toBe("role-1");
    expect(body.user.permissions).toEqual(["reservations:read"]);
  });

  it("rejects an invalid token (401)", async () => {
    const app = buildApp();
    const res = await app.request(
      "/protected/me",
      { headers: { Authorization: "Bearer not-a-valid-token" } },
      env,
    );
    expect(res.status).toBe(401);
    const body = await res.json() as Record<string, any>;
    expect(body.ok).toBe(false);
  });

  it("rejects a token signed with the wrong secret (401)", async () => {
    const app = buildApp();
    const token = await sign(
      {
        sub: "user-1",
        email: "test@example.com",
        name: "Test User",
        tenantId: null,
        roleId: null,
        permissions: [],
        exp: Math.floor(Date.now() / 1000) + 3600,
      },
      "wrong-secret",
    );
    const res = await app.request(
      "/protected/me",
      { headers: { Authorization: `Bearer ${token}` } },
      env,
    );
    expect(res.status).toBe(401);
  });

  it("accepts a valid token from cookie", async () => {
    const app = buildApp();
    const token = await makeToken();
    const res = await app.request(
      "/protected/me",
      { headers: { Cookie: `token=${token}` } },
      env,
    );
    expect(res.status).toBe(200);
    const body = await res.json() as Record<string, any>;
    expect(body.user.userId).toBe("user-1");
  });
});
