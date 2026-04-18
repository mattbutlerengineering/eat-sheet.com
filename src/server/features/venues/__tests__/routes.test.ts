import { describe, it, expect, vi, beforeEach } from "vitest";
import { Hono } from "hono";
import { sign } from "hono/jwt";
import type { AppEnv } from "@server/types";
import { DomainError } from "@server/errors";
import { error } from "@server/response";
import type { TenantRow, VenueThemeRow } from "../types";

vi.mock("../repository", () => ({
  findTenantById: vi.fn(),
  findVenueTheme: vi.fn(),
  updateTenant: vi.fn(),
  updateVenueTheme: vi.fn(),
  deleteVenue: vi.fn(),
}));

import { findTenantById, findVenueTheme, updateTenant, updateVenueTheme, deleteVenue } from "../repository";
import { venues } from "../routes";

const mockFindTenantById = findTenantById as ReturnType<typeof vi.fn>;
const mockFindVenueTheme = findVenueTheme as ReturnType<typeof vi.fn>;
const mockUpdateTenant = updateTenant as ReturnType<typeof vi.fn>;
const mockUpdateVenueTheme = updateVenueTheme as ReturnType<typeof vi.fn>;
const mockDeleteVenue = deleteVenue as ReturnType<typeof vi.fn>;

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
    permissions: ["venues:read"],
    exp: Math.floor(Date.now() / 1000) + 3600,
    ...overrides,
  };
  return sign(payload, JWT_SECRET);
}

function buildApp() {
  const app = new Hono<AppEnv>();
  app.route("/api/t", venues);

  // Mirror the main app's error handler so NotFoundError returns 404
  app.onError((err, c) => {
    if (err instanceof DomainError) {
      return c.json(error(err.message), err.statusCode as 400);
    }
    return c.json(error("Internal server error"), 500);
  });

  return app;
}

const TENANT_ROW: TenantRow = {
  id: "tenant-1",
  name: "Verde Kitchen",
  slug: "verde-kitchen",
  type: "casual",
  cuisines: '["Italian","Mexican"]',
  address_line1: "123 Main St",
  address_line2: null,
  city: "San Francisco",
  state: "CA",
  zip: "94102",
  country: "US",
  timezone: "America/Los_Angeles",
  phone: "+1 555-0100",
  website: "https://verde.com",
  logo_url: null,
  onboarding_completed: 1,
  created_at: "2026-04-01T00:00:00.000Z",
  updated_at: "2026-04-01T00:00:00.000Z",
};

const THEME_ROW: VenueThemeRow = {
  id: "theme-1",
  tenant_id: "tenant-1",
  accent: "#2d4a2d",
  accent_hover: "#1a3a1a",
  surface: null,
  surface_elevated: null,
  text_primary: null,
  source: "extracted",
  created_at: "2026-04-01T00:00:00.000Z",
  updated_at: "2026-04-01T00:00:00.000Z",
};

const mockDb = {} as unknown as D1Database;
const mockLogos = { delete: vi.fn() } as unknown as R2Bucket;
const env = { JWT_SECRET, DB: mockDb, LOGOS: mockLogos } as AppEnv["Bindings"];

beforeEach(() => {
  vi.clearAllMocks();
});

