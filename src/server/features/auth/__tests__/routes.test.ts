import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { Hono } from "hono";
import { sign } from "hono/jwt";
import type { AppEnv } from "@server/types";

// ---------------------------------------------------------------------------
// Module mocks — must be before imports that use them
// ---------------------------------------------------------------------------

vi.mock("arctic", () => ({
  Google: vi.fn().mockImplementation(() => ({
    createAuthorizationURL: vi
      .fn()
      .mockReturnValue(
        new URL("https://accounts.google.com/authorize?state=mock"),
      ),
    validateAuthorizationCode: vi
      .fn()
      .mockResolvedValue({ accessToken: () => "mock-access-token" }),
  })),
  generateState: vi.fn().mockReturnValue("mock-state"),
  generateCodeVerifier: vi.fn().mockReturnValue("mock-verifier"),
}));

vi.mock("../service", () => ({
  findOrCreateUser: vi.fn(),
  buildJwtPayload: vi.fn(),
  signJwt: vi.fn(),
}));

import { findOrCreateUser, buildJwtPayload, signJwt } from "../service";
import { auth } from "../routes";

const mockFindOrCreateUser = findOrCreateUser as ReturnType<typeof vi.fn>;
const mockBuildJwtPayload = buildJwtPayload as ReturnType<typeof vi.fn>;
const mockSignJwt = signJwt as ReturnType<typeof vi.fn>;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const JWT_SECRET = "test-secret";

const env: AppEnv["Bindings"] = {
  JWT_SECRET,
  GOOGLE_CLIENT_ID: "test-client-id",
  GOOGLE_CLIENT_SECRET: "test-client-secret",
  GOOGLE_REDIRECT_URI: "http://localhost/api/auth/callback",
  DB: {} as D1Database,
  LOGOS: {} as R2Bucket,
  ASSETS: {} as Fetcher,
  SENTRY_DSN: "https://fake@sentry.io/0",
};

async function makeToken(
  overrides: Record<string, unknown> = {},
): Promise<string> {
  const payload = {
    sub: "user-1",
    email: "test@example.com",
    name: "Test User",
    tenantId: "tenant-1",
    roleId: "role-1",
    permissions: ["menus:read"],
    exp: Math.floor(Date.now() / 1000) + 3600,
    ...overrides,
  };
  return sign(payload, JWT_SECRET);
}

function buildApp() {
  const app = new Hono<AppEnv>();
  app.route("/auth", auth);
  return app;
}

// ---------------------------------------------------------------------------
// Global fetch stub for /callback tests
// ---------------------------------------------------------------------------

const originalFetch = globalThis.fetch;
const mockFetch = vi.fn();

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => {
  globalThis.fetch = originalFetch;
});

// ---------------------------------------------------------------------------
// GET /auth/me
// ---------------------------------------------------------------------------

describe("GET /auth/me", () => {
  it("returns 401 without a token", async () => {
    const app = buildApp();
    const res = await app.request("/auth/me", {}, env);

    expect(res.status).toBe(401);
    const body = (await res.json()) as Record<string, unknown>;
    expect(body.ok).toBe(false);
    expect(body.error).toBe("Unauthorized");
  });

  it("returns user data with a valid token", async () => {
    const app = buildApp();
    const token = await makeToken();
    const res = await app.request(
      "/auth/me",
      { headers: { Authorization: `Bearer ${token}` } },
      env,
    );

    expect(res.status).toBe(200);
    const body = (await res.json()) as Record<string, unknown>;
    expect(body.ok).toBe(true);
    expect(body.data).toBeDefined();
  });

  it("returns correct user fields from JWT claims", async () => {
    const app = buildApp();
    const token = await makeToken({
      sub: "user-42",
      email: "alice@example.com",
      name: "Alice",
      tenantId: "tenant-99",
      roleId: "role-admin",
      permissions: ["venues:read", "menus:write"],
    });
    const res = await app.request(
      "/auth/me",
      { headers: { Authorization: `Bearer ${token}` } },
      env,
    );

    expect(res.status).toBe(200);
    const body = (await res.json()) as { ok: boolean; data: Record<string, unknown> };
    expect(body.ok).toBe(true);
    expect(body.data.userId).toBe("user-42");
    expect(body.data.email).toBe("alice@example.com");
    expect(body.data.name).toBe("Alice");
    expect(body.data.tenantId).toBe("tenant-99");
    expect(body.data.roleId).toBe("role-admin");
    expect(body.data.permissions).toEqual(["venues:read", "menus:write"]);
  });
});

// ---------------------------------------------------------------------------
// GET /auth/google
// ---------------------------------------------------------------------------

describe("GET /auth/google", () => {
  it("redirects to Google OAuth URL with 302", async () => {
    const app = buildApp();
    const res = await app.request("/auth/google", { redirect: "manual" }, env);

    expect(res.status).toBe(302);
    const location = res.headers.get("Location");
    expect(location).toContain("accounts.google.com");
  });

  it("sets google_oauth_state and google_code_verifier cookies", async () => {
    const app = buildApp();
    const res = await app.request("/auth/google", { redirect: "manual" }, env);

    const cookieHeader = res.headers.get("Set-Cookie") ?? "";

    expect(cookieHeader).toContain("google_oauth_state=mock-state");
    expect(cookieHeader).toContain("google_code_verifier=mock-verifier");
    expect(cookieHeader).toContain("HttpOnly");
    expect(cookieHeader).toContain("Secure");
  });
});