describe("GET /api/t/:tenantId/venue", () => {
  it("returns 401 without a token", async () => {
    const app = buildApp();
    const res = await app.request("/api/t/tenant-1/venue", {}, env);

    expect(res.status).toBe(401);
    const body = (await res.json()) as Record<string, unknown>;
    expect(body.ok).toBe(false);
  });

  it("returns venue and theme when both exist", async () => {
    mockFindTenantById.mockResolvedValueOnce(TENANT_ROW);
    mockFindVenueTheme.mockResolvedValueOnce(THEME_ROW);

    const app = buildApp();
    const token = await makeToken();
    const res = await app.request(
      "/api/t/tenant-1/venue",
      { headers: { Authorization: `Bearer ${token}` } },
      env,
    );

    expect(res.status).toBe(200);
    const body = (await res.json()) as Record<string, any>;
    expect(body.ok).toBe(true);

    // Verify venue mapping from row to API type
    const venue = body.data.venue;
    expect(venue.id).toBe("tenant-1");
    expect(venue.name).toBe("Verde Kitchen");
    expect(venue.slug).toBe("verde-kitchen");
    expect(venue.type).toBe("casual");
    expect(venue.cuisines).toEqual(["Italian", "Mexican"]);
    expect(venue.addressLine1).toBe("123 Main St");
    expect(venue.addressLine2).toBeNull();
    expect(venue.country).toBe("US");
    expect(venue.timezone).toBe("America/Los_Angeles");
    expect(venue.onboardingCompleted).toBe(true);
    expect(venue.logoUrl).toBeNull();

    // Verify theme mapping from row to API type
    const theme = body.data.theme;
    expect(theme.id).toBe("theme-1");
    expect(theme.tenantId).toBe("tenant-1");
    expect(theme.accent).toBe("#2d4a2d");
    expect(theme.accentHover).toBe("#1a3a1a");
    expect(theme.surface).toBeNull();
    expect(theme.source).toBe("extracted");
  });

  it("returns 404 when tenant is not found", async () => {
    mockFindTenantById.mockResolvedValueOnce(null);
    mockFindVenueTheme.mockResolvedValueOnce(null);

    const app = buildApp();
    const token = await makeToken();
    const res = await app.request(
      "/api/t/tenant-1/venue",
      { headers: { Authorization: `Bearer ${token}` } },
      env,
    );

    expect(res.status).toBe(404);
    const body = (await res.json()) as Record<string, any>;
    expect(body.ok).toBe(false);
    expect(body.error).toContain("Venue not found");
  });

  it("returns venue with null theme when theme is not found", async () => {
    mockFindTenantById.mockResolvedValueOnce(TENANT_ROW);
    mockFindVenueTheme.mockResolvedValueOnce(null);

    const app = buildApp();
    const token = await makeToken();
    const res = await app.request(
      "/api/t/tenant-1/venue",
      { headers: { Authorization: `Bearer ${token}` } },
      env,
    );

    expect(res.status).toBe(200);
    const body = (await res.json()) as Record<string, any>;
    expect(body.ok).toBe(true);
    expect(body.data.venue.id).toBe("tenant-1");
    expect(body.data.theme).toBeNull();
  });

  it("passes the correct tenantId to repository functions", async () => {
    mockFindTenantById.mockResolvedValueOnce(TENANT_ROW);
    mockFindVenueTheme.mockResolvedValueOnce(THEME_ROW);

    const app = buildApp();
    const token = await makeToken();
    await app.request(
      "/api/t/tenant-1/venue",
      { headers: { Authorization: `Bearer ${token}` } },
      env,
    );

    expect(mockFindTenantById).toHaveBeenCalledWith(mockDb, "tenant-1");
    expect(mockFindVenueTheme).toHaveBeenCalledWith(mockDb, "tenant-1");
  });
});

describe("PATCH /api/t/:tenantId/venue", () => {
  it("returns 401 without a token", async () => {
    const app = buildApp();
    const res = await app.request(
      "/api/t/tenant-1/venue",
      { method: "PATCH", body: JSON.stringify({ name: "New Name" }) },
      env,
    );

    expect(res.status).toBe(401);
    const body = (await res.json()) as Record<string, unknown>;
    expect(body.ok).toBe(false);
  });

  it("updates and returns the venue", async () => {
    const updatedRow: TenantRow = {
      ...TENANT_ROW,
      name: "New Name",
      updated_at: "2026-04-02T00:00:00.000Z",
    };
    mockUpdateTenant.mockResolvedValueOnce(undefined);
    mockFindTenantById.mockResolvedValueOnce(updatedRow);

    const app = buildApp();
    const token = await makeToken();
    const res = await app.request(
      "/api/t/tenant-1/venue",
      {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ name: "New Name" }),
      },
      env,
    );

    expect(res.status).toBe(200);
    const body = (await res.json()) as Record<string, any>;
    expect(body.ok).toBe(true);
    expect(body.data.venue.name).toBe("New Name");
    expect(body.data.venue.updatedAt).toBe("2026-04-02T00:00:00.000Z");
  });

  it("passes body fields and tenantId to updateTenant", async () => {
    mockUpdateTenant.mockResolvedValueOnce(undefined);
    mockFindTenantById.mockResolvedValueOnce(TENANT_ROW);

    const app = buildApp();
    const token = await makeToken();
    const updatePayload = { name: "Updated", phone: "+1 555-9999" };
    await app.request(
      "/api/t/tenant-1/venue",
      {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(updatePayload),
      },
      env,
    );

    expect(mockUpdateTenant).toHaveBeenCalledWith(
      mockDb,
      "tenant-1",
      updatePayload,
    );
  });

  it("returns 404 when tenant not found after update", async () => {
    mockUpdateTenant.mockResolvedValueOnce(undefined);
    mockFindTenantById.mockResolvedValueOnce(null);

    const app = buildApp();
    const token = await makeToken();
    const res = await app.request(
      "/api/t/tenant-1/venue",
      {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ name: "Ghost" }),
      },
      env,
    );

    expect(res.status).toBe(404);
    const body = (await res.json()) as Record<string, any>;
    expect(body.ok).toBe(false);
    expect(body.error).toContain("Venue not found");
  });
});