// ---------------------------------------------------------------------------
// GET /auth/callback
// ---------------------------------------------------------------------------

describe("GET /auth/callback", () => {
  it("returns 400 when missing cookies or query params", async () => {
    const app = buildApp();

    // No cookies, no query params
    const res = await app.request("/auth/callback", {}, env);

    expect(res.status).toBe(400);
    const body = (await res.json()) as Record<string, unknown>;
    expect(body.ok).toBe(false);
    expect(body.error).toBe("Invalid OAuth state");
  });

  it("returns 400 on state mismatch", async () => {
    const app = buildApp();
    const res = await app.request(
      "/auth/callback?code=auth-code&state=wrong-state",
      {
        headers: {
          Cookie:
            "google_oauth_state=correct-state; google_code_verifier=test-verifier",
        },
      },
      env,
    );

    expect(res.status).toBe(400);
    const body = (await res.json()) as Record<string, unknown>;
    expect(body.ok).toBe(false);
    expect(body.error).toBe("State mismatch");
  });

  it("returns 500 when Google profile fetch fails", async () => {
    vi.stubGlobal("fetch", mockFetch);
    mockFetch.mockResolvedValueOnce(
      new Response("Forbidden", { status: 403 }),
    );

    const app = buildApp();
    const res = await app.request(
      "/auth/callback?code=auth-code&state=test-state",
      {
        headers: {
          Cookie:
            "google_oauth_state=test-state; google_code_verifier=test-verifier",
        },
      },
      env,
    );

    expect(res.status).toBe(500);
    const body = (await res.json()) as Record<string, unknown>;
    expect(body.ok).toBe(false);
    expect(body.error).toBe("Failed to fetch Google profile");
  });

  it("redirects to /onboarding for new user without tenantId", async () => {
    vi.stubGlobal("fetch", mockFetch);
    mockFetch.mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          id: "g-123",
          email: "new@example.com",
          name: "New User",
          picture: null,
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      ),
    );

    const mockUser = {
      id: "user-new",
      email: "new@example.com",
      name: "New User",
      avatar_url: null,
      created_at: "2026-04-15T00:00:00.000Z",
      updated_at: "2026-04-15T00:00:00.000Z",
    };
    mockFindOrCreateUser.mockResolvedValueOnce(mockUser);
    mockBuildJwtPayload.mockResolvedValueOnce({
      sub: "user-new",
      email: "new@example.com",
      name: "New User",
      tenantId: null,
      roleId: null,
      permissions: [],
      exp: Math.floor(Date.now() / 1000) + 604800,
    });
    mockSignJwt.mockResolvedValueOnce("mock-jwt-token");

    const app = buildApp();
    const res = await app.request(
      "/auth/callback?code=auth-code&state=test-state",
      {
        redirect: "manual",
        headers: {
          Cookie:
            "google_oauth_state=test-state; google_code_verifier=test-verifier",
        },
      },
      env,
    );

    expect(res.status).toBe(302);
    expect(res.headers.get("Location")).toBe("/onboarding");

    // Verify token cookie is set
    const cookieHeader = res.headers.get("Set-Cookie") ?? "";
    expect(cookieHeader).toContain("token=mock-jwt-token");
  });

  it("redirects to / for existing user with tenantId", async () => {
    vi.stubGlobal("fetch", mockFetch);
    mockFetch.mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          id: "g-456",
          email: "existing@example.com",
          name: "Existing User",
          picture: "https://example.com/pic.jpg",
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      ),
    );

    const mockUser = {
      id: "user-existing",
      email: "existing@example.com",
      name: "Existing User",
      avatar_url: "https://example.com/pic.jpg",
      created_at: "2026-04-01T00:00:00.000Z",
      updated_at: "2026-04-01T00:00:00.000Z",
    };
    mockFindOrCreateUser.mockResolvedValueOnce(mockUser);
    mockBuildJwtPayload.mockResolvedValueOnce({
      sub: "user-existing",
      email: "existing@example.com",
      name: "Existing User",
      tenantId: "tenant-1",
      roleId: "role-owner",
      permissions: ["venues:read", "menus:write"],
      exp: Math.floor(Date.now() / 1000) + 604800,
    });
    mockSignJwt.mockResolvedValueOnce("mock-jwt-token-existing");

    const app = buildApp();
    const res = await app.request(
      "/auth/callback?code=auth-code&state=test-state",
      {
        redirect: "manual",
        headers: {
          Cookie:
            "google_oauth_state=test-state; google_code_verifier=test-verifier",
        },
      },
      env,
    );

    expect(res.status).toBe(302);
    expect(res.headers.get("Location")).toBe("/");

    // Verify service functions were called with correct args
    expect(mockFindOrCreateUser).toHaveBeenCalledWith(env.DB, {
      id: "g-456",
      email: "existing@example.com",
      name: "Existing User",
      picture: "https://example.com/pic.jpg",
    });
    expect(mockBuildJwtPayload).toHaveBeenCalledWith(env.DB, mockUser);
    expect(mockSignJwt).toHaveBeenCalledWith(
      expect.objectContaining({ sub: "user-existing", tenantId: "tenant-1" }),
      JWT_SECRET,
    );
  });
});