describe("PATCH /api/t/:tenantId/venue/theme", () => {
  it("returns 401 without a token", async () => {
    const app = buildApp();
    const res = await app.request(
      "/api/t/tenant-1/venue/theme",
      { method: "PATCH", body: JSON.stringify({ accent: "#ff0000" }) },
      env,
    );

    expect(res.status).toBe(401);
    const body = (await res.json()) as Record<string, unknown>;
    expect(body.ok).toBe(false);
  });

  it("updates and returns the theme", async () => {
    const updatedTheme: VenueThemeRow = {
      ...THEME_ROW,
      accent: "#ff0000",
      accent_hover: "#cc0000",
      updated_at: "2026-04-02T00:00:00.000Z",
    };
    mockUpdateVenueTheme.mockResolvedValueOnce(undefined);
    mockFindVenueTheme.mockResolvedValueOnce(updatedTheme);

    const app = buildApp();
    const token = await makeToken();
    const res = await app.request(
      "/api/t/tenant-1/venue/theme",
      {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ accent: "#ff0000", accent_hover: "#cc0000" }),
      },
      env,
    );

    expect(res.status).toBe(200);
    const body = (await res.json()) as Record<string, any>;
    expect(body.ok).toBe(true);
    expect(body.data.theme.accent).toBe("#ff0000");
    expect(body.data.theme.accentHover).toBe("#cc0000");
    expect(body.data.theme.tenantId).toBe("tenant-1");
    expect(body.data.theme.source).toBe("extracted");
  });

  it("passes body fields and tenantId to updateVenueTheme", async () => {
    mockUpdateVenueTheme.mockResolvedValueOnce(undefined);
    mockFindVenueTheme.mockResolvedValueOnce(THEME_ROW);

    const app = buildApp();
    const token = await makeToken();
    const themePayload = { accent: "#333", surface: "#eee" };
    await app.request(
      "/api/t/tenant-1/venue/theme",
      {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(themePayload),
      },
      env,
    );

    expect(mockUpdateVenueTheme).toHaveBeenCalledWith(
      mockDb,
      "tenant-1",
      themePayload,
    );
  });

  it("returns 404 when theme not found after update", async () => {
    mockUpdateVenueTheme.mockResolvedValueOnce(undefined);
    mockFindVenueTheme.mockResolvedValueOnce(null);

    const app = buildApp();
    const token = await makeToken();
    const res = await app.request(
      "/api/t/tenant-1/venue/theme",
      {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ accent: "#ff0000" }),
      },
      env,
    );

    expect(res.status).toBe(404);
    const body = (await res.json()) as Record<string, any>;
    expect(body.ok).toBe(false);
    expect(body.error).toContain("Theme not found");
  });
});

describe("DELETE /api/t/:tenantId/venue", () => {
  async function makeOwnerToken(): Promise<string> {
    return makeToken({ permissions: ["*"] });
  }

  it("returns 401 without a token", async () => {
    const app = buildApp();
    const res = await app.request(
      "/api/t/tenant-1/venue",
      { method: "DELETE" },
      env,
    );

    expect(res.status).toBe(401);
    const body = (await res.json()) as Record<string, unknown>;
    expect(body.ok).toBe(false);
  });

  it("returns 403 when user lacks owner permission", async () => {
    const app = buildApp();
    const token = await makeToken({ permissions: ["venues:read"] });
    const res = await app.request(
      "/api/t/tenant-1/venue",
      { method: "DELETE", headers: { Authorization: `Bearer ${token}` } },
      env,
    );

    expect(res.status).toBe(403);
    const body = (await res.json()) as Record<string, unknown>;
    expect(body.ok).toBe(false);
  });

  it("returns 200 with token on successful delete", async () => {
    mockFindTenantById.mockResolvedValueOnce(TENANT_ROW);
    mockDeleteVenue.mockResolvedValueOnce(true);

    const app = buildApp();
    const token = await makeOwnerToken();
    const res = await app.request(
      "/api/t/tenant-1/venue",
      { method: "DELETE", headers: { Authorization: `Bearer ${token}` } },
      env,
    );

    expect(res.status).toBe(200);
    const body = (await res.json()) as Record<string, any>;
    expect(body.ok).toBe(true);
    expect(typeof body.data.token).toBe("string");
    expect(body.data.token.length).toBeGreaterThan(0);
  });

  it("returns 404 when tenant is not found before delete", async () => {
    mockFindTenantById.mockResolvedValueOnce(null);

    const app = buildApp();
    const token = await makeOwnerToken();
    const res = await app.request(
      "/api/t/tenant-1/venue",
      { method: "DELETE", headers: { Authorization: `Bearer ${token}` } },
      env,
    );

    expect(res.status).toBe(404);
    const body = (await res.json()) as Record<string, any>;
    expect(body.ok).toBe(false);
    expect(body.error).toContain("Venue not found");
  });

  it("returns 404 when deleteVenue returns false", async () => {
    mockFindTenantById.mockResolvedValueOnce(TENANT_ROW);
    mockDeleteVenue.mockResolvedValueOnce(false);

    const app = buildApp();
    const token = await makeOwnerToken();
    const res = await app.request(
      "/api/t/tenant-1/venue",
      { method: "DELETE", headers: { Authorization: `Bearer ${token}` } },
      env,
    );

    expect(res.status).toBe(404);
    const body = (await res.json()) as Record<string, any>;
    expect(body.ok).toBe(false);
    expect(body.error).toContain("Venue not found");
  });

  it("deletes R2 logo when logo_url is set", async () => {
    const rowWithLogo: TenantRow = {
      ...TENANT_ROW,
      logo_url: "/api/onboarding/logos/user-1/abc123.png",
    };
    mockFindTenantById.mockResolvedValueOnce(rowWithLogo);
    mockDeleteVenue.mockResolvedValueOnce(true);
    (mockLogos as any).delete = vi.fn().mockResolvedValueOnce(undefined);

    const app = buildApp();
    const token = await makeOwnerToken();
    await app.request(
      "/api/t/tenant-1/venue",
      { method: "DELETE", headers: { Authorization: `Bearer ${token}` } },
      env,
    );

    expect((mockLogos as any).delete).toHaveBeenCalledWith("logos/user-1/abc123.png");
  });

  it("does not call R2 delete when logo_url is null", async () => {
    const rowNoLogo: TenantRow = { ...TENANT_ROW, logo_url: null };
    mockFindTenantById.mockResolvedValueOnce(rowNoLogo);
    mockDeleteVenue.mockResolvedValueOnce(true);
    const logoDeleteSpy = vi.fn();
    (mockLogos as any).delete = logoDeleteSpy;

    const app = buildApp();
    const token = await makeOwnerToken();
    await app.request(
      "/api/t/tenant-1/venue",
      { method: "DELETE", headers: { Authorization: `Bearer ${token}` } },
      env,
    );

    expect(logoDeleteSpy).not.toHaveBeenCalled();
  });

  it("sets token cookie with httpOnly and correct options", async () => {
    mockFindTenantById.mockResolvedValueOnce(TENANT_ROW);
    mockDeleteVenue.mockResolvedValueOnce(true);

    const app = buildApp();
    const token = await makeOwnerToken();
    const res = await app.request(
      "/api/t/tenant-1/venue",
      { method: "DELETE", headers: { Authorization: `Bearer ${token}` } },
      env,
    );

    const setCookieHeader = res.headers.get("set-cookie");
    expect(setCookieHeader).toContain("token=");
    expect(setCookieHeader).toContain("HttpOnly");
    expect(setCookieHeader).toContain("Path=/");
  });
});

describe("venues routes — onboardingCompleted mapping", () => {
  it("maps onboarding_completed 0 to false", async () => {
    const incompleteRow: TenantRow = {
      ...TENANT_ROW,
      onboarding_completed: 0,
    };
    mockFindTenantById.mockResolvedValueOnce(incompleteRow);
    mockFindVenueTheme.mockResolvedValueOnce(null);

    const app = buildApp();
    const token = await makeToken();
    const res = await app.request(
      "/api/t/tenant-1/venue",
      { headers: { Authorization: `Bearer ${token}` } },
      env,
    );

    const body = (await res.json()) as Record<string, any>;
    expect(body.data.venue.onboardingCompleted).toBe(false);
  });

  it("maps onboarding_completed 1 to true", async () => {
    mockFindTenantById.mockResolvedValueOnce(TENANT_ROW);
    mockFindVenueTheme.mockResolvedValueOnce(null);

    const app = buildApp();
    const token = await makeToken();
    const res = await app.request(
      "/api/t/tenant-1/venue",
      { headers: { Authorization: `Bearer ${token}` } },
      env,
    );

    const body = (await res.json()) as Record<string, any>;
    expect(body.data.venue.onboardingCompleted).toBe(true);
  });
});
